import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // StackBlitz/WebContainer can occasionally trap inside Vite 8's Oxc WASM
  // transformer for this JS-compatible hook during dev pre-transform.
  // The file contains no TS-only syntax, so serving it without Oxc is safe.
  oxc: {
    exclude: /src\/engine\/useAutosave\.ts$/,
  },
});
