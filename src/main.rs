use std::{io, process};

use clap::{Parser, Subcommand};
use mdbook::{
  errors::Error,
  preprocess::{CmdPreprocessor, Preprocessor},
};
use semver::{Version, VersionReq};

use self::processor::QuizProcessor;

mod processor;

#[derive(Parser)]
#[clap(author, version, about)]
struct Args {
  #[clap(subcommand)]
  command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
  Supports { renderer: String },
}

fn main() {
  let args = Args::parse();
  let preprocessor = QuizProcessor;

  if let Some(Command::Supports { renderer }) = args.command {
    handle_supports(&preprocessor, &renderer);
  } else if let Err(e) = handle_preprocessing(&preprocessor) {
    eprintln!("{}", e);
    process::exit(1);
  }
}

fn handle_preprocessing(pre: &dyn Preprocessor) -> Result<(), Error> {
  let (ctx, book) = CmdPreprocessor::parse_input(io::stdin())?;

  let book_version = Version::parse(&ctx.mdbook_version)?;
  let version_req = VersionReq::parse(mdbook::MDBOOK_VERSION)?;

  if !version_req.matches(&book_version) {
    eprintln!(
      "Warning: The {} plugin was built against version {} of mdbook, \
             but we're being called from version {}",
      pre.name(),
      mdbook::MDBOOK_VERSION,
      ctx.mdbook_version
    );
  }

  let processed_book = pre.run(&ctx, book)?;
  serde_json::to_writer(io::stdout(), &processed_book)?;

  Ok(())
}

fn handle_supports(pre: &dyn Preprocessor, renderer: &str) -> ! {
  let supported = pre.supports_renderer(renderer);

  // Signal whether the renderer is supported by exiting with 1 or 0.
  if supported {
    process::exit(0);
  } else {
    process::exit(1);
  }
}
