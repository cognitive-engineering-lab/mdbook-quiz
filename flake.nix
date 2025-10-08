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

        mdbook-quiz = pkgs.stdenv.mkDerivation (finalAttrs: {
          pname = name;
          inherit version;
          nativeBuildInputs = [ 
            pnpm nodejs depotjs 
            pkgs.cacert pkgs.just 
            pkgs.rust-bin.stable.latest.default
          ];

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

          src = pkgs.fetchFromGitHub {
            owner = "cognitive-engineering-lab";
            repo = name;
            rev = "e3ceded46e3cd7a51a3457381ddbc694a2cda430";
            hash = "sha256-ngqOKdWTfAz1h1qzBTZCLHK5jhOgAmGnb6cEF3QLfCc=";
          };

          buildPhase = ''
            just init-bindings
            cargo build --release --locked --features rust-editor --features source-map
          '';

          installPhase = ''
            mkdir -p $out/bin
            cp target/release/${name} $out/bin/
          '';

          #cargoHash = "sha256-pDWTvJKz1W41Y/ck+GBE6vaBc45l2Ut7nPwl/oYAknw=";
        });

      in {
        packages.default = mdbook-quiz;
      });
}
