{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
    depot-js.url = "github:cognitive-engineering-lab/depot?rev=3676b134767aba6a951ed5fdaa9e037255921475";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, depot-js }:
    flake-utils.lib.eachDefaultSystem (system:
      let 
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; }; 

        meta = (builtins.fromTOML (builtins.readFile (./crates/mdbook-quiz/Cargo.toml))).package;
        inherit (meta) name version;

        depotjs = depot-js.packages.${system}.default;

        pnpm = pkgs.pnpm_9;
        nodejs = pkgs.nodejs_22;

        src = pkgs.fetchFromGitHub {
          owner = "cognitive-engineering-lab";
          repo = name;
          rev = "e3ceded46e3cd7a51a3457381ddbc694a2cda430";
          hash = "sha256-ngqOKdWTfAz1h1qzBTZCLHK5jhOgAmGnb6cEF3QLfCc=";
        };

        mdbook-quiz = pkgs.rustPlatform.buildRustPackage (finalAttrs: rec {
          pname = name;
          inherit version src;
          nativeBuildInputs = [ 
            pnpm nodejs depotjs
            pkgs.cacert pkgs.just 
          ];
          cargoHash = "sha256-pDWTvJKz1W41Y/ck+GBE6vaBc45l2Ut7nPwl/oYAknw=";
          cargoBuildFlags = [ "--features" "rust-editor,source-map" ];

          env = { 
            CARGO_HOME="${placeholder "out"}/.cargo"; 
          };

          pnpmRoot = "js";
          pnpmWorkspaces = [ "@wcrichto/quiz" "@wcrichto/quiz-embed" ];
          pnpmDeps = pnpm.fetchDeps {
            inherit (finalAttrs) pname version src pnpmWorkspaces;
            fetcherVersion = 2;
            hash = "sha256-xbctcU8vXWeYF/50iDRpa6SGST9fttL1yGJrkbf9NuI=";
            sourceRoot = "${finalAttrs.src.name}/js";
          };

          preBuild = ''
            export PNPM_WRITABLE_STORE=$(mktemp -d)
            cp -r ${pnpmDeps}/.* $PNPM_WRITABLE_STORE/ || true
            export npm_config_store_dir=$PNPM_WRITABLE_STORE
            just init-bindings
          '';

          installPhase = ''
            mkdir -p $out/bin
            cp target/release/${name} $out/bin/
          '';
        });

      in {
        packages.default = mdbook-quiz;
      });
}
