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

Add the `mdbook-quiz/js/dist` JS package to your mdBook repository. For example, like this:

```bash
ln -s path/to/mdbook-quiz/js/dist mdbook-quiz
```

Configure your `book.toml` to activate `mdbook-quiz`. You will need to set `js-dir` to wherever you put the `mdbook-quiz` directory.

```toml
# book.toml
[preprocessor.quiz]
js-dir = "mdbook-quiz"
```

Then `mdbook build` should correctly embed the quiz.

## Quiz schema

A quiz is a list of questions, and each question must be a pre-defined question type. See `mdbook/js/lib/questions` for the set of questions. Feel free to add your own!
