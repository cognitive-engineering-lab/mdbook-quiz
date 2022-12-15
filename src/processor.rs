use std::{
  env,
  fmt::Write,
  fs,
  path::{Path, PathBuf},
  process::Command,
};

use anyhow::{bail, Context, Result};
use mdbook::{
  book::Book,
  preprocess::{Preprocessor, PreprocessorContext},
  BookItem,
};
use regex::Regex;
use tempfile::{self, NamedTempFile};

pub struct QuizConfig {
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

pub struct QuizProcessor;

struct QuizProcessorCtxt {
  config: QuizConfig,
  src_dir: PathBuf,
  validator_path: NamedTempFile,
}

#[derive(Copy, Clone)]
struct Asset {
  name: &'static str,
  contents: &'static [u8],
}

macro_rules! make_asset {
  ($name:expr) => {
    Asset {
      name: $name,
      contents: include_bytes!(concat!("../js/packages/quiz-embed/dist/", $name)),
    }
  };
}

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

lazy_static::lazy_static! {
  static ref QUIZ_REGEX: Regex = Regex::new(r"\{\{#quiz ([^}]+)\}\}").unwrap();
}

impl QuizProcessorCtxt {
  pub fn build(config: QuizConfig, src_dir: PathBuf) -> Result<Self> {
    // Rather than copying directly to the build directory, we instead copy to the book source
    // since mdBook will clean the build-dir after preprocessing. See mdBook#1087 for more.
    let dst_dir = src_dir.join("mdbook-quiz");
    fs::create_dir_all(&dst_dir)?;

    for asset in FRONTEND_ASSETS.iter().chain(&RA_ASSETS).chain(&SOURCE_MAP_ASSETS) {
      fs::write(dst_dir.join(asset.name), asset.contents)?;
    }

    let validator_path = tempfile::Builder::new().suffix(".cjs").tempfile()?;
    fs::write(&validator_path, VALIDATOR_ASSET.contents)?;

    Ok(QuizProcessorCtxt {
      config,
      src_dir,
      validator_path,
    })
  }

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

  fn process_chapter(&self, chapter_dir: &Path, content: &mut String) -> Result<()> {
    let replacements = QUIZ_REGEX
      .captures_iter(content)
      .map(|captures| {
        let range = captures.get(0).unwrap().range();
        let quiz_path = captures.get(1).unwrap().as_str();
        let html = self.process_quiz(chapter_dir, quiz_path)?;
        Ok((range, html))
      })
      .collect::<Result<Vec<_>>>()?;

    if !replacements.is_empty() {
      for (range, html) in replacements.into_iter().rev() {
        content.replace_range(range, &html);
      }

      // If a chapter is located at foo/bar/the_chapter.md, then the generated source files
      // will be at foo/bar/the_chapter.html. So they need to reference mdbook-quiz files
      // at ../../mdbook-quiz/embed.js, i.e. we generate the right number of "..".
      let chapter_rel_path = chapter_dir.strip_prefix(&self.src_dir).unwrap();
      let depth = chapter_rel_path.components().count();
      let prefix = vec![".."; depth].into_iter().collect::<PathBuf>();

      // Ensure there's space between existing markdown and inserted HTML
      content.push_str("\n\n");

      for asset in &FRONTEND_ASSETS {
        let asset_rel = prefix.join("mdbook-quiz").join(asset.name);
        let asset_str = asset_rel.display().to_string();
        let link = if asset_rel.extension().unwrap().to_string_lossy() == "js" {
          format!(r#"<script type="text/javascript" src="{asset_str}"></script>"#)
        } else {
          format!(r#"<link rel="stylesheet" type="text/css" href="{asset_str}">"#)
        };
        content.push_str(&link);
      }
    }

    Ok(())
  }
}

impl Preprocessor for QuizProcessor {
  fn name(&self) -> &str {
    "quiz"
  }

  fn run(&self, ctx: &PreprocessorContext, mut book: Book) -> Result<Book> {
    let config_toml = ctx.config.get_preprocessor(self.name()).unwrap();
    let parse_bool = |key: &str| config_toml.get(key).map(|value| value.as_bool().unwrap());

    let dev_mode = env::var("QUIZ_DEV_MODE").is_ok();
    let config = QuizConfig {
      fullscreen: parse_bool("fullscreen"),
      validate: parse_bool("validate").map(|b| b && !dev_mode),
      cache_answers: parse_bool("cache-answers"),
      dev_mode,
    };

    let ctxt = QuizProcessorCtxt::build(config, ctx.root.join(&ctx.config.book.src))?;

    // Limit size of thread pool to avoid OS resource exhaustion
    let nproc = std::thread::available_parallelism().map_or(1, |n| n.get());
    rayon::ThreadPoolBuilder::new()
      .num_threads(nproc)
      .build_global()
      .unwrap();

    rayon::scope(|s| {
      fn for_each_mut<'scope, 'proc: 'scope, 'item: 'scope>(
        s: &rayon::Scope<'scope>,
        ctxt: &'proc QuizProcessorCtxt,
        items: impl IntoIterator<Item = &'item mut BookItem>,
      ) {
        for item in items {
          if let BookItem::Chapter(chapter) = item {
            if chapter.path.is_some() {
              s.spawn(|_| {
                let chapter_path_abs = ctxt.src_dir.join(chapter.path.as_ref().unwrap());
                let chapter_dir = chapter_path_abs.parent().unwrap();
                ctxt
                  .process_chapter(chapter_dir, &mut chapter.content)
                  .unwrap();
              });
              for_each_mut(s, ctxt, &mut chapter.sub_items);
            }
          }
        }
      }

      for_each_mut(s, &ctxt, &mut book.sections);
    });

    Ok(book)
  }

  fn supports_renderer(&self, renderer: &str) -> bool {
    renderer != "not-supported"
  }
}

#[cfg(test)]
mod test {
  use super::*;
  use mdbook::{book::load_book, config::BuildConfig, preprocess::CmdPreprocessor, MDBook};
  use tempfile::tempdir;

  #[test]
  fn test_quiz_generator() -> Result<()> {
    let dir = tempdir()?.into_path();

    let builder = MDBook::init(&dir);
    builder.build()?;

    let quiz_path = dir.join("quiz.toml");
    fs::write(
      &quiz_path,
      r#"
    [[questions]]
    type = "ShortAnswer"
    prompt.prompt = "Hello world"
    answer.answer = "No"
    "#,
    )?;

    let chapter_path = dir.join("src").join("chapter_1.md");
    fs::write(
      &chapter_path,
      r#"
    *Hello world!* 
    
    {{#quiz ../quiz.toml}}
    "#,
    )?;

    let book = load_book(dir.join("src"), &BuildConfig::default())?;
    let json = serde_json::json!(
      [
        {
          "root": dir.display().to_string(),
          "config": {
            "preprocessor": {
              "quiz": {
                "validate": true
              }
            },
          },
          "renderer": "html",
          "mdbook_version": "0.1.0"
        },
        serde_json::to_value(&book)?
      ]
    );
    let json_str = serde_json::to_string(&json)?;

    let preprocessor = QuizProcessor;
    let (ctx, book) = CmdPreprocessor::parse_input(json_str.as_bytes())?;
    let mut book = preprocessor.run(&ctx, book)?;

    let contents = match book.sections.remove(0) {
      BookItem::Chapter(chapter) => chapter.content,
      _ => unreachable!(),
    };
    assert!(!contents.contains("{{#quiz"));
    assert!(contents.contains("<script"));

    Ok(())
  }
}
