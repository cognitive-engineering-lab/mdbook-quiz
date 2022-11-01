module.exports = {
  transform: {
    "^.+\\.m?(j|t)sx?$": [
      "esbuild-jest",
      { sourcemap: true, loaders: { ".mjs": "js" } },
    ],
  },
  forceExit: true, // hack for http.Server shutdown issue
  transformIgnorePatterns: [],
};
