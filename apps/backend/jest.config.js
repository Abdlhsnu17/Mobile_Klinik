/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@sistem-klinik/config$": "<rootDir>/../../packages/config/src/index.ts",
    "^@sistem-klinik/database$": "<rootDir>/../../packages/database/src/index.ts",
    "^@sistem-klinik/types$": "<rootDir>/../../packages/types/index.ts",
    "^@sistem-klinik/utils$": "<rootDir>/../../packages/utils/index.ts",
  },
  clearMocks: true,
}
