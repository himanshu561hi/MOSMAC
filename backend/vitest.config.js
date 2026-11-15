import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    pool: 'forks',
    testTimeout: 15000,
    hookTimeout: 20000
  }
});
