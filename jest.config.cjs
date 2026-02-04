module.exports = {
  setupFiles: ["./jest.setup.js"],
  globalTeardown: "./jest.teardown.js",
  collectCoverage: true,
  coverageReporters: ["json-summary", "text"],
};
