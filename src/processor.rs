use std::path::Path;

use anyhow::Result;
use mdbook::{
  book::{Book, Chapter},
  preprocess::{Preprocessor, PreprocessorContext},
  BookItem,
};
use pulldown_cmark::{CowStr, Event, Parser};
use pulldown_cmark_to_cmark::cmark;
use regex::Regex;

pub struct QuizProcessor;

fn to_cowstr(s: impl Into<String>) -> CowStr<'static> {
  let s: String = s.into();
  CowStr::Boxed(s.into_boxed_str())
}

pub struct QuizConfig {
  log_endpoint: Option<String>,
}

impl QuizProcessor {
  pub fn new() -> Self {
    QuizProcessor
  }

  fn process_chapter(
    &self,
    config: &QuizConfig,
    ctx: &PreprocessorContext,
    chapter: &mut Chapter,
  ) -> Result<()> {
    let events = Parser::new(&chapter.content);

    let chapter_path = ctx
      .root
      .join(&ctx.config.book.src)
      .join(chapter.path.as_ref().unwrap());
    let chapter_dir = chapter_path.parent().unwrap();

    let mut new_events = Vec::new();
    let re = Regex::new(r"^\{\{#quiz ([^}]+)\}\}$")?;
    for event in events {
      let new_event = match &event {
        Event::Text(text) => {
          let text = text.as_ref();
          match re.captures(text) {
            Some(captures) => {
              let quiz_path_rel = Path::new(captures.get(1).unwrap().as_str());
              let quiz_path_abs = chapter_dir.join(quiz_path_rel);

              let quiz_name = quiz_path_rel.file_stem().unwrap().to_string_lossy();

              let content_toml = std::fs::read_to_string(quiz_path_abs)?;
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
              if let Some(log_endpoint) = &config.log_endpoint {
                add_data("quiz-log-endpoint", log_endpoint);
              }
              html.push_str("></div>");

              Event::Html(to_cowstr(html))
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
    let config = QuizConfig {
      log_endpoint: config_toml
        .get("log-endpoint")
        .map(|value| value.as_str().unwrap().to_owned()),
    };

    book.for_each_mut(|item| {
      if let BookItem::Chapter(chapter) = item {
        self.process_chapter(&config, ctx, chapter).unwrap();
      }
    });

    Ok(book)
  }

  fn supports_renderer(&self, renderer: &str) -> bool {
    renderer != "not-supported"
  }
}
