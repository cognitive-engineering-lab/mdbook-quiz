use anyhow::{Error, Result};
use std::{fs, io::ErrorKind, path::Path, process::Command};

const BINDINGS_DIR: &str = "../../js/packages/quiz/src/bindings";
const JS_DIST_DIR: &str = "../../js/packages/quiz-embed/dist";
const LOCAL_JS_DIST_DIR: &str = "./js";

fn copy_assets(src_dir: impl AsRef<Path>, dst_dir: impl AsRef<Path>) -> Result<()> {
  let src_dir = src_dir.as_ref();
  let dst_dir = dst_dir.as_ref();

  println!("cargo:rerun-if-changed={}", src_dir.display());
  fs::create_dir_all(dst_dir)?;

  let src_entries = match fs::read_dir(src_dir) {
    Ok(src_entries) => src_entries,
    Err(err) => match err.kind() {
      ErrorKind::NotFound => return Ok(()),
      _ => return Err(Error::new(err)),
    },
  };

  for entry in src_entries {
    let path = entry?.path();
    fs::copy(&path, dst_dir.join(path.file_name().unwrap()))?;
  }

  Ok(())
}

fn main() -> Result<()> {
  let bindings_dir = Path::new(BINDINGS_DIR);
  if !bindings_dir.exists() {
    eprintln!(
      "Warning: TypeScript bindings not found. Run `just init-bindings` or `cargo test -p mdbook-quiz-schema --features ts export_bindings`"
    );
    eprintln!("Continuing anyway - JS assets may not be up to date");
  }

  let js_dist_dir = Path::new(JS_DIST_DIR);
  if !js_dist_dir.exists() {
    eprintln!(
      "Warning: JS distribution files not found at {}",
      JS_DIST_DIR
    );
    eprintln!("Attempting to build JS with depot...");

    let mut cmd = Command::new("depot");
    cmd.current_dir("../../js").arg("build").arg("--release");
    if cfg!(feature = "rust-editor") {
      cmd.env("RUST_EDITOR", "yes");
    }

    match cmd.status() {
      Ok(status) if status.success() && js_dist_dir.exists() => {
        println!("Successfully built JS assets");
      }
      _ => {
        eprintln!("Warning: Failed to build JS assets with depot");
        eprintln!("This is expected if you don't have depot installed");
        eprintln!("The preprocessor will still compile but JS assets won't be embedded");
        // Create empty dist directory to avoid errors
        fs::create_dir_all(js_dist_dir)?;
      }
    }
  }

  copy_assets(JS_DIST_DIR, LOCAL_JS_DIST_DIR)?;

  Ok(())
}
