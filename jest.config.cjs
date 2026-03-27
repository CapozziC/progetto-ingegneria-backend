/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",

  extensionsToTreatAsEsm: [".ts"],

  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  roots: ["<rootDir>/src", "<rootDir>/test"],

  testMatch: ["**/*.test.ts", "**/*.spec.ts"],

  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  coverageReporters: ["text", "lcov"],

  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/migrations/**",
    "!src/**/index.ts",
  ],

  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
  ],
};