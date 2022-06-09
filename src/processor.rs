use anyhow::Result;
use mdbook::{
  book::{Book, Chapter},
  preprocess::{Preprocessor, PreprocessorContext},
  BookItem,
};
use pulldown_cmark::{CowStr, Event, Parser};
use pulldown_cmark_to_cmark::cmark;
use regex::Regex;

pub struct SituProcessor;

fn to_cowstr(s: impl Into<String>) -> CowStr<'static> {
  let s: String = s.into();
  CowStr::Boxed(s.into_boxed_str())
}

impl SituProcessor {
  pub fn new() -> Self {
    SituProcessor
  }

  fn process_chapter(
    &self,
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
              let quiz_path_rel = captures.get(1).unwrap().as_str();
              let quiz_path_abs = chapter_dir.join(quiz_path_rel);
              let content_toml = std::fs::read_to_string(quiz_path_abs)?;
              let content = content_toml.parse::<toml::Value>()?;
              let content_json = serde_json::to_string(&content)?;

              Event::Html(to_cowstr(format!(
                r#"<div class="situ-quiz-placeholder" data-quiz="{}"></div>"#,
                html_escape::encode_double_quoted_attribute(&content_json)
              )))
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

impl Preprocessor for SituProcessor {
  fn name(&self) -> &str {
    "situ"
  }

  fn run(&self, ctx: &PreprocessorContext, mut book: Book) -> Result<Book> {
    book.for_each_mut(|item| {
      if let BookItem::Chapter(chapter) = item {
        self.process_chapter(ctx, chapter).unwrap();
      }
    });

    Ok(book)
  }

  fn supports_renderer(&self, renderer: &str) -> bool {
    renderer != "not-supported"
  }
}
