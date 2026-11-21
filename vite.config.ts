import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 1024 * 1024,
    sourcemap: false,
  },
  server: {
    host: '0.0.0.0',
  },
});
