use mdbook_quiz_schema::Quiz;
use schemars::schema_for;

fn main() {
  let schema = schema_for!(Quiz);
  println!("{}", serde_json::to_string_pretty(&schema).unwrap());
}
