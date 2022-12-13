module.exports = {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  testTimeout: 15000,
  rootDir: "tests",
  forceExit: true, // hack for http.Server shutdown issue
};
