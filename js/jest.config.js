module.exports = {
  transform: {
    "^.+\\.m?(j|t)sx?$": [
      "esbuild-jest",
      { sourcemap: true, loaders: { ".mjs": "js" } },
    ],
  },
  transformIgnorePatterns: [],
  setupFiles: ["./tests/setup-globals.js"],
};
