import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['main.js', 'node_modules/**', 'tests/e2e/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        rules: {
            // The plugin must run on iOS/iPadOS: no Node or Electron APIs.
            'no-restricted-imports': ['error', { patterns: ['node:*', 'fs', 'path', 'electron', 'child_process', 'os'] }]
        }
    }
);
