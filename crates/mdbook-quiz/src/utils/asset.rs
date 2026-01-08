/// Represents a static asset bundled with the preprocessor
#[derive(Copy, Clone)]
pub struct Asset {
  pub name: &'static str,
  pub contents: &'static [u8],
}

/// Macro to generate an asset generator macro
/// Usage: asset_generator!("../js/") creates a make_asset! macro
#[macro_export]
macro_rules! asset_generator {
  ($base:expr) => {
    macro_rules! make_asset {
      ($name:expr) => {
        $crate::utils::Asset {
          name: $name,
          contents: include_bytes!(concat!($base, $name)),
        }
      };
    }
  };
}

// Re-export for use in other modules
pub use asset_generator;
