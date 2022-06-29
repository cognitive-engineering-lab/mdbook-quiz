use std::{
  fs,
  io::Write,
  path::{Path, PathBuf},
  process::{Command, Stdio},
};

use anyhow::{bail, Context, Result};
use mdbook::{
  book::{Book, Chapter},
  preprocess::{Preprocessor, PreprocessorContext},
  BookItem,
};
use regex::Regex;

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

  /// Path to the directory containing the mdbook-quiz Javascript files.
  /// Defaults to the directory installed with the mdbook-quiz source.
  js_dir: PathBuf,

  /// URL where quiz results are anonymously logged.
  log_endpoint: Option<String>,

  /// DO NOT USE
  consent: Option<bool>,
}

pub struct QuizProcessor;

struct QuizProcessorRef<'a> {
  ctx: &'a PreprocessorContext,
  config: QuizConfig,
  epilogue: String,
}

lazy_static::lazy_static! {
  static ref QUIZ_REGEX: Regex = Regex::new(r"\{\{#quiz ([^}]+)\}\}").unwrap();
}

impl<'a> QuizProcessorRef<'a> {
  fn copy_js_files(&mut self) -> Result<()> {
    // Rather than copying directly to the build directory, we instead copy to the book source
    // since mdBook will clean the build-dir after preprocessing. See mdBook#1087 for more.
    let target_dir = self
      .ctx
      .root
      .join(&self.ctx.config.book.src)
      .join("mdbook-quiz");
    fs::create_dir_all(&target_dir)?;

    let mut files = vec!["embed.js", "embed.css"];
    if let Some(true) = self.config.consent {
      files.extend(["consent.js", "consent.css"]);
    }

    for file in &files {
      let src = self.config.js_dir.join(file);
      fs::copy(src, target_dir.join(file))?;
    }

    self.epilogue = files
      .into_iter()
      .map(|file| {
        if Path::new(file).extension().unwrap().to_string_lossy() == "js" {
          format!(r#"<script type="text/javascript" src="mdbook-quiz/{file}"></script>"#)
        } else {
          format!(r#"<link rel="stylesheet" type="text/css" href="mdbook-quiz/{file}">"#)
        }
      })
      .collect::<Vec<_>>()
      .join("\n");

    Ok(())
  }

  fn validate_quiz(&self, path: &Path, contents: &str) -> Result<()> {
    let validator_path = self.config.js_dir.join("validator.js");
    let mut validator_process = Command::new("node")
      .arg(validator_path)
      .stdin(Stdio::piped())
      .spawn()?;

    let mut validator_stdin = validator_process.stdin.take().unwrap();
    validator_stdin.write_all(contents.as_bytes())?;
    drop(validator_stdin);

    let status = validator_process.wait()?;
    if !status.success() {
      bail!("Validation failed for quiz: {}", path.display());
    }

    Ok(())
  }

  fn process_quiz(&self, chapter_dir: &Path, quiz_path: &str) -> Result<String> {
    let quiz_path_rel = Path::new(quiz_path);
    let quiz_path_abs = chapter_dir.join(quiz_path_rel);

    let quiz_name = quiz_path_rel.file_stem().unwrap().to_string_lossy();

    let content_toml = std::fs::read_to_string(&quiz_path_abs)
      .with_context(|| format!("Failed to read quiz file: {}", quiz_path_abs.display()))?;

    if let Some(true) = self.config.validate {
      self.validate_quiz(quiz_path_rel, &content_toml)?;
    }

    let content = content_toml.parse::<toml::Value>()?;
    let content_json = serde_json::to_string(&content)?;

    let mut html = String::from("<div class=\"quiz-placeholder\"");

    let mut add_data = |k: &str, v: &str| {
      html.push_str(&format!(
        " data-{}=\"{}\" ",
        k,
        html_escape::encode_double_quoted_attribute(v)
      ));
    };
    add_data("quiz-name", &quiz_name);
    add_data("quiz-questions", &content_json);
    if let Some(log_endpoint) = &self.config.log_endpoint {
      add_data("quiz-log-endpoint", log_endpoint);
    }
    if let Some(true) = self.config.fullscreen {
      add_data("quiz-fullscreen", "");
    }
    if let Some(true) = self.config.cache_answers {
      add_data("quiz-cache-answers", "");
    }

    html.push_str("></div>");

    Ok(html)
  }

  fn process_chapter(&self, chapter: &mut Chapter) -> Result<()> {
    let chapter_path = self
      .ctx
      .root
      .join(&self.ctx.config.book.src)
      .join(chapter.path.as_ref().unwrap());
    let chapter_dir = chapter_path.parent().unwrap();

    let content = &chapter.content;
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
        chapter.content.replace_range(range, &html);
      }

      chapter.content.push_str(&self.epilogue);
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
    let config = QuizConfig {
      js_dir: match config_toml.get("js-dir") {
        Some(dir) => dir.as_str().unwrap().into(),
        None => PathBuf::from(env!("CARGO_MANIFEST_DIR"))
          .join("js")
          .join("dist"),
      },
      log_endpoint: config_toml
        .get("log-endpoint")
        .map(|value| value.as_str().unwrap().to_owned()),
      fullscreen: parse_bool("fullscreen"),
      consent: parse_bool("consent"),
      validate: parse_bool("validate"),
      cache_answers: parse_bool("cache-answers"),
    };

    let mut processor = QuizProcessorRef {
      ctx,
      config,
      epilogue: String::new(),
    };
    processor.copy_js_files()?;

    book.for_each_mut(|item| {
      if let BookItem::Chapter(chapter) = item {
        processor.process_chapter(chapter).unwrap();
      }
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
              "quiz": {}
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
