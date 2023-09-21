use anyhow::Result;
use std::{fs, path::Path, process::Command};

const BINDINGS_DIR: &str = "../../js/packages/quiz/src/bindings";
const JS_DIST_DIR: &str = "../../js/packages/quiz-embed/dist";
const LOCAL_JS_DIST_DIR: &str = "./js";

fn main() -> Result<()> {
  let bindings_dir = Path::new(BINDINGS_DIR);
  if !bindings_dir.exists() {
    panic!("Must run `cargo make init-bindings`");
  }

  let js_dist_dir = Path::new(JS_DIST_DIR);
  if !js_dist_dir.exists() {
    let mut cmd = Command::new("depot");
    cmd.current_dir("../../js").arg("build");
    if cfg!(feature = "rust-editor") {
      cmd.env("RUST_EDITOR", "yes");
    }
    let status = cmd.status()?;
    if !status.success() || !js_dist_dir.exists() {
      panic!("Failed to install/build JS")
    }
  }

  println!("cargo:rerun-if-changed={JS_DIST_DIR}");
  let entries = fs::read_dir(js_dist_dir)?;
  let local_js_dist_dir = Path::new(LOCAL_JS_DIST_DIR);
  fs::create_dir_all(local_js_dist_dir)?;
  for entry in entries {
    let path = entry?.path();
    fs::copy(&path, local_js_dist_dir.join(path.file_name().unwrap()))?;
  }

  Ok(())
}
