use crate::{tomlcast, SpannedValue, Validate, ValidationContext};
use mdbook_quiz_schema::*;

impl Validate for ShortAnswerPrompt {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    self.prompt.validate(cx, tomlcast!(value.table["prompt"]))
  }
}

impl Validate for ShortAnswerAnswer {
  fn validate(&self, _cx: &mut ValidationContext, _value: &SpannedValue) {}
}

impl Validate for ShortAnswer {
  fn validate(&self, cx: &mut ValidationContext, value: &SpannedValue) {
    self.0.validate(cx, value)
  }
}
