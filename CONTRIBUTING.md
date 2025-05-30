# Contributing to mdbook-quiz

Thanks for your interest in contributing to mdbook-quiz! To get started, follow the "From Source" installation instructions in the README. Then from the root of the repository, run:

```
just watch
```

This will build the Rust mdBook preprocessor, and rebuild it when Rust source files are changed. Then in another terminal, run:

```
cd js
depot build -w
```

This will build the Javascript package, and rebuild it when Javascript source files are changed.

To test out your changes, you can build the provided sample quiz by running:

```
cd example
mdbook serve --open
```