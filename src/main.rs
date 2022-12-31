use anyhow::{bail, Context, Result};
use mdbook_preprocessor_utils::{
  mdbook::preprocess::PreprocessorContext, Asset, SimplePreprocessor,
};
use regex::Regex;
use std::{env, fmt::Write, fs, path::Path, process::Command};
use tempfile::{self, NamedTempFile};

mdbook_preprocessor_utils::asset_generator!("../js/packages/quiz-embed/dist/");

const FRONTEND_ASSETS: [Asset; 2] = [make_asset!("lib.js"), make_asset!("lib.css")];

#[cfg(feature = "rust-editor")]
const RA_ASSETS: [Asset; 3] = [
  make_asset!("ra-worker.js"),
  make_asset!("editor.worker.js"),
  make_asset!("wasm_demo_bg.wasm"),
];
#[cfg(not(feature = "rust-editor"))]
const RA_ASSETS: [Asset; 0] = [];

#[cfg(feature = "source-map")]
const SOURCE_MAP_ASSETS: [Asset; 2] = [make_asset!("lib.js.map"), make_asset!("lib.css.map")];
#[cfg(not(feature = "source-map"))]
const SOURCE_MAP_ASSETS: [Asset; 0] = [];

const VALIDATOR_ASSET: Asset = Asset {
  name: "main.cjs",
  contents: include_bytes!("../js/packages/quiz-validator/dist/main.cjs"),
};

struct QuizConfig {
  /// If true, then mdbook-quiz will validate your quiz TOML files using
  /// the validator.js script installed with mdbook-quiz. You must have NodeJS
  /// installed on your machine and PATH for this to work.
  validate: Option<bool>,

  /// If true, then a quiz will take up the web page's full screen during use.
  fullscreen: Option<bool>,

  /// If true, then a user's answers will be cached in localStorage
  /// and displayed to them upon revisiting a completed quiz.
  cache_answers: Option<bool>,

  dev_mode: bool,
}

struct QuizPreprocessor {
  config: QuizConfig,
  validator_path: NamedTempFile,
  regex: Regex,
}

impl QuizPreprocessor {
  fn validate_quiz(&self, path: impl AsRef<Path>) -> Result<()> {
    let path = path.as_ref();
    let status = Command::new("node")
      .arg(self.validator_path.path())
      .arg(path)
      .status()
      .context("Validator process failed")?;
    if !status.success() {
      bail!("Validation failed for quiz: {}", path.display());
    } else {
      Ok(())
    }
  }

  fn process_quiz(&self, chapter_dir: &Path, quiz_path: &str) -> Result<String> {
    let quiz_path_rel = Path::new(quiz_path);
    let quiz_path_abs = chapter_dir.join(quiz_path_rel);

    if let Some(true) = self.config.validate {
      self.validate_quiz(&quiz_path_abs)?;
    }

    let quiz_name = quiz_path_rel.file_stem().unwrap().to_string_lossy();

    let content_toml = std::fs::read_to_string(&quiz_path_abs)
      .with_context(|| format!("Failed to read quiz file: {}", quiz_path_abs.display()))?;

    let content = content_toml.parse::<toml::Value>()?;
    let content_json = serde_json::to_string(&content)?;

    let mut html = String::from("<div class=\"quiz-placeholder\"");

    let mut add_data = |k: &str, v: &str| {
      write!(
        html,
        " data-{}=\"{}\" ",
        k,
        html_escape::encode_double_quoted_attribute(v)
      )
    };
    add_data("quiz-name", &quiz_name)?;
    add_data("quiz-questions", &content_json)?;
    if let Some(true) = self.config.fullscreen {
      add_data("quiz-fullscreen", "")?;
    }
    if let Some(true) = self.config.cache_answers {
      if !self.config.dev_mode {
        add_data("quiz-cache-answers", "")?;
      }
    }

    html.push_str("></div>");

    Ok(html)
  }
}

impl SimplePreprocessor for QuizPreprocessor {
  fn name() -> &'static str {
    "quiz"
  }

  fn build(ctx: &PreprocessorContext) -> Result<Self> {
    let config_toml = ctx.config.get_preprocessor(Self::name()).unwrap();
    let parse_bool = |key: &str| config_toml.get(key).map(|value| value.as_bool().unwrap());

    let dev_mode = env::var("QUIZ_DEV_MODE").is_ok();
    let config = QuizConfig {
      fullscreen: parse_bool("fullscreen"),
      validate: parse_bool("validate").map(|b| b && !dev_mode),
      cache_answers: parse_bool("cache-answers"),
      dev_mode,
    };

    let validator_path = tempfile::Builder::new().suffix(".cjs").tempfile()?;
    fs::write(&validator_path, VALIDATOR_ASSET.contents)?;

    let regex = Regex::new(r"\{\{#quiz ([^}]+)\}\}").unwrap();

    Ok(QuizPreprocessor {
      config,
      validator_path,
      regex,
    })
  }

  fn replacements(
    &self,
    chapter_dir: &Path,
    content: &str,
  ) -> Result<Vec<(std::ops::Range<usize>, String)>> {
    self
      .regex
      .captures_iter(content)
      .map(|captures| {
        let range = captures.get(0).unwrap().range();
        let quiz_path = captures.get(1).unwrap().as_str();
        let html = self.process_quiz(chapter_dir, quiz_path)?;
        Ok((range, html))
      })
      .collect()
  }

  fn all_assets(&self) -> Vec<Asset> {
    FRONTEND_ASSETS
      .iter()
      .chain(&RA_ASSETS)
      .chain(&SOURCE_MAP_ASSETS)
      .copied()
      .collect()
  }

  fn linked_assets(&self) -> Vec<Asset> {
    FRONTEND_ASSETS.to_vec()
  }
}

fn main() {
  mdbook_preprocessor_utils::main::<QuizPreprocessor>()
}

#[cfg(test)]
mod test {
  use super::QuizPreprocessor;
  use anyhow::Result;
  use mdbook_preprocessor_utils::{mdbook::BookItem, testing::MdbookTestHarness};
  use std::fs;

  #[test]
  fn test_quiz_generator() -> Result<()> {
    let harness = MdbookTestHarness::new()?;
    let quiz_path = harness.root().join("quiz.toml");
    fs::write(
      &quiz_path,
      r#"
    [[questions]]
    type = "ShortAnswer"
    prompt.prompt = "Hello world"
    answer.answer = "No"
    "#,
    )?;

    let chapter_path = harness.root().join("src").join("chapter_1.md");
    fs::write(
      &chapter_path,
      r#"
    *Hello world!* 
    
    {{#quiz ../quiz.toml}}
    "#,
    )?;

    let config = serde_json::json!({
      "validate": true
    });
    let mut book = harness.compile::<QuizPreprocessor>(config)?;

    let contents = match book.sections.remove(0) {
      BookItem::Chapter(chapter) => chapter.content,
      _ => unreachable!(),
    };
    assert!(!contents.contains("{{#quiz"));
    assert!(contents.contains("<script"));

    Ok(())
  }
}
