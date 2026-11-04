import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { buildBlock, buildFromFiles, injectBlock } from './tools/glossaryCore.mjs';

const FAVICON_DIR = fileURLToPath(new URL('./src/assets/favicon/', import.meta.url));

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

/**
 * 把 glossary-cn-en.csv 编译成内嵌映射块写进 HTML（开发与构建都注入）。
 * 与 npm run names 共用 tools/glossaryCore.mjs，两条路径产物一致；
 * 运行时由 src/lib/nameOverrides.ts 读取 #glossary-overrides。
 */
const injectGlossary = () => ({
  name: 'inject-glossary',
  transformIndexHtml: {
    order: 'pre' as const,
    handler(html: string) {
      try {
        const { table, warnings } = buildFromFiles();
        for (const message of warnings) console.warn(`[术语表] ${message}`);
        return injectBlock(html, buildBlock(table)).html;
      } catch (err) {
        console.warn(`[术语表] 注入跳过：${(err as Error).message}`);
        return html;
      }
    },
  },
});

/**
 * 站点图标：把 src/assets/favicon/ 下的 PNG 内联成 data URI 写进 <head>。
 * 这样单文件产物依旧零外部请求，双击打开也有标签页图标。
 */
const injectFavicon = () => ({
  name: 'inject-favicon',
  transformIndexHtml: {
    order: 'pre' as const,
    handler(html: string) {
      try {
        const dataUri = (file: string) =>
          `data:image/png;base64,${fs.readFileSync(FAVICON_DIR + file).toString('base64')}`;
        const tags = [
          `<link rel="icon" type="image/png" sizes="32x32" href="${dataUri('favicon-32.png')}">`,
          `<link rel="icon" type="image/png" sizes="64x64" href="${dataUri('favicon-64.png')}">`,
          `<link rel="apple-touch-icon" sizes="180x180" href="${dataUri('favicon-180.png')}">`,
        ].join('\n    ');
        return html.replace(/<\/head>/i, `    ${tags}\n  </head>`);
      } catch (err) {
        console.warn(`[favicon] 注入跳过：${(err as Error).message}`);
        return html;
      }
    },
  },
});

export default defineConfig({
  plugins: [react(), stripDevPlaceholder(), injectGlossary(), injectFavicon(), viteSingleFile()],
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
