# mdbook-quiz: interactive quizzes for your tutorials

This repository provides an [mdBook](https://github.com/rust-lang/mdBook) [preprocessor](https://rust-lang.github.io/mdBook/format/configuration/preprocessors.html) that allows you to add interactive quizzes to your tutorials.

**This tool is a research prototype under heavy development, all details may be outdated. The code is the only real source of truth.**

## Installation

You need Cargo and pnpm installed. Then run:

```
git clone https://github.com/willcrichton/mdbook-quiz
cd mdbook-quiz
cargo install --path .
cd js
pnpm install
pnpm build
```

## Usage

First, create a quiz file. Quizzes are encoded as TOML files, such as:

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

> Note: due to limitations of mdBook (see mdBook#1087), the `mdbook-quiz` preprocessor will copy files into your book's source directory under a subdirectory named `mdbook-quiz`. I recommend adding this directory to your `.gitignore`.

## Quiz schema

A quiz is a list of questions, and each question must be a pre-defined question type. See `mdbook/js/lib/questions` for the set of questions. Feel free to add your own!
