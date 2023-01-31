# mdbook-quiz: interactive quizzes for Markdown

[![tests](https://github.com/cognitive-engineering-lab/mdbook-quiz/actions/workflows/main.yml/badge.svg)](https://github.com/cognitive-engineering-lab/mdbook-quiz/actions/workflows/main.yml)
[![crates.io](https://img.shields.io/crates/v/mdbook-quiz.svg)](https://crates.io/crates/mdbook-quiz)

_[live demo](https://cognitive-engineering-lab.github.io/mdbook-quiz/)_

This repository provides an [mdBook](https://github.com/rust-lang/mdBook) [preprocessor](https://rust-lang.github.io/mdBook/format/configuration/preprocessors.html) that allows you to add interactive quizzes to your Markdown books. A quiz looks like this:

<img width="521" alt="Screenshot of mdbook-quiz embedded in a web page" src="https://user-images.githubusercontent.com/663326/178065062-73542533-a1d7-479e-975b-cb0bf03658b2.png">

Table of contents:
 * [Installation](#installation)
   + [From crates.io](#from-cratesio)
   + [From source](#from-source)
 * [Usage](#usage)
 * [Quiz schema](#quiz-schema)
   + [Short answer](#short-answer)
   + [Multiple choice](#multiple-choice)
   + [Tracing](#tracing)
 * [Quiz configuration](#quiz-configuration)


## Installation

*These instructions assume you have an mdBook already set up. Unfamiliar with mdBook? Read the [mdBook guide!](https://rust-lang.github.io/mdBook/)*

### From crates.io

```
cargo install mdbook-quiz
```

Note: this tool is under active development. I recommend pinning to a specific version to avoid breakage, e.g. by running

```
cargo install mdbook-quiz --version <YOUR_VERSION>
```

And you can check your version by running `mdbook-quiz -V`. This repository uses semantic versioning for the quiz data format, so your quizzes should not break if you update to a more recent patch.

### From source

You need Cargo and [npm](https://npmjs.org/) installed. Then run:

```
git clone https://github.com/cognitive-engineering-lab/mdbook-quiz
cd mdbook-quiz
npm install -g graco
cargo install --path .
```

## Usage

First, create a quiz file. Quizzes are encoded as TOML files (see [Quiz schema](#quiz-schema)). For example:

```toml
# quizzes/rust-variables.toml
[[questions]]
type = "ShortAnswer"
prompt.prompt = "What is the keyword for declaring a variable in Rust?"
answer.answer = "let"
context = "For example, you can write: `let x = 1`"
```
 
Then in your Markdown file, add a reference to the quiz file:

```markdown
<!-- src/your-chapter.md -->

And now, a _quiz_:

{{#quiz ../quizzes/rust-variables.toml}}
```

Configure your `book.toml` to activate `mdbook-quiz`.
```toml
# book.toml
[preprocessor.quiz]
```

Then `mdbook build` should correctly embed the quiz.

> Note: due to limitations of mdBook (see [mdBook#1087](https://github.com/rust-lang/mdBook/issues/1087)), the `mdbook-quiz` preprocessor will copy files into your book's source directory under a subdirectory named `mdbook-quiz`. I recommend adding this directory to your `.gitignore`.

## Quiz schema

A quiz is an array of questions.

```ts
export interface Quiz {
  questions: Question[];
}
```

A question is one of a set of predefined question types.

```ts
export type Question = ShortAnswer | Tracing | MultipleChoice;
```

Each question type is an instantiation of this Typescript interface:

```ts
export interface QuestionFields<Type extends string, Prompt, Answer> {
  type: Type;
  prompt: Prompt;
  answer: Answer;
  context?: Markdown;
}
```

It has a discriminating string name `type` and then a `prompt` and `answer`, along with additional `context` for explaining the answer.

> Note that the `Markdown` type is just a string, but will be interpreted as Markdown by the quiz renderer.

Currently, mdbook-quiz supports these question types:
* [Short answer](#short-answer)
* [Multiple choice](#multiple-choice)
* [Tracing](#tracing)

<hr />

### Short answer

A question where the answer is a one-line string.

#### Example

```toml
[[questions]]
type = "ShortAnswer"
prompt.prompt = "What is the keyword for declaring a variable in Rust?"
answer.answer = "let"
context = "For example, you can write: `let x = 1`"
```

#### Interface

```ts
export interface ShortAnswerPrompt {
  /** The text of the prompt. */
  prompt: Markdown;
}

export interface ShortAnswerAnswer {
  /** The exact string that answers the question. */
  answer: string;

  /** Other acceptable strings answers. */
  alternatives?: string[];
}

export type ShortAnswer = QuestionFields<"ShortAnswer", ShortAnswerPrompt, ShortAnswerAnswer>;
```

<hr />

### Multiple choice

A question with multiple options that the user selects from.

#### Example

```toml
[[questions]]
type = "MultipleChoice"
prompt.prompt = "What does it mean if a variable `x` is immutable?"
prompt.distractors = [
  "`x` is stored in the immutable region of memory.",
  "After being defined, `x` can be changed at most once.",
  "You cannot create a reference to `x`."
]
answer.answer = "`x` cannot be changed after being assigned to a value."
context = """
Immutable means "not mutable", or not changeable.
"""
```

#### Interface

```ts
export interface MultipleChoicePrompt {
  /** The text of the prompt. */
  prompt: Markdown;

  /** An array of incorrect answers. */
  distractors: Markdown[];

  /** If defined, don't randomize distractors and put answer at this index. */
  answerIndex?: number;
}

export interface MultipleChoiceAnswer {
  /** The text of the correct answer. */
  answer: Markdown;
}
```

<hr />

### Tracing

A question where the user has to predict how a program will execute (or fail to compile).

#### Example

```toml
[[questions]]
type = "Tracing"
prompt.program = """
fn main() {
  let x = 1;
  println!("{x}");
  x += 1;
  println!("{x}");
}
"""
answer.doesCompile = false
context = """
This is a compiler error because line 4 tries to mutate `x` when `x` is not marked as `mut`.
"""
```

#### Interface

```ts
export interface TracingPrompt {
  /** The contents of the program to trace */
  program: string;
}

export interface TracingAnswer {
  /** True if the program should pass the compiler */
  doesCompile: boolean;

  /** If doesCompile=true, then the contents of stdout after running the program */
  stdout?: string;  
}

export type Tracing = QuestionFields<"Tracing", TracingPrompt, TracingAnswer>;
```

## Quiz configuration

You can configure mdbook-quiz by adding options to the `[preprocessor.quiz]` section of `book.toml`. The options are:

* `validate` (boolean): If true, then mdbook-quiz will validate your quiz TOML files using the validator.js script installed with mdbook-quiz. You must have NodeJS installed on your machine and PATH for this to work. You must also install the [spellchecker](https://www.npmjs.com/package/spellchecker) package on your NODE_PATH, e.g. via `npm i -g spellchecker`.
* `fullscreen` (boolean): If true, then a quiz will take up the web page's full screen during use.
* `cache-answers` (boolean): If true, then the user's answers will be saved in their browser's `localStorage`. Then the quiz will show the user's answers even after they reload the page.
