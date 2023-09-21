//! The schema for questions used in `mdbook-quiz`. Intended to be deserialized from a TOML file.
//! See [`Quiz`] as the top-level type. Here is an example of a quiz:
//!
//! ```toml
//! [[questions]]
//! id = "b230bed3-d6ba-4048-8b06-aa655d837b04"
//! type = "MultipleChoice"
//! prompt.prompt = "What is 1 + 1?"
//! prompt.distractors = ["1", "3", "**infinity**"]
//! answer.answer = ["2"]
//! context = """
//! Consult your local mathematician for details.
//! """"
//! ```
//!
//! Note that all Rust identifiers with multiple words (e.g. `does_compile`) use camelCase keys,
//! so should be written as `doesCompile` in the TOML.

#![warn(missing_docs)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[cfg(feature = "ts")]
use ts_rs::TS;

#[cfg(feature = "json-schema")]
use schemars::JsonSchema;

/// A quiz is the top-level data structure in mdbook-quiz.
/// It represents a sequence of questions.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
pub struct Quiz {
  /// The questions of the quiz.
  pub questions: Vec<Question>,

  /// Context for multipart questions.
  ///
  /// Maps from a string key to a description of the question context.
  #[cfg_attr(feature = "ts", ts(optional))]
  pub multipart: Option<HashMap<String, Markdown>>,
}

/// A [Markdown](https://commonmark.org/help/) string.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
pub struct Markdown(pub String);

/// An individual question. One of several fixed types.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
#[serde(tag = "type")]
pub enum Question {
  /// A [`ShortAnswer`] question.
  ShortAnswer(ShortAnswer),
  /// A [`Tracing`] question.
  Tracing(Tracing),
  /// A [`MultipleChoice`] question.
  MultipleChoice(MultipleChoice),
}

/// Fields common to all question types.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
#[serde(rename_all = "camelCase")]
pub struct QuestionFields<Prompt, Answer> {
  /// A unique identifier for a given question.
  ///
  /// Used primarily for telemetry, as a stable identifer for questions.
  #[cfg_attr(feature = "ts", ts(optional))]
  pub id: Option<String>,

  /// If this key exists, then this question is part of a multipart group.
  /// The key must be contained in the [`Quiz::multipart`] map.
  #[cfg_attr(feature = "ts", ts(optional))]
  pub multipart: Option<String>,

  /// The contents of the prompt. Depends on the question type.
  pub prompt: Prompt,

  /// The contents of the answer. Depends on the question type.
  pub answer: Answer,

  /// Additional context that explains the correct answer.
  ///
  /// Only shown after the user has answered correctly or given up.
  #[cfg_attr(feature = "ts", ts(optional))]
  pub context: Option<Markdown>,

  /// If true, asks all users for a brief prose justification of their answer.
  ///
  /// Useful for getting a qualitative sense of why users respond a particular way.
  #[cfg_attr(feature = "ts", ts(optional))]
  pub prompt_explanation: Option<bool>,
}

/// The kind of response format (and subsequent input method) that accompanies
/// a given short answer questions.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
#[serde(rename_all = "lowercase")]
pub enum ShortAnswerResponseFormat {
  /// A one-sentence response, given an `<input>`
  Short,

  /// A long-form response, given a `<textarea>`
  Long,

  /// A code response, given a code editor
  Code,
}

/// A prompt for a [`ShortAnswer`] question.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
pub struct ShortAnswerPrompt {
  /// The text of the prompt.
  pub prompt: Markdown,

  /// Format of the response.
  #[cfg_attr(feature = "ts", ts(optional))]
  pub response: Option<ShortAnswerResponseFormat>,
}

/// An answer for a [`ShortAnswer`] question.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
pub struct ShortAnswerAnswer {
  /// The exact string that answers the question.
  pub answer: String,

  /// Other acceptable strings answers.
  #[cfg_attr(feature = "ts", ts(optional))]
  pub alternatives: Option<Vec<String>>,
}

/// A question where users type in a response.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
pub struct ShortAnswer(pub QuestionFields<ShortAnswerPrompt, ShortAnswerAnswer>);

/// A prompt for a [`Tracing`] question.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
pub struct TracingPrompt {
  /// The contents of the program to trace.
  pub program: String,
}

/// An answer for a [`Tracing`] question.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
#[serde(rename_all = "camelCase")]
pub struct TracingAnswer {
  /// True if the program should pass the compiler
  pub does_compile: bool,

  /// If doesCompile=true, then the contents of stdout after running the program
  #[cfg_attr(feature = "ts", ts(optional))]
  pub stdout: Option<String>,

  /// If doesCompile=false, then the line number of the code causing the error
  #[cfg_attr(feature = "ts", ts(optional))]
  pub line_number: Option<usize>,
}

/// A question where users guess the output of a program.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
pub struct Tracing(pub QuestionFields<TracingPrompt, TracingAnswer>);

/// A prompt for a [`MultipleChoice`] question.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
#[serde(rename_all = "camelCase")]
pub struct MultipleChoicePrompt {
  /// The text of the prompt.
  pub prompt: Markdown,

  /// An array of incorrect answers.
  pub distractors: Vec<Markdown>,

  /// If defined, don't randomize distractors and put answer at this index.
  #[cfg_attr(feature = "ts", ts(optional))]
  pub answer_index: Option<usize>,

  /// If defined, don't randomize distractors and sort answers by content.
  #[cfg_attr(feature = "ts", ts(optional))]
  pub sort_answers: Option<bool>,
}

/// The type of response for a [`MultipleChoice`] question.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
#[serde(untagged)]
pub enum MultipleChoiceAnswerFormat {
  /// There is one correct answer.
  Single(Markdown),

  /// There are multiple correct answers, and the user must select each.
  Multi(Vec<Markdown>),
}

/// An answer for a [`MultipleChoice`] question.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
pub struct MultipleChoiceAnswer {
  /// The text of the correct answer.
  pub answer: MultipleChoiceAnswerFormat,
}

/// A question where users select among several possible answers.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(TS), ts(export))]
#[cfg_attr(feature = "json-schema", derive(JsonSchema))]
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
