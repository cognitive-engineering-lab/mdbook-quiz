/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // this preset is necessary to import ESM-format JS files
  // from the current module's dist directory
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  testTimeout: 15000,
  roots: ['<rootDir>/tests']
};
