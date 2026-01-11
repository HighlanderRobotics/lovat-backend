// ESLint v9 flat config
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import eslintPluginJs from '@eslint/js';

export default [
  // Ignore patterns replacing legacy .eslintignore
  {
    ignores: ['dist', 'node_modules', '.sst'],
  },
  // Base JS recommended rules
  eslintPluginJs.configs.recommended,
  // TypeScript-specific configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        project: false,
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
    },
    rules: {
      // Keep defaults reasonable; adjust as needed
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': false }],
    },
  },
  {
    files: ['sst.config.ts'],
    languageOptions: {
      globals: {
        $config: 'readonly',
      },
    },
  },
];
