module.exports = {
    setupFiles: ["<rootDir>/jest.env.js"],
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    collectCoverage: true,
    coverageReporters: ["json-summary", "text"],
    testEnvironment: "node", moduleNameMapper: {
        '^.*/routes/decodeBody$': '<rootDir>/src/routes/__mocks__/decodeBody.js'
    },
    collectCoverageFrom: [
        "src/**/*.js",
        "!src/metrics.js",
        "!src/index.js",
        "!src/init.js",
        "!src/logger.js",
        "!src/generateMetricData.js"
    ]
};
