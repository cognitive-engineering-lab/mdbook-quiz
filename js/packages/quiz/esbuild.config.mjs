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
      return;
    }

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
          `"http://localhost:3000/mdbook-quiz/"`
        );
        fs.writeFileSync(assetPath, contents);
      });
    });
  },
};

export default {
  plugins: [rustEditorPlugin],
};
