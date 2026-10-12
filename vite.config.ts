import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// RON_PROFILE=1 builds an unminified React profiling bundle into dist-profile for
// render attribution (performance/renders.spec.ts). Normal builds are unchanged.
const profile = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.RON_PROFILE === '1';

export default defineConfig({
  plugins: [react()],
  // StackBlitz/WebContainer can occasionally trap inside Vite 8's Oxc WASM
  // transformer for this JS-compatible hook during dev pre-transform.
  // The file contains no TS-only syntax, so serving it without Oxc is safe.
  oxc: {
    exclude: /src\/engine\/useAutosave\.ts$/,
  },
  ...(profile ? {
    resolve: { alias: [{ find: /^react-dom\/client$/, replacement: 'react-dom/profiling' }] },
    build: { outDir: 'dist-profile', minify: false },
  } : {}),
});
