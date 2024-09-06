use crate::{SpannedValue, Validate, ValidationContext};
use markdown::{mdast::Node, ParseOptions};
use mdbook_quiz_schema::*;
use miette::{Diagnostic, SourceSpan};
use thiserror::Error;

#[derive(Error, Diagnostic, Debug)]
#[error("Spelling error: `{word}`")]
struct SpellingError {
  word: String,

  #[label]
  span: SourceSpan,
}

impl Validate for Markdown {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    let root = markdown::to_mdast(&self.0, &ParseOptions::default()).unwrap();

    fn collect_nodes(root: &Node) -> Vec<&Node> {
      let mut queue = vec![root];
      let mut nodes = vec![];
      while let Some(node) = queue.pop() {
        nodes.push(node);
        if let Some(children) = node.children() {
          queue.extend(children);
        }
      }
      nodes
    }

    if cx.spellcheck {
      let nodes = collect_nodes(&root);
      let dict = crate::spellcheck::dictionary();
      let open_quote = &cx.contents()[value.start()..];
      let quote_size = if let Some(next) = open_quote.strip_prefix(r#"""""#) {
        if next.starts_with('\n') {
          4
        } else {
          3
        }
      } else {
        1
      };
      let base = value.start() + quote_size;
      for node in nodes {
        if let (Node::Text(text), Some(pos)) = (node, node.position()) {
          let errors = dict
            .check_indices(&text.value)
            .filter(|(_, s)| *s != "-")
            .filter(|(_, s)| s.parse::<isize>().is_err())
            .filter(|(_, s)| s.parse::<f32>().is_err());
          for (idx, substr) in errors {
            // base: location of string literal in TOML file
            // pos.start.offset: location of markdown text node in the string
            // idx: location of error in text node
            let span = (base + pos.start.offset + idx, substr.len());
            let error = SpellingError {
              word: substr.to_string(),
              span: span.into(),
            };
            cx.warning(error);
          }
        }
      }
    }
  }
}

#[test]
fn validate_markdown_passes() {
  let contents = r#"
[[questions]]
type = "MultipleChoice"
prompt.prompt = "Hello **world**"
answer.answer = ""
prompt.distractors = [""]
"#;
  assert!(crate::test::harness(contents).is_ok());
}

#[test]
fn validate_markdown_spellcheck() {
  let contents = r#"
[[questions]]
type = "MultipleChoice"
prompt.prompt = "Hello **wrold**"
answer.answer = ""
prompt.distractors = [""]
"#;
  // TODO: right now this test is just verified looking at stderr
  assert!(crate::test::harness(contents).is_ok());
}
