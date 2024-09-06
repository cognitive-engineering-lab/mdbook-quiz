use std::{
  fs,
  process::{Command, Stdio},
};
use tempfile::TempDir;

use crate::{cxensure, tomlcast, SpannedValue, SpannedValueExt, Validate, ValidationContext};
use mdbook_quiz_schema::*;

impl Validate for Tracing {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    let QuestionFields {
      prompt: TracingPrompt { program },
      answer,
      ..
    } = &self.0;
    let mut inner = || -> anyhow::Result<()> {
      let dir = TempDir::new()?;
      let src_path = dir.path().join("main.rs");
      fs::write(&src_path, program)?;

      let rustc_output = Command::new("rustc")
        .arg(src_path)
        .args(["-A", "warnings"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(dir.path())
        .output()?;

      let rustc_stderr = String::from_utf8(rustc_output.stderr)?;
      let answer_val = tomlcast!(value.table["answer"]);

      if rustc_output.status.success() {
        cxensure!(
          cx,
          answer.does_compile,
          labels = vec![tomlcast!(answer_val.table["doesCompile"]).labeled_span()],
          "program compiles but doesCompile = false",
        );

        cxensure!(
          cx,
          answer.stdout.is_some(),
          labels = vec![answer_val.labeled_span()],
          "program compiles but stdout is missing"
        );

        let exe_path = dir.path().join("main");
        let cmd_output = Command::new(exe_path)
          .stdout(Stdio::piped())
          .stderr(Stdio::piped())
          .current_dir(dir.path())
          .output()?;
        let cmd_stdout = String::from_utf8(cmd_output.stdout)?;
        let cmd_stderr = String::from_utf8(cmd_output.stderr)?;

        cxensure!(
          cx,
          cmd_output.status.success(),
          labels = vec![answer_val.labeled_span()],
          "program fails when executed. stderr:\n{}",
          textwrap::indent(&cmd_stderr, "  ")
        );

        let expected_stdout = answer.stdout.as_ref().unwrap();
        cxensure!(
          cx,
          cmd_stdout.trim() == expected_stdout.trim(),
          labels = vec![tomlcast!(answer_val.table["stdout"]).labeled_span()],
          "expected stdout:\n{}\ndid not match actual stdout:\n{}",
          textwrap::indent(expected_stdout, "  "),
          textwrap::indent(&cmd_stdout, "  ")
        );
      } else {
        cxensure!(
          cx,
          !answer.does_compile,
          labels = vec![tomlcast!(answer_val.table["doesCompile"]).labeled_span()],
          "program does not compile but doesCompile = true. rustc stderr:\n{}",
          textwrap::indent(&rustc_stderr, "  ")
        );

        cxensure!(
          cx,
          answer.stdout.is_none(),
          labels = vec![answer_val.labeled_span()],
          "program does not compile but contains a stdout key"
        );
      }

      Ok(())
    };
    inner().unwrap();
  }
}

#[test]
fn validate_tracing_passes() {
  let contents = r#"
[[questions]]
type = "Tracing"
prompt.program = """
fn main() {
  println!("Hello world");
}
"""
answer.doesCompile = true
answer.stdout = "Hello world"
"#;
  assert!(crate::test::harness(contents).is_ok());
}

#[test]
fn validate_tracing_compile_fail() {
  let contents = r#"
[[questions]]
type = "Tracing"
prompt.program = """
fn main() {
  let x: String = 1;
}
"""
answer.doesCompile = true
answer.stdout = ""
"#;
  assert!(crate::test::harness(contents).is_err());
}

#[test]
fn validate_tracing_wrong_stdout() {
  let contents = r#"
[[questions]]
type = "Tracing"
prompt.program = """
fn main() {
  println!("Hello world");
}
"""
answer.doesCompile = true
answer.stdout = "meep meep"
"#;
  assert!(crate::test::harness(contents).is_err());
}
