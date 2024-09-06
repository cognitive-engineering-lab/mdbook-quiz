//! Validation logic for types in [`mdbook_quiz_schema`].

#![warn(missing_docs)]

use std::{
  cell::RefCell,
  collections::HashSet,
  fmt,
  path::{Path, PathBuf},
  sync::{Arc, Mutex},
};

use mdbook_quiz_schema::*;
use miette::{
  miette, Diagnostic, EyreContext, LabeledSpan, MietteHandler, NamedSource, Result, SourceSpan,
};
use thiserror::Error;

pub use spellcheck::register_more_words;
pub use toml_spanned_value::SpannedValue;

mod impls;
mod spellcheck;

#[derive(Default)]
struct ValidatedInner {
  ids: HashSet<String>,
  paths: HashSet<PathBuf>,
}

#[derive(Default, Clone)]
/// A thread-safe mutable set of already-validated identifiers and paths.
pub struct Validated(Arc<Mutex<ValidatedInner>>);

struct QuizDiagnostic {
  error: miette::Error,
  fatal: bool,
}

pub(crate) struct ValidationContext {
  diagnostics: RefCell<Vec<QuizDiagnostic>>,
  path: PathBuf,
  contents: String,
  validated: Validated,
  spellcheck: bool,
}

impl ValidationContext {
  pub fn new(path: &Path, contents: &str, validated: Validated, spellcheck: bool) -> Self {
    ValidationContext {
      diagnostics: Default::default(),
      path: path.to_owned(),
      contents: contents.to_owned(),
      validated,
      spellcheck,
    }
  }

  pub fn add_diagnostic(&mut self, err: impl Into<miette::Error>, fatal: bool) {
    self.diagnostics.borrow_mut().push(QuizDiagnostic {
      error: err.into(),
      fatal,
    });
  }

  pub fn error(&mut self, err: impl Into<miette::Error>) {
    self.add_diagnostic(err, true);
  }

  pub fn warning(&mut self, err: impl Into<miette::Error>) {
    self.add_diagnostic(err, false);
  }

  pub fn check(&mut self, f: impl FnOnce() -> Result<()>) {
    if let Err(res) = f() {
      self.error(res);
    }
  }

  pub fn check_id(&mut self, id: &str, value: &SpannedValue) {
    let new_id = self.validated.0.lock().unwrap().ids.insert(id.to_string());
    if !new_id {
      self.error(miette!(
        labels = vec![value.labeled_span()],
        "Duplicate ID: {id}"
      ));
    }
  }

  pub fn contents(&self) -> &str {
    &self.contents
  }
}

impl fmt::Debug for ValidationContext {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    let handler = MietteHandler::default();
    for diagnostic in self.diagnostics.borrow_mut().drain(..) {
      let src = NamedSource::new(self.path.to_string_lossy(), self.contents.clone());
      let report = diagnostic.error.with_source_code(src);
      handler.debug(report.as_ref(), f)?;
    }
    Ok(())
  }
}

macro_rules! cxensure {
  ($cx:expr, $($rest:tt)*) => {{
    $cx.check(|| {
      miette::ensure!($($rest)*);
      Ok(())
    });
  }};
}

macro_rules! tomlcast {
  ($e:ident) => { $e };
  ($e:ident .table $($rest:tt)*) => {{
    let _t = $e.get_ref().as_table().unwrap();
    tomlcast!(_t $($rest)*)
  }};
  ($e:ident .array $($rest:tt)*) => {{
    let _t = $e.get_ref().as_array().unwrap();
    tomlcast!(_t $($rest)*)
  }};
  ($e:ident [$s:literal] $($rest:tt)*) => {{
    let _t = $e.get($s).unwrap();
    tomlcast!(_t $($rest)*)
  }}
}

pub(crate) use {cxensure, tomlcast};

pub(crate) trait Validate {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue);
}

pub(crate) trait SpannedValueExt {
  fn labeled_span(&self) -> LabeledSpan;
}

impl SpannedValueExt for SpannedValue {
  fn labeled_span(&self) -> LabeledSpan {
    let span = self.start()..self.end();
    LabeledSpan::new_with_span(None, span)
  }
}

#[derive(Error, Diagnostic, Debug)]
#[error("TOML parse error: {cause}")]
struct ParseError {
  cause: String,

  #[label]
  span: Option<SourceSpan>,
}

/// Runs validation on a quiz with TOML-format `contents` at `path` under the ID set `ids`.
pub fn validate(
  path: &Path,
  contents: &str,
  validated: &Validated,
  spellcheck: bool,
) -> anyhow::Result<()> {
  let not_checked = validated.0.lock().unwrap().paths.insert(path.to_path_buf());
  if !not_checked {
    return Ok(());
  }

  let mut cx = ValidationContext::new(path, contents, validated.clone(), spellcheck);

  let parse_result = toml::from_str::<Quiz>(contents);
  match parse_result {
    Ok(quiz) => {
      let value: SpannedValue = toml::from_str(contents)?;
      quiz.validate(&mut cx, &value)
    }
    Err(parse_err) => {
      let error = ParseError {
        cause: format!("{parse_err}"),
        span: None,
      };
      cx.error(error);
    }
  }

  let has_diagnostic = cx.diagnostics.borrow().len() > 0;
  let is_fatal = cx.diagnostics.borrow().iter().any(|d| d.fatal);

  if has_diagnostic {
    eprintln!("{cx:?}");
  }

  anyhow::ensure!(!is_fatal, "Quiz failed to validate: {}", path.display());

  Ok(())
}

#[cfg(test)]
pub(crate) mod test {
  use super::*;

  pub(crate) fn harness(contents: &str) -> anyhow::Result<()> {
    validate(Path::new("dummy.rs"), contents, &Validated::default(), true)
  }

  #[test]
  fn validate_twice() -> anyhow::Result<()> {
    let contents = r#"
[[questions]]
id = "foobar"
type = "MultipleChoice"
prompt.prompt = ""
answer.answer = ""
prompt.distractors = [""]
"#;
    let validated = Validated::default();
    validate(Path::new("dummy.rs"), contents, &validated, true)?;
    validate(Path::new("dummy.rs"), contents, &validated, true)?;
    Ok(())
  }

  #[test]
  fn validate_parse_error() {
    let contents = r#"
[[questions]]
type = "MultipleChoice
prompt.prompt = ""
answer.answer = ""
prompt.distractors = [""]
    "#;
    assert!(harness(contents).is_err());
  }
}
