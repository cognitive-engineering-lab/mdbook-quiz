use crate::{tomlcast, SpannedValue, Validate, ValidationContext};
use mdbook_quiz_schema::{Question, QuestionFields, Quiz};

mod markdown;
mod multiple_choice;
mod short_answer;
mod tracing;

impl Validate for Quiz {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    let table = tomlcast!(value.table["questions"].array);
    for (q, qvalue) in self.questions.iter().zip(table.iter()) {
      q.validate(cx, qvalue);
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
  assert!(crate::harness(contents).is_err());
}
