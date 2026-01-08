use anyhow::{Context, Result};
use mdbook_preprocessor::PreprocessorContext;

use mdbook_quiz_validate::Validated;
use regex::Regex;
use std::{
  env, fs,
  path::{Path, PathBuf},
  sync::OnceLock,
};
use uuid::Uuid;

mod utils;
use utils::{Asset, HtmlElementBuilder, SimplePreprocessor};

utils::asset_generator!("../js/");

const FRONTEND_ASSETS: [Asset; 2] = [make_asset!("quiz-embed.iife.js"), make_asset!("style.css")];

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
  make_asset!("quiz-embed.iife.js.map"), /*make_asset!("style.css.map")*/
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

  /// If true, then run a spellchecker on all Markdown strings.
  ///
  /// You can add a custom dictionary via the `more-words` key.
  spellcheck: Option<bool>,

  /// Path to a .dic file containing words to include in the spellcheck dictionary.
  more_words: Option<PathBuf>,

  /// If true (and telemetry is enabled) then allow users to report bugs in the frontend.
  show_bug_reporter: Option<bool>,

  /// The text to initially show before a user starts a quiz. "Quiz" by default.
  initial_text: Option<String>,

  dev_mode: bool,
}

struct QuizPreprocessor {
  config: QuizConfig,
  validated: Validated,
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
    if changed {
      fs::write(path, doc.to_string())?;
    }
    Ok(changed)
  }

  fn process_quiz(&self, chapter_dir: &Path, quiz_path: &str) -> Result<String> {
    let quiz_path_rel = Path::new(quiz_path);
    let quiz_path_abs = chapter_dir.join(quiz_path_rel);

    let mut content_toml = fs::read_to_string(&quiz_path_abs)
      .with_context(|| format!("Failed to read quiz file: {}", quiz_path_abs.display()))?;

    mdbook_quiz_validate::validate(
      &quiz_path_abs,
      &content_toml,
      &self.validated,
      self.config.spellcheck.unwrap_or(false),
    )?;

    let changed = self.auto_id(&quiz_path_abs, &content_toml)?;
    if changed {
      content_toml = fs::read_to_string(&quiz_path_abs)?;
    }

    #[allow(unused_mut)]
    let mut content = content_toml.parse::<toml::Value>()?;

    #[cfg(feature = "aquascope")]
    self.add_aquascope_blocks(&mut content)?;

    let quiz_name = quiz_path_rel.file_stem().unwrap().to_string_lossy();

    let mut html = HtmlElementBuilder::new();

    html
      .attr("class", "quiz-placeholder")
      .data("quiz-name", &quiz_name)?
      .data("quiz-questions", &content)?;

    if let Some(true) = self.config.fullscreen {
      html.data("quiz-fullscreen", true)?;
    }
    if let Some(true) = self.config.cache_answers
      && !self.config.dev_mode
    {
      html.data("quiz-cache-answers", true)?;
    }
    if let Some(lang) = &self.config.default_language {
      html.data("quiz-default-language", lang)?;
    }
    if let Some(true) = self.config.show_bug_reporter {
      html.data("quiz-show-bug-reporter", "")?;
    }
    if let Some(s) = &self.config.initial_text {
      html.data("quiz-initial-text", s)?;
    }

    Ok(html.finish())
  }
}

#[derive(clap::Parser)]
#[clap(author, about, version)]
struct QuizArgs;

impl SimplePreprocessor for QuizPreprocessor {
  type Args = QuizArgs;

  fn name() -> &'static str {
    "quiz"
  }

  fn build(ctx: &PreprocessorContext) -> Result<Self> {
    log::info!("Running the mdbook-quiz preprocessor");

    // In mdbook 0.5.x, get_preprocessor was removed. Use config.get() instead
    let config_key = format!("preprocessor.{}", Self::name());
    let config_toml: toml::Value = ctx
      .config
      .get::<toml::Value>(&config_key)
      .ok()
      .flatten()
      .unwrap_or_else(|| toml::Value::Table(toml::map::Map::new()));

    let parse_bool = |key: &str| config_toml.get(key).and_then(|value| value.as_bool());
    let get_str = |key: &str| {
      config_toml
        .get(key)
        .and_then(|value| value.as_str())
        .map(|s| s.to_string())
    };

    let dev_mode = env::var("QUIZ_DEV_MODE").is_ok();
    let config = QuizConfig {
      fullscreen: parse_bool("fullscreen"),
      cache_answers: parse_bool("cache-answers"),
      default_language: get_str("default-language"),
      more_words: get_str("more-words").map(PathBuf::from),
      spellcheck: parse_bool("spellcheck"),
      show_bug_reporter: parse_bool("show-bug-reporter"),
      initial_text: get_str("initial-text"),
      dev_mode,
    };

    if let Some(more_words) = &config.more_words {
      mdbook_quiz_validate::register_more_words(more_words)?;
    }

    Ok(QuizPreprocessor {
      config,
      validated: Validated::default(),
      #[cfg(feature = "aquascope")]
      aquascope: mdbook_aquascope::AquascopePreprocessor::new()
        .context("Aquascope failed to initialize")?,
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
  utils::preprocessor::main::<QuizPreprocessor>()
}

#[cfg(test)]
mod test {
  use super::QuizPreprocessor;
  use anyhow::Result;
  use mdbook_core::book::{Book, BookItem, Chapter};
  use mdbook_core::config::Config;
  use mdbook_preprocessor::{Preprocessor, PreprocessorContext};
  use mdbook_quiz_schema::{Question, Quiz};
  use std::fs;
  use std::path::{Path, PathBuf};
  use tempfile::{tempdir, TempDir};

  /// Test harness to replace the old MdbookTestHarness from mdbook-preprocessor-utils
  /// This provides a temporary directory structure for testing mdbook preprocessors
  struct TestHarness {
    dir: TempDir,
  }

  impl TestHarness {
    fn new() -> Result<Self> {
      let dir = tempdir()?;
      // Create minimal book structure
      fs::create_dir_all(dir.path().join("src"))?;
      
      // Create a minimal SUMMARY.md
      fs::write(
        dir.path().join("src").join("SUMMARY.md"),
        "# Summary\n\n- [Chapter 1](chapter_1.md)\n",
      )?;
      
      Ok(TestHarness { dir })
    }

    fn root(&self) -> &Path {
      self.dir.path()
    }

    /// Compile the book through the preprocessor
    fn compile(&self) -> Result<Book> {
      // Create a PreprocessorContext
      let ctx = PreprocessorContext::new(
        self.root().to_path_buf(),
        Config::default(),
        "html".to_string(),
      );

      // Create a Book with the chapter we wrote
      let book = self.create_book()?;

      // Use SimplePreprocessorDriver to run the preprocessor
      let driver = crate::utils::preprocessor::SimplePreprocessorDriver::<QuizPreprocessor>::new();
      driver.run(&ctx, book)
    }

    /// Create a Book structure from the files in the test directory
    fn create_book(&self) -> Result<Book> {
      let chapter_path = self.root().join("src").join("chapter_1.md");
      let content = fs::read_to_string(&chapter_path)?;

      let chapter = Chapter {
        name: "Chapter 1".to_string(),
        content,
        number: Some(mdbook_core::book::SectionNumber::new(vec![1])),
        sub_items: vec![],
        path: Some(PathBuf::from("chapter_1.md")),
        source_path: Some(PathBuf::from("chapter_1.md")),
        parent_names: vec![],
      };

      let items = vec![BookItem::Chapter(chapter)];
      Ok(Book::new_with_items(items))
    }
  }

  #[test]
  fn test_quiz_generator() -> Result<()> {
    let harness = TestHarness::new()?;
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
      r#"*Hello world!*

{{#quiz ../quiz.toml}}
"#,
    )?;

    let mut book = harness.compile()?;

    let contents = match book.items.remove(0) {
      BookItem::Chapter(chapter) => chapter.content,
      _ => unreachable!(),
    };
    assert!(!contents.contains("{{#quiz"));
    assert!(contents.contains("<script"));

    let quiz_contents = fs::read_to_string(quiz_path)?;
    let quiz: Quiz = toml::from_str(&quiz_contents)?;
    let Question::ShortAnswer(q) = &quiz.questions[0] else {
      panic!("Invalid quiz")
    };
    assert!(q.0.id.is_some(), "ID not automatically inserted");

    Ok(())
  }
}
