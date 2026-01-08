use std::{
  env, fs,
  io::{self, Write as IoWrite},
  marker::PhantomData,
  ops::Range,
  path::{Path, PathBuf},
  process,
};

use anyhow::Result;
use chrono::Local;
use clap::{Command, CommandFactory, arg};
use env_logger::Builder;
use log::LevelFilter;
use mdbook_preprocessor::{MDBOOK_VERSION, Preprocessor, PreprocessorContext, book::Book};
use rayon::prelude::*;
use semver::{Version, VersionReq};

use super::Asset;

/// Simplified trait for implementing mdBook preprocessors
pub trait SimplePreprocessor: Sized + Send + Sync {
  type Args: CommandFactory;

  /// The name of the preprocessor
  fn name() -> &'static str;

  /// Build the preprocessor from the context
  fn build(ctx: &PreprocessorContext) -> Result<Self>;

  /// Find and generate replacements for the content
  fn replacements(&self, chapter_dir: &Path, content: &str) -> Result<Vec<(Range<usize>, String)>>;

  /// Assets to link in the HTML output
  fn linked_assets(&self) -> Vec<Asset>;

  /// All assets to copy to the book directory
  fn all_assets(&self) -> Vec<Asset>;

  /// Called after processing is complete
  fn finish(self) {}
}

struct SimplePreprocessorDriverCtxt<P: SimplePreprocessor> {
  sp: P,
  src_dir: PathBuf,
}

impl<P: SimplePreprocessor> SimplePreprocessorDriverCtxt<P> {
  fn copy_assets(&self) -> Result<()> {
    // Rather than copying directly to the build directory, we instead copy to the book source
    // since mdBook will clean the build-dir after preprocessing. See mdBook#1087 for more.
    let dst_dir = self.src_dir.join(P::name());
    fs::create_dir_all(&dst_dir)?;

    for asset in self.sp.all_assets() {
      fs::write(dst_dir.join(asset.name), asset.contents)?;
    }

    Ok(())
  }

  fn process_chapter(&self, chapter_dir: &Path, content: &mut String) -> Result<()> {
    let mut replacements = self.sp.replacements(chapter_dir, content)?;
    if !replacements.is_empty() {
      replacements.sort_by_key(|(range, _)| range.start);

      for (range, html) in replacements.into_iter().rev() {
        content.replace_range(range, &html);
      }

      // If a chapter is located at foo/bar/the_chapter.md, then the generated source files
      // will be at foo/bar/the_chapter.html. So they need to reference preprocessor files
      // at ../../<preprocessor>/embed.js, i.e. we generate the right number of "..".
      let chapter_rel_path = chapter_dir.strip_prefix(&self.src_dir).unwrap();
      let depth = chapter_rel_path.components().count();
      let prefix = vec![".."; depth].into_iter().collect::<PathBuf>();

      // Ensure there's space between existing markdown and inserted HTML
      content.push_str("\n\n");

      for asset in self.sp.linked_assets() {
        let asset_rel = prefix.join(P::name()).join(asset.name);
        let asset_str = asset_rel.display().to_string();
        let link = match &*asset_rel.extension().unwrap().to_string_lossy() {
          "js" => format!(r#"<script type="text/javascript" src="{asset_str}"></script>"#),
          "mjs" => format!(r#"<script type="module" src="{asset_str}"></script>"#),
          "css" => format!(r#"<link rel="stylesheet" type="text/css" href="{asset_str}">"#),
          _ => continue,
        };
        content.push_str(&link);
      }
    }
    Ok(())
  }
}

pub(crate) struct SimplePreprocessorDriver<P: SimplePreprocessor>(PhantomData<P>);

impl<P: SimplePreprocessor> SimplePreprocessorDriver<P> {
  pub fn new() -> Self {
    SimplePreprocessorDriver(PhantomData)
  }
}

impl<P: SimplePreprocessor> Preprocessor for SimplePreprocessorDriver<P> {
  fn name(&self) -> &str {
    P::name()
  }

  fn run(&self, ctx: &PreprocessorContext, mut book: Book) -> Result<Book> {
    let src_dir = ctx.root.join(&ctx.config.book.src);
    let sp = P::build(ctx)?;
    let ctxt = SimplePreprocessorDriverCtxt { sp, src_dir };
    ctxt.copy_assets()?;

    fn for_each_mut<'a, P: SimplePreprocessor>(
      ctxt: &SimplePreprocessorDriverCtxt<P>,
      chapters: &mut Vec<(PathBuf, &'a mut String)>,
      items: impl IntoIterator<Item = &'a mut mdbook_preprocessor::book::BookItem>,
    ) {
      for item in items {
        if let mdbook_preprocessor::book::BookItem::Chapter(chapter) = item
          && chapter.path.is_some()
        {
          let chapter_path_abs = ctxt.src_dir.join(chapter.path.as_ref().unwrap());
          let chapter_dir = chapter_path_abs.parent().unwrap().to_path_buf();
          chapters.push((chapter_dir, &mut chapter.content));

          for_each_mut(ctxt, chapters, &mut chapter.sub_items);
        }
      }
    }

    let mut chapters = Vec::new();
    for_each_mut(&ctxt, &mut chapters, &mut book.items);

    chapters
      .into_par_iter()
      .map(|(chapter_dir, content)| ctxt.process_chapter(&chapter_dir, content))
      .collect::<Result<Vec<_>>>()?;

    ctxt.sp.finish();

    Ok(book)
  }

  fn supports_renderer(&self, _renderer: &str) -> Result<bool> {
    Ok(true)
  }
}

// This is copied verbatim from mdbook so the style is consistent.
fn init_logger() {
  let mut builder = Builder::new();

  builder.format(|formatter, record| {
    writeln!(
      formatter,
      "{} [{}] ({}): {}",
      Local::now().format("%Y-%m-%d %H:%M:%S"),
      record.level(),
      record.target(),
      record.args()
    )
  });

  if let Ok(var) = env::var("RUST_LOG") {
    builder.parse_filters(&var);
  } else {
    // if no RUST_LOG provided, default to logging at the Info level
    builder.filter(None, LevelFilter::Info);
    // Filter extraneous html5ever not-implemented messages
    builder.filter(Some("html5ever"), LevelFilter::Error);
  }

  builder.init();
}

fn handle_preprocessing(pre: &dyn Preprocessor) -> Result<()> {
  let (ctx, book) = mdbook_preprocessor::parse_input(io::stdin())?;

  let book_version = Version::parse(&ctx.mdbook_version)?;
  let version_req = VersionReq::parse(MDBOOK_VERSION)?;

  if !version_req.matches(&book_version) {
    eprintln!(
      "Warning: The {} plugin was built against version {} of mdbook, \
             but we're being called from version {}",
      pre.name(),
      MDBOOK_VERSION,
      ctx.mdbook_version
    );
  }

  let processed_book = pre.run(&ctx, book)?;
  serde_json::to_writer(io::stdout(), &processed_book)?;

  Ok(())
}

fn handle_supports(pre: &dyn Preprocessor, renderer: &str) {
  match pre.supports_renderer(renderer) {
    Ok(true) => process::exit(0),
    Ok(false) | Err(_) => process::exit(1),
  }
}

/// Main entry point for a SimplePreprocessor
pub fn main<P: SimplePreprocessor>() {
  init_logger();

  let args = P::Args::command()
    .subcommand(Command::new("supports").arg(arg!(<renderer> "Checks if renderer is supported")))
    .get_matches();

  let preprocessor = SimplePreprocessorDriver::<P>::new();

  match args.subcommand() {
    Some(("supports", m)) => {
      let renderer = m.get_one::<String>("renderer").unwrap();
      handle_supports(&preprocessor, renderer);
    }
    _ => {
      if let Err(e) = handle_preprocessing(&preprocessor) {
        eprintln!("{}", e);
        process::exit(1);
      }
    }
  }
}
