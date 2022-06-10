import { cli, copyPlugin } from "@nota-lang/esbuild-utils";
import { sassPlugin } from "esbuild-sass-plugin";

let build = cli();
build({
  format: "iife",
  bundle: true,
  entryPoints: ['lib/index.tsx', 'lib/consent.tsx'],
  plugins: [copyPlugin({ extensions: [".html"] }), sassPlugin()],
});
