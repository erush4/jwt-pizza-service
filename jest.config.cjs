module.exports = {
  setupFiles: ["<rootDir>/jest.setup.js"],
  globalTeardown: "<rootDir>/jest.teardown.js",
  collectCoverage: true,
  coverageReporters: ["json-summary", "text"],
  testEnvironment: "node",
};
