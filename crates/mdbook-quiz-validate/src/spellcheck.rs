use anyhow::{anyhow, Context};
use std::{borrow::Cow, fs, path::Path, sync::OnceLock};
use zspell::{DictBuilder, Dictionary};

static DICTIONARY: OnceLock<Dictionary> = OnceLock::new();
static MORE_WORDS: OnceLock<String> = OnceLock::new();

/// Register a `.dic` file into the dictionary for spellchecking.
///
/// Will return an error if called more than once.
pub fn register_more_words(path: &Path) -> anyhow::Result<()> {
  let contents =
    fs::read_to_string(path).with_context(|| format!("Failed to read path: {}", path.display()))?;
  MORE_WORDS
    .set(contents)
    .map_err(|_| anyhow!("Attempted to register words twice"))
}

pub(crate) fn dictionary() -> &'static Dictionary {
  DICTIONARY.get_or_init(|| {
    let mut base_dict = Cow::Borrowed(include_str!("../dictionaries/en/index.dic"));

    if let Some(more_words) = MORE_WORDS.get() {
      base_dict.to_mut().push_str(more_words);
    }

    DictBuilder::new()
      .config_str(include_str!("../dictionaries/en/index.aff"))
      .dict_str(&base_dict)
      .build()
      .expect("failed to build dictionary!")
  })
}
