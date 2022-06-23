use std::{path::Path, process::Command};

const JS_DIST_DIR: &str = "js/dist";

fn main() {
  if !Path::new(JS_DIST_DIR).exists() {
    let status = Command::new("pnpm")
      .current_dir("js")
      .arg("install")
      .status()
      .unwrap();
    if !status.success() {
      panic!("Failed to install JS deps")
    }

    let status = Command::new("pnpm")
      .current_dir("js")
      .arg("build")
      .status()
      .unwrap();
    if !status.success() {
      panic!("Failed to build JS");
    }
  }
}
