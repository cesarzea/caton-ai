// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import sonarjs from 'eslint-plugin-sonarjs';
import {defineConfig, globalIgnores} from 'eslint/config';
import tseslint from 'typescript-eslint';

const sizeLimits = {
  'max-lines': ['error', {max: 150, skipBlankLines: true, skipComments: true}],
  'max-lines-per-function': ['error', {max: 30, skipBlankLines: true, skipComments: true}],
  'max-depth': ['error', 3],
  'max-params': ['error', 4],
  complexity: ['error', 8],
  'sonarjs/cognitive-complexity': ['error', 10],
};

const namedExportsOnly = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'ExportDefaultDeclaration',
      message: 'Use named exports (Google TypeScript Style Guide).',
    },
  ],
};

export default defineConfig([
  globalIgnores(['coverage/', 'node_modules/']),
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  {
    languageOptions: {
      parserOptions: {projectService: true, tsconfigRootDir: import.meta.dirname},
    },
    rules: {
      ...sizeLimits,
      ...namedExportsOnly,
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['*.config.{js,ts,cjs}', '.*.cjs'],
    rules: {'no-restricted-syntax': 'off'},
  },
  {
    files: ['**/*.{js,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {sourceType: 'commonjs', globals: {module: 'writable', require: 'readonly'}},
  },
  prettier,
]);
