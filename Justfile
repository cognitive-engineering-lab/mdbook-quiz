install: init-bindings
  cargo install --path crates/mdbook-quiz --features rust-editor --features aquascope --locked

watch:
  cargo watch -x 'install --path crates/mdbook-quiz --debug --offline --features rust-editor --features source-map' -w crates -w js/packages/quiz-embed/dist --ignore-nothing

clean:
  cargo clean
  cd js && depot clean && cd ..
  rm -rf js/packages/quiz/src/bindings crates/mdbook-quiz-schema/bindings

init-bindings:
  cargo test -p mdbook-quiz-schema --locked export_bindings --features ts
  mkdir -p js/packages/quiz/src/bindings
  cp crates/mdbook-quiz-schema/bindings/* js/packages/quiz/src/bindings

precommit-cargo:
  cargo fmt && cargo clippy

precommit-js:
  cd js && depot fmt

precommit: precommit-js precommit-cargo


