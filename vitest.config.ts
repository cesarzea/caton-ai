import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['{packages,plugins}/*/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['{packages,plugins}/*/src/**/*.ts'],
      exclude: ['packages/*/src/main.ts'],
      thresholds: {lines: 90, functions: 90, branches: 90, statements: 90},
    },
  },
});
