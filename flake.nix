{
  description = "mdbook-quiz flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
    depot-js.url = "github:cognitive-engineering-lab/depot?rev=3676b134767aba6a951ed5fdaa9e037255921475";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      rust-overlay,
      depot-js,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        meta = (builtins.fromTOML (builtins.readFile (./crates/mdbook-quiz/Cargo.toml))).package;
        inherit (meta) name version;

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" ];
        };

        rustPlatform = pkgs.makeRustPlatform {
          cargo = rustToolchain;
          rustc = rustToolchain;
        };

        depotjs = depot-js.packages.${system}.default;
        pnpm = pkgs.pnpm_9;
        nodejs = pkgs.nodejs_22;

        buildQuiz =
          {
            enableRustEditor ? true,
            enableSourceMap ? true,
            enableAquascope ? false,
          }:
          rustPlatform.buildRustPackage rec {
            pname = name;
            src = pkgs.lib.cleanSource ./.;
            inherit version;

            buildFeatures =
              pkgs.lib.optional enableRustEditor "rust-editor"
              ++ pkgs.lib.optional enableSourceMap "source-map"
              ++ pkgs.lib.optional enableAquascope "aquascope";

            cargoBuildFlags = [
              "--features"
              (builtins.concatStringsSep "," buildFeatures)
            ];

            nativeBuildInputs = [
              pnpm
              nodejs
              depotjs
              pkgs.cacert
            ];

            cargoHash = "sha256-pDWTvJKz1W41Y/ck+GBE6vaBc45l2Ut7nPwl/oYAknw=";

            pnpmDeps = pnpm.fetchDeps {
              inherit pname version;
              src = pkgs.lib.cleanSource ./js;
              fetcherVersion = 2;
              hash = "sha256-xbctcU8vXWeYF/50iDRpa6SGST9fttL1yGJrkbf9NuI=";
            };

            preBuild = ''
              export NPM_CONFIG_OFFLINE=true
              export PNPM_WRITABLE_STORE=$(mktemp -d)

              # Copy pnpm deps to writable store
              cp -LR ${pnpmDeps}/* $PNPM_WRITABLE_STORE/ || true
              export npm_config_store_dir=$PNPM_WRITABLE_STORE

              # Generate TS bindings
              cargo test -p mdbook-quiz-schema --locked export_bindings --features ts
              mkdir -p js/packages/quiz/src/bindings
              cp crates/mdbook-quiz-schema/bindings/* js/packages/quiz/src/bindings

              # Build JS so that the build.rs won't
              cd js
              pnpm install --offline --frozen-lockfile --ignore-scripts
              chmod -R +w node_modules
              ${pkgs.lib.optionalString enableRustEditor "export RUST_EDITOR=yes"}
              depot build --release
              cd ..
            '';
          };
      in
      {
        packages.default = pkgs.lib.makeOverridable buildQuiz { };
      }
    );
}
