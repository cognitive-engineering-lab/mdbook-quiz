use anyhow::{Context, Result};
use mdbook_preprocessor_utils::{
  mdbook::preprocess::PreprocessorContext, Asset, SimplePreprocessor,
};

use mdbook_quiz_validate::IdSet;
use regex::Regex;
use std::{
  env,
  fmt::Write,
  fs,
  path::{Path, PathBuf},
  sync::OnceLock,
};
use uuid::Uuid;

mdbook_preprocessor_utils::asset_generator!("../js/");

const FRONTEND_ASSETS: [Asset; 2] = [make_asset!("quiz-embed.mjs"), make_asset!("style.css")];

#[cfg(feature = "rust-editor")]
const RA_ASSETS: [Asset; 3] = [
  make_asset!("ra-worker.js"),
  make_asset!("editor.worker.js"),
  make_asset!("wasm_demo_bg.wasm"),
];
#[cfg(not(feature = "rust-editor"))]
const RA_ASSETS: [Asset; 0] = [];

#[cfg(feature = "source-map")]
const SOURCE_MAP_ASSETS: [Asset; 1] = [
  make_asset!("quiz-embed.mjs.map"), /*make_asset!("style.css.map")*/
];
#[cfg(not(feature = "source-map"))]
const SOURCE_MAP_ASSETS: [Asset; 0] = [];

struct QuizConfig {
  /// If true, then a quiz will take up the web page's full screen during use.
  fullscreen: Option<bool>,

  /// If true, then a user's answers will be cached in localStorage
  /// and displayed to them upon revisiting a completed quiz.
  cache_answers: Option<bool>,

  /// Sets the default language for syntax highlighting.
  default_language: Option<String>,

  /// Path to a .dic file containing words to include in the spellcheck dictionary.
  more_words: Option<PathBuf>,

  dev_mode: bool,
}

struct QuizPreprocessor {
  config: QuizConfig,
  question_ids: IdSet,
  #[cfg(feature = "aquascope")]
  aquascope: mdbook_aquascope::AquascopePreprocessor,
}

impl QuizPreprocessor {
  // TODO: this shouldn't be baked into mdbook-quiz.
  // Need to figure out an extension mechanism to add custom blocks w/ pre-rendering.
  #[cfg(feature = "aquascope")]
  fn add_aquascope_blocks(&self, config: &mut toml::Value) -> Result<()> {
    let config = config.as_table_mut().unwrap();
    let questions = config
      .get_mut("questions")
      .context("Must contain questions")?
      .as_array_mut()
      .unwrap();
    for question in questions.iter_mut() {
      let question = question.as_table_mut().unwrap();
      let prompt = question.get_mut("prompt").unwrap().as_table_mut().unwrap();

      let update_slot = |slot_opt: Option<&mut toml::Value>| -> Result<()> {
        if let Some(slot) = slot_opt {
          let text = slot.as_str().unwrap();
          let replacements = self.aquascope.replacements(text)?;
          let mut new_text = String::from(text);
          for (range, html) in replacements.into_iter().rev() {
            new_text.replace_range(range, &html);
          }
          *slot = toml::Value::String(new_text);
        }
        Ok(())
      };

      update_slot(prompt.get_mut("prompt"))?;
      update_slot(question.get_mut("context"))?;
    }
    Ok(())
  }

  fn auto_id(&self, path: &Path, contents: &str) -> Result<bool> {
    use toml_edit::{Document, Formatted, Item, Value};
    let mut doc = contents.parse::<Document>()?;
    let qs = doc
      .get_mut("questions")
      .unwrap()
      .as_array_of_tables_mut()
      .unwrap();
    let mut changed = false;
    for q in qs.iter_mut() {
      if !q.contains_key("id") {
        changed = true;
        let id = Uuid::new_v4().to_string();
        q.insert("id", Item::Value(Value::String(Formatted::new(id))));
      }
    }
    fs::write(path, doc.to_string())?;
    Ok(changed)
  }

  fn process_quiz(&self, chapter_dir: &Path, quiz_path: &str) -> Result<String> {
    let quiz_path_rel = Path::new(quiz_path);
    let quiz_path_abs = chapter_dir.join(quiz_path_rel);

    let mut content_toml = fs::read_to_string(&quiz_path_abs)
      .with_context(|| format!("Failed to read quiz file: {}", quiz_path_abs.display()))?;

    mdbook_quiz_validate::validate(&quiz_path_abs, &content_toml, &self.question_ids)?;

    let changed = self.auto_id(&quiz_path_abs, &content_toml)?;
    if changed {
      content_toml = fs::read_to_string(&quiz_path_abs)?;
    }

    #[allow(unused_mut)]
    let mut content = content_toml.parse::<toml::Value>()?;

    #[cfg(feature = "aquascope")]
    self.add_aquascope_blocks(&mut content)?;

    let quiz_name = quiz_path_rel.file_stem().unwrap().to_string_lossy();
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
    if let Some(lang) = &self.config.default_language {
      add_data("quiz-default-language", lang)?;
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
      cache_answers: parse_bool("cache-answers"),
      default_language: config_toml
        .get("default-language")
        .map(|value| value.as_str().unwrap().into()),
      more_words: config_toml
        .get("more-words")
        .map(|value| value.as_str().unwrap().into()),
      dev_mode,
    };

    if let Some(more_words) = &config.more_words {
      mdbook_quiz_validate::register_more_words(more_words)?;
    }

    Ok(QuizPreprocessor {
      config,
      question_ids: IdSet::default(),
      #[cfg(feature = "aquascope")]
      aquascope: mdbook_aquascope::AquascopePreprocessor::new()?,
    })
  }

  fn replacements(
    &self,
    chapter_dir: &Path,
    content: &str,
  ) -> Result<Vec<(std::ops::Range<usize>, String)>> {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    let regex = REGEX.get_or_init(|| Regex::new(r"\{\{#quiz ([^}]+)\}\}").unwrap());
    regex
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
  use mdbook_quiz_schema::{Question, Quiz};
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

    let config = serde_json::json!({});
    let mut book = harness.compile::<QuizPreprocessor>(config)?;

    let contents = match book.sections.remove(0) {
      BookItem::Chapter(chapter) => chapter.content,
      _ => unreachable!(),
    };
    assert!(!contents.contains("{{#quiz"));
    assert!(contents.contains("<script"));

    let quiz_contents = fs::read_to_string(quiz_path)?;
    let quiz: Quiz = toml::from_str(&quiz_contents)?;
    let Question::ShortAnswer(q) = &quiz.questions[0] else { panic!("Invalid quiz") };
    assert!(q.0.id.is_some(), "ID not automatically inserted");

    Ok(())
  }
}
