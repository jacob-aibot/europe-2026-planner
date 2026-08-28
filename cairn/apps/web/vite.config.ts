import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * `packages/*` are consumed as TypeScript source, not as built artifacts — the same files
 * `node --test` runs. That keeps one definition of a trip across web, tests and the CLI.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@cairn/core': resolve(import.meta.dirname, '../../packages/core/src/index.ts'),
      '@cairn/client': resolve(import.meta.dirname, '../../packages/client/src/index.ts'),
      '@cairn/tokens': resolve(import.meta.dirname, '../../packages/tokens/src/index.ts'),
    },
  },
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: true },
});
