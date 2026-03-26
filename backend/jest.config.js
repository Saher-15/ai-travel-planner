export default {
  testEnvironment: "node",
  testEnvironmentOptions: {
    env: {
      OPENAI_API_KEY: "test-key",
      JWT_ACCESS_SECRET: "test-secret",
      APP_URL: "http://localhost:5173",
    },
  },
  transform: {},
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/__tests__/**/*.test.js", "**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
    "!src/config.js",
    "!src/db.js",
  ],
  coverageReporters: ["text", "lcov"],
  testTimeout: 30000,
};
