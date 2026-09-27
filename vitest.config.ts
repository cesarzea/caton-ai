import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['{packages,plugins}/*/test/**/*.test.ts'],
          exclude: ['packages/web/**', '**/node_modules/**'],
        },
      },
      'packages/web/vite.config.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['{packages,plugins}/*/src/**/*.{ts,tsx}'],
      exclude: ['packages/*/src/main.{ts,tsx}'],
      thresholds: {lines: 90, functions: 90, branches: 90, statements: 90},
    },
  },
});
