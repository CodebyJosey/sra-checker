import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Vitest config — focus op de pure domain- en infra-laag.
 * UI-tests zijn niet in scope; voor de case is unit-coverage van de
 * waardevollere lagen (validatie, mappers, math) genoeg.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
