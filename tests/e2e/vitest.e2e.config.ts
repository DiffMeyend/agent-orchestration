import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const root = resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@slate/context-schema': resolve(root, 'libs/context-schema/src/index.ts'),
      '@slate/orchestration': resolve(root, 'libs/orchestration/src/index.ts'),
      '@slate/context-loader': resolve(root, 'libs/context-loader/src/index.ts'),
      '@slate/basis': resolve(root, 'engines/basis/src/index.ts'),
      '@slate/mind': resolve(root, 'engines/mind/src/index.ts'),
      '@slate/polymath': resolve(root, 'agents/polymath/src/index.ts'),
      '@slate/executor': resolve(root, 'agents/executor/src/index.ts'),
      '@slate/horizon': resolve(root, 'agents/horizon/src/index.ts'),
      '@slate/resonant': resolve(root, 'agents/resonant/src/index.ts'),
      '@slate/architect': resolve(root, 'agents/architect/src/index.ts'),
      '@slate/alchemist': resolve(root, 'agents/alchemist/src/index.ts')
    }
  },
  test: {
    include: ['tests/e2e/**/*.e2e.spec.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 10000,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['libs/**/*.ts', 'agents/**/*.ts', 'engines/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.test.ts', '**/index.ts']
    }
  }
});
