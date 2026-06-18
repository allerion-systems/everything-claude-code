import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { brainApi } from './vite-plugin-brain.mjs';

export default defineConfig({
  plugins: [react(), brainApi()],
  server: { port: 5180, open: true },
});
