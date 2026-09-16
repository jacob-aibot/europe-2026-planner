import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * `packages/*` are consumed as TypeScript source, not as built artifacts — the same files
 * `node --test` runs. That keeps one definition of a trip across web, tests and the CLI.
 */
export default defineConfig({
  base: './',
  plugins: [
    {
      // The generated loader uses standards-correct JSON import attributes for Node. Vite
      // turns JSON into JavaScript modules, so leaving the attribute in the browser makes the
      // browser reject the transformed response as the wrong MIME type.
      name: 'cairn-gazetteer-json',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('gazetteerShards.gen.ts')) return null;
        return { code: code.replaceAll(", { with: { type: 'json' } }", ''), map: null };
      },
    },
    react(),
  ],
  resolve: {
    alias: [
      { find: '@cairn/core/gazetteer', replacement: resolve(import.meta.dirname, '../../packages/core/src/geo/gazetteerShards.gen.ts') },
      { find: '@cairn/core', replacement: resolve(import.meta.dirname, '../../packages/core/src/index.ts') },
      { find: '@cairn/client', replacement: resolve(import.meta.dirname, '../../packages/client/src/index.ts') },
      { find: '@cairn/tokens', replacement: resolve(import.meta.dirname, '../../packages/tokens/src/index.ts') },
    ],
  },
  server: { port: 5173, host: true, fs: { allow: [resolve(import.meta.dirname, '../..')] } },
  // Keep the phone preview on one origin: local profile and trip storage are origin-scoped.
  preview: { port: 5175, host: '0.0.0.0', strictPort: true },
  build: { outDir: 'dist', sourcemap: true },
});
