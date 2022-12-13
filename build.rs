use std::{path::Path, process::Command};

const JS_DIST_DIR: &str = "js/packages/quiz-embed/dist";

fn main() {
  if !Path::new(JS_DIST_DIR).exists() {
    let mut cmd = Command::new("graco");
    cmd.current_dir("js").arg("prepare");
    if cfg!(feature = "rust-editor") {
      cmd.env("RUST_EDITOR", "yes");
    }
    let status = cmd.status().unwrap();
    if !status.success() {
      panic!("Failed to install/build JS")
    }
  }
}
