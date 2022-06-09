import { cli, copyPlugin } from "@nota-lang/esbuild-utils";
import { sassPlugin } from "esbuild-sass-plugin";

let build = cli();
build({
  format: "iife",
  bundle: true,
  plugins: [copyPlugin({ extensions: [".html"] }), sassPlugin()],
});
