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
    }
  },
};

export default {
  plugins: [rustEditorPlugin],
};
