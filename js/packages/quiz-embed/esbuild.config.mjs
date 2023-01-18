import fs from "fs";
import _ from "lodash";
import { createRequire } from "module";
import path from "path";

let baseUrl = !process.argv.includes("-w")
  ? "https://rust-book.cs.brown.edu/"
  : "http://localhost:3000/";

let peerfixPlugin = ({ modules, meta }) => ({
  name: "peerfix",
  setup(build) {
    let require = createRequire(meta.url);
    modules = modules.filter(
      m => !(build.initialOptions.external || []).includes(m)
    );
    if (modules.length == 0) return;

    let filter = new RegExp(
      modules.map(k => `(^${_.escapeRegExp(k)}$)`).join("|")
    );
    build.onResolve({ filter }, args => {
      let resolved = require.resolve(args.path);
      return { path: resolved };
    });
  },
});

let rustEditorPlugin = {
  name: "rust-editor",
  setup(build) {
    if (process.env.RUST_EDITOR === undefined) {
      build.onResolve({ filter: /@wcrichto\/rust-editor/ }, args => ({
        path: args.path,
        namespace: "rust-editor",
      }));
      build.onLoad({ filter: /.*/, namespace: "rust-editor" }, () => ({
        contents: "module.exports = {}",
      }));
    } else {
      build.onEnd(() => {
        let files = ["editor.worker.js", "ra-worker.js", "wasm_demo_bg.wasm"];
        files.forEach(f =>
          fs.copyFileSync(
            path.join("node_modules/@wcrichto/rust-editor/dist", f),
            path.join("dist", f)
          )
        );

        ["ra-worker"].forEach(name => {
          let assetPath = path.join("dist", `${name}.js`);
          let contents = fs.readFileSync(assetPath, "utf-8");
          contents = contents.replace(
            /import\.meta\.url/g,
            JSON.stringify(baseUrl + "quiz/")
          );
          fs.writeFileSync(assetPath, contents);
        });
      });
    }
  },
};

export default {
  format: "iife",
  plugins: [
    rustEditorPlugin,
    peerfixPlugin({ modules: ["react"], meta: import.meta }),
  ],
};
