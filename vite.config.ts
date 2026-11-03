import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { buildBlock, buildTableFromFiles, injectBlock } from './tools/nameTableCore.mjs';

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
 * 把《译名对照表.csv》编译成内嵌映射块写进 HTML（开发与构建都注入）。
 * 与 npm run names 共用 tools/nameTableCore.mjs，两条路径产物一致；
 * 运行时由 src/lib/nameOverrides.ts 读取 #name-table-overrides。
 */
const injectNameTable = () => ({
  name: 'inject-name-table',
  transformIndexHtml: {
    order: 'pre' as const,
    handler(html: string) {
      try {
        const { table, problems } = buildTableFromFiles();
        for (const p of problems) console.warn(`[译名对照表] ${p.message}`);
        return injectBlock(html, buildBlock(table)).html;
      } catch (err) {
        console.warn(`[译名对照表] 注入跳过：${(err as Error).message}`);
        return html;
      }
    },
  },
});

export default defineConfig({
  plugins: [react(), stripDevPlaceholder(), injectNameTable(), viteSingleFile()],
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
