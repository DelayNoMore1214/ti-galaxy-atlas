import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'esnext',
    minify: false,
    cssMinify: false,
    cssCodeSplit: false,
    emptyOutDir: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 8000,
    reportCompressedSize: false,
  },
});
