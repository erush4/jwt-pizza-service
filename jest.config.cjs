module.exports = {
  setupFiles: ["<rootDir>/jest.env.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  collectCoverage: true,
  coverageReporters: ["json-summary", "text"],
  testEnvironment: "node",
};
