import pluginJs from '@eslint/js'
import prettier from 'eslint-plugin-prettier'
import securityPlugin from 'eslint-plugin-security'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unicornPlugin from 'eslint-plugin-unicorn'
import globals from 'globals'
import tsPlugin from 'typescript-eslint'

export default [
  securityPlugin.configs.recommended,
  {
    files: ['**/*.ts'],
  },
  {
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      'no-restricted-syntax': ['off', 'ForOfStatement'],
      'no-console': ['error'],
      'prefer-template': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  },
  {
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': [
        1,
        {
          arrowParens: 'avoid',
          bracketSpacing: true,
          endOfLine: 'lf',
          htmlWhitespaceSensitivity: 'css',
          printWidth: 140,
          quoteProps: 'as-needed',
          semi: false,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'all',
          useTabs: false,
        },
      ],
    },
  },
  {
    plugins: {
      unicorn: unicornPlugin,
    },
    rules: {
      'unicorn/empty-brace-spaces': 'off',
      'unicorn/no-null': 'off',
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
  },
  pluginJs.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    ignores: [
      'node_modules/',
      'node_modules',
      'package-lock.json',
      'bun.lock',
      '.serverless',
      'shared',
      'coverage',
      'apidoc',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      '.tmp',
      '.npm',
      '*.swp',
      '.idea',
      '.vscode',
      '.DS_Store',
      'tmp',
      '.build/',
      '.build',
    ],
  },
]
