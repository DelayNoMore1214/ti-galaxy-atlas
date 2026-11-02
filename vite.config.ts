import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * 开发入口页里有一段「不能直接双击打开」的占位提示（见 index.html 的
 * DEV_PLACEHOLDER 标记）。它只对开发模板有意义，构建时剔除，
 * 保证 dist/index.html 干净。
 */
const stripDevPlaceholder = () => ({
  name: 'strip-dev-placeholder',
  transformIndexHtml: {
    order: 'pre' as const,
    handler(html: string, ctx: { server?: unknown }) {
      if (ctx.server) return html;
      return html.replace(
        /<!-- DEV_PLACEHOLDER_START -->[\s\S]*?<!-- DEV_PLACEHOLDER_END -->/,
        ''
      );
    },
  },
});

export default defineConfig({
  plugins: [react(), stripDevPlaceholder(), viteSingleFile()],
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
