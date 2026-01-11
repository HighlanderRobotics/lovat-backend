/* eslint-env node */
module.exports = {
  root: true,
  env: {
    es2023: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: false,
    sourceType: "module",
    ecmaVersion: 2023,
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    // Keep defaults reasonable; adjust as needed
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/ban-ts-comment": [
      "warn",
      { "ts-expect-error": "allow" },
    ],
  },
};
