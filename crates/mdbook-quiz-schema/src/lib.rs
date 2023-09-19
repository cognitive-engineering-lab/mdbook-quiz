use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Quiz {
  pub questions: Vec<Question>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Markdown(pub String);

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(tag = "type")]
pub enum Question {
  ShortAnswer(ShortAnswer),
  Tracing(Tracing),
  MultipleChoice(MultipleChoice),
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct QuestionFields<Prompt, Answer> {
  #[ts(optional)]
  pub id: Option<String>,
  pub prompt: Prompt,
  pub answer: Answer,
  #[ts(optional)]
  pub context: Option<Markdown>,
  #[ts(optional)]
  pub prompt_explanation: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum ShortAnswerResponseFormat {
  Short,
  Long,
  Code,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ShortAnswerPrompt {
  /// The text of the prompt.
  pub prompt: Markdown,

  /// Format of the response.
  #[ts(optional)]
  pub response: Option<ShortAnswerResponseFormat>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ShortAnswerAnswer {
  /// The exact string that answers the question.
  pub answer: String,

  /// Other acceptable strings answers.
  #[ts(optional)]
  pub alternatives: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ShortAnswer(pub QuestionFields<ShortAnswerPrompt, ShortAnswerAnswer>);

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct TracingPrompt {
  /// The contents of the program to trace.
  pub program: String,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TracingAnswer {
  /// True if the program should pass the compiler
  pub does_compile: bool,

  /// If doesCompile=true, then the contents of stdout after running the program
  #[ts(optional)]
  pub stdout: Option<String>,

  /// If doesCompile=false, then the line number of the code causing the error
  #[ts(optional)]
  pub line_number: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Tracing(pub QuestionFields<TracingPrompt, TracingAnswer>);

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct MultipleChoicePrompt {
  /// The text of the prompt.
  pub prompt: Markdown,

  /// An array of incorrect answers.
  pub distractors: Vec<Markdown>,

  /// If defined, don't randomize distractors and put answer at this index.
  #[ts(optional)]
  pub answer_index: Option<usize>,

  /// If defined, don't randomize distractors and sort answers by content.
  #[ts(optional)]
  pub sort_answers: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(untagged)]
pub enum MultipleChoiceAnswerFormat {
  Single(Markdown),
  Multi(Vec<Markdown>),
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MultipleChoiceAnswer {
  /// The text of the correct answer.
  pub answer: MultipleChoiceAnswerFormat,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MultipleChoice(pub QuestionFields<MultipleChoicePrompt, MultipleChoiceAnswer>);

#[cfg(test)]
mod test {
  use super::*;

  #[test]
  fn test_parse_valid_schema() {
    let contents = r#"
[[questions]]
id = "hello world"
type = "MultipleChoice"
prompt.prompt = "What's up"
answer.answer = "A"
prompt.distractors = ["B", "C", "D"]
context = "Ok!"
"#;
    let _quiz: Quiz = toml::from_str(contents).unwrap();
    println!("{_quiz:#?}");
  }

  #[test]
  fn test_parse_invalid_schema() {
    let contents = r#"
[[questions]]
type = "MultipleChoice"
prompt = "Ok"
answer.answer = "Yeah"
context = "Hmm"
"#;
    let res = toml::from_str::<Quiz>(contents);
    println!("{res:?}");
    assert!(res.is_err());
  }
}
