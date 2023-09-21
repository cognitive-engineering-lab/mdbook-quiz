fn main() {
  #[cfg(feature = "json-schema")]
  {
    use mdbook_quiz_schema::Quiz;
    use schemars::schema_for;

    let schema = schema_for!(Quiz);
    println!("{}", serde_json::to_string_pretty(&schema).unwrap());
  }

  #[cfg(not(feature = "json-schema"))]
  {
    panic!("Must run with --feature json-schema")
  }
}
