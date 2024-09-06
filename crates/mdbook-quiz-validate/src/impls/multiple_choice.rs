use crate::{cxensure, tomlcast, SpannedValue, SpannedValueExt, Validate, ValidationContext};
use mdbook_quiz_schema::*;

impl Validate for MultipleChoice {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    self.0.validate(cx, value)
  }
}

impl Validate for MultipleChoicePrompt {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    self.prompt.validate(cx, tomlcast!(value.table["prompt"]));

    let distractors = tomlcast!(value.table["distractors"]);
    for (d, dv) in self.distractors.iter().zip(tomlcast!(distractors.array)) {
      d.validate(cx, dv);
    }

    if let Some(idx) = self.answer_index {
      cxensure!(
        cx,
        idx <= self.distractors.len(),
        labels = vec![tomlcast!(value.table["answerIndex"]).labeled_span()],
        "Answer index is too large"
      );
    }

    cxensure!(
      cx,
      !(self.answer_index.is_some() && self.sort_answers.is_some()),
      labels = vec![
        tomlcast!(value.table["sortAnswers"]).labeled_span(),
        tomlcast!(value.table["answerIndex"]).labeled_span()
      ],
      "Cannot use both answerIndex and sortAnswers"
    );
  }
}

impl Validate for MultipleChoiceAnswerFormat {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    match self {
      MultipleChoiceAnswerFormat::Single(ans) => {
        ans.validate(cx, value);
      }
      MultipleChoiceAnswerFormat::Multi(v_ans) => {
        cxensure!(
          cx,
          !v_ans.is_empty(),
          labels = vec![value.labeled_span()],
          "Must be at least one correct answer"
        );
        for (ans, ansv) in v_ans.iter().zip(tomlcast!(value.array)) {
          ans.validate(cx, ansv);
        }
      }
    }
  }
}

impl Validate for MultipleChoiceAnswer {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    self.answer.validate(cx, tomlcast!(value.table["answer"]))
  }
}

#[test]
fn validate_mcq_passes() {
  let contents = r#"
[[questions]]
type = "MultipleChoice"
prompt.prompt = ""
answer.answer = ""
prompt.distractors = [""]
"#;
  assert!(crate::test::harness(contents).is_ok());
}

#[test]
fn validate_mcq_index_and_sort() {
  let contents = r#"
[[questions]]
type = "MultipleChoice"
prompt.prompt = ""
answer.answer = ""
prompt.distractors = [""]
prompt.answerIndex = 0
prompt.sortAnswers = true
"#;
  assert!(crate::test::harness(contents).is_err());
}
