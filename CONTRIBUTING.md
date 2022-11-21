# Contributing to mdbook-quiz

Thanks for your interest in contributing to mdbook-quiz! To get started, you'll want to install [cargo-make](https://github.com/sagiegurari/cargo-make) and [pnpm](https://pnpm.io/installation). Then from the root of the repository, run:

```
cargo make watch
```

This will build both the mdBook preprocessor (in Rust) and the mdbook-quiz frontend plugin (in Javascript), as well as automatically rebuild both when source files are edited.

To test out your changes, you can build the provided sample quiz by running:

```
cd example
mdbook build --open
```