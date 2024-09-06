use crate::{cxensure, tomlcast, SpannedValue, SpannedValueExt, Validate, ValidationContext};
use fluid_let::{fluid_let, fluid_set};
use mdbook_quiz_schema::{Question, QuestionFields, Quiz};

mod markdown;
mod multiple_choice;
mod short_answer;
mod tracing;

fluid_let!(static QUIZ: Quiz);

impl Validate for Quiz {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    fluid_set!(QUIZ, self);

    cxensure!(
      cx,
      !self.questions.is_empty(),
      labels = vec![value.labeled_span()],
      "Quiz must have at least one question"
    );

    let table = tomlcast!(value.table["questions"].array);
    for (q, qvalue) in self.questions.iter().zip(table.iter()) {
      q.validate(cx, qvalue);
    }

    if let Some(multipart) = &self.multipart {
      let multipart_val = tomlcast!(value.table["multipart"]);
      for (k, v) in multipart {
        v.validate(cx, multipart_val.get_ref().get(k).unwrap());
      }
    }
  }
}

impl Validate for Question {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    match self {
      Question::MultipleChoice(q) => q.validate(cx, value),
      Question::ShortAnswer(q) => q.validate(cx, value),
      Question::Tracing(q) => q.validate(cx, value),
    }
  }
}

impl<Prompt: Validate, Answer: Validate> Validate for QuestionFields<Prompt, Answer> {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    if let Some(id) = &self.id {
      cx.check_id(id, tomlcast!(value.table["id"]));
    }

    if let Some(multipart) = &self.multipart {
      let multipart_val = tomlcast!(value.table["multipart"]);
      QUIZ.get(|quiz| {
        let quiz = quiz.unwrap();
        let contains_key = quiz
          .multipart
          .as_ref()
          .map(|mps| mps.contains_key(multipart))
          .unwrap_or(false);
        cxensure!(
          cx,
          contains_key,
          labels = vec![multipart_val.labeled_span()],
          "Quiz does not have multipart: {multipart}"
        );
      });
    }

    self.prompt.validate(cx, tomlcast!(value.table["prompt"]));

    self.answer.validate(cx, tomlcast!(value.table["answer"]));

    if let Some(context) = &self.context {
      context.validate(cx, tomlcast!(value.table["context"]));
    }
  }
}

#[test]
fn validate_duplicate_ids() {
  let contents = r#"
[[questions]]
id = "hello"
type = "MultipleChoice"
prompt.prompt = ""
answer.answer = ""
prompt.distractors = [""]

[[questions]]
id = "hello"
type = "MultipleChoice"
prompt.prompt = ""
answer.answer = ""
prompt.distractors = [""]
"#;
  assert!(crate::test::harness(contents).is_err());
}

#[test]
fn validate_multipart_spelling() {
  let contents = r#"
[multipart]
a = """
Hello wrold
"""

[[questions]]
id = "hello"
multipart = "a"
type = "MultipleChoice"
prompt.prompt = ""
answer.answer = ""
prompt.distractors = [""]
"#;

  // TODO: right now this test is just verified looking at stderr
  assert!(crate::test::harness(contents).is_ok());
}

#[test]
fn validate_multipart_key() {
  let contents = r#"
[multipart]
a = ""


[[questions]]
id = "hello"
multipart = "b"
type = "MultipleChoice"
prompt.prompt = ""
answer.answer = ""
prompt.distractors = [""]
"#;
  assert!(crate::test::harness(contents).is_err());
}
