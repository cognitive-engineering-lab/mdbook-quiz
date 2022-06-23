use std::{
  fs,
  io::Write,
  path::{Path, PathBuf},
  process::{Command, Stdio},
};

use anyhow::{bail, Result};
use mdbook::{
  book::{Book, Chapter},
  preprocess::{Preprocessor, PreprocessorContext},
  BookItem,
};
use pulldown_cmark::{CowStr, Event, Parser};
use pulldown_cmark_to_cmark::cmark;
use regex::Regex;

pub struct QuizConfig {
  js_dir: PathBuf,
  log_endpoint: Option<String>,
  fullscreen: Option<bool>,
  consent: Option<bool>,
  validate: Option<bool>,
}

pub struct QuizProcessor;

struct QuizProcessorRef<'a> {
  ctx: &'a PreprocessorContext,
  config: QuizConfig,
  epilogue: String,
}

lazy_static::lazy_static! {
  static ref QUIZ_REGEX: Regex = Regex::new(r"^\{\{#quiz ([^}]+)\}\}$").unwrap();
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

    let content_toml = std::fs::read_to_string(quiz_path_abs)?;

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

    html.push_str("></div>");

    Ok(html)
  }

  fn process_chapter(&self, chapter: &mut Chapter) -> Result<()> {
    let events = Parser::new(&chapter.content);

    let chapter_path = self
      .ctx
      .root
      .join(&self.ctx.config.book.src)
      .join(chapter.path.as_ref().unwrap());
    let chapter_dir = chapter_path.parent().unwrap();

    let mut new_events = Vec::new();
    for event in events {
      let new_event = match &event {
        Event::Text(text) => {
          let text = text.as_ref();
          match QUIZ_REGEX.captures(text) {
            Some(captures) => {
              let quiz_path = captures.get(1).unwrap().as_str();
              let html = self.process_quiz(chapter_dir, quiz_path)?;
              Event::Html(CowStr::Boxed(html.into_boxed_str()))
            }
            None => event,
          }
        }
        _ => event,
      };
      new_events.push(new_event);
    }

    let mut new_content = String::new();
    cmark(new_events.into_iter(), &mut new_content)?;
    new_content.push_str(&self.epilogue);

    chapter.content = new_content;

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
