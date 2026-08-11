import tseslint from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"

const browserGlobals = {
  Blob: "readonly",
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  File: "readonly",
  FormData: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  window: "readonly",
}

const nodeGlobals = {
  Buffer: "readonly",
  __dirname: "readonly",
  console: "readonly",
  fetch: "readonly",
  module: "readonly",
  process: "readonly",
  require: "readonly",
  setTimeout: "readonly",
}

export default [
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.d.ts",
      "apps/backend/uploads/**",
    ],
  },
  {
    files: ["apps/backend/**/*.ts", "apps/frontend/**/*.{ts,tsx}", "packages/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]
