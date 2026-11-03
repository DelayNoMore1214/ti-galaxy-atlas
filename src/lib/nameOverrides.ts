/**
 * 译名对照表 · 运行时覆盖层
 *
 * 数据来源：dist/index.html（或开发服务器注入的 index.html）里的
 *   <script type="text/plain" id="name-table-overrides">{ "cn": {...}, "en": {...} }</script>
 * 该块由 tools/nameTable.mjs（npm run names）或 vite 构建插件从根目录《译名对照表.csv》编译而来。
 *
 * 两层替换：
 *  1) 数据层：在 src/data/index.ts 汇总导出时直接改写对象字符串——React 文本、Three.js 星图、
 *     Canvas 关系网、弹窗全部跟着变（Canvas 上画的字 DOM 层够不到，只能在这一层解决）。
 *  2) DOM 层：组件里硬编码的文案（序章、隧道图标注等）用 TreeWalker + MutationObserver 兜底。
 *
 * 约定：中文映射按「原名 → 显示译名」做最长优先的子串替换；英文映射只作用于 *En 字段与文本节点。
 */

interface NameTable {
  v?: number;
  cn?: Record<string, string>;
  en?: Record<string, string>;
  meta?: Record<string, unknown>;
}

const BLOCK_ID = 'name-table-overrides';
const MIN_CN_KEY_LEN = 2;
const MIN_EN_KEY_LEN = 3;
/** 官方引用字段不做改写，避免考证出处被译名表污染 */
const SKIP_KEYS = new Set(['source', 'sources']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);

const cnMap: Record<string, string> = {};
const enMap: Record<string, string> = {};

let cnRe: RegExp | null = null;
let enRe: RegExp | null = null;
let cnTest: RegExp | null = null;
let enTest: RegExp | null = null;
let domInstalled = false;
let domScheduled = false;
let observer: MutationObserver | null = null;
const pendingNodes = new Set<Node>();

function readTable(): NameTable | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(BLOCK_ID);
  if (!el || !el.textContent) return null;
  try {
    return JSON.parse(el.textContent) as NameTable;
  } catch (err) {
    console.warn('[译名对照表] 内嵌映射解析失败，已跳过覆盖：', err);
    return null;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildReplacer(map: Record<string, string>, minLen: number) {
  const keys = Object.keys(map)
    .filter((k) => k.length >= minLen)
    .sort((a, b) => b.length - a.length || a.localeCompare(b, 'zh'));
  if (keys.length === 0) return { re: null as RegExp | null, test: null as RegExp | null };
  const source = keys.map(escapeRegExp).join('|');
  return { re: new RegExp(source, 'g'), test: new RegExp(source) };
}

function replaceByMap(input: string, re: RegExp | null, map: Record<string, string>): string {
  if (!re || !input) return input;
  return input.replace(re, (m) => map[m] ?? m);
}

function applyToValue(value: unknown, key: string | null): unknown {
  if (typeof value === 'string') {
    let out = replaceByMap(value, cnRe, cnMap);
    if (key && key.endsWith('En')) out = replaceByMap(out, enRe, enMap);
    return out;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) value[i] = applyToValue(value[i], key);
    return value;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      if (SKIP_KEYS.has(k)) continue;
      obj[k] = applyToValue(obj[k], k);
    }
    return value;
  }
  return value;
}

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  return parent.closest('#sources') !== null;
}

function rewriteTextNode(node: Text): void {
  const value = node.nodeValue;
  if (!value) return;
  const hitCn = cnTest ? cnTest.test(value) : false;
  const hitEn = enTest ? enTest.test(value) : false;
  if (!hitCn && !hitEn) return;
  const next = replaceByMap(replaceByMap(value, cnRe, cnMap), enRe, enMap);
  if (next !== value) node.nodeValue = next;
}

function walk(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    if (!shouldSkipTextNode(root as Text)) rewriteTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldSkipTextNode(node as Text) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const hits: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    hits.push(current as Text);
    current = walker.nextNode();
  }
  for (const node of hits) rewriteTextNode(node);
}

function flushPending(): void {
  domScheduled = false;
  if (pendingNodes.size === 0) return;
  const nodes = [...pendingNodes];
  pendingNodes.clear();
  observer?.disconnect();
  try {
    for (const node of nodes) {
      if (!node.isConnected) continue;
      walk(node);
    }
  } finally {
    startObserving();
  }
}

function scheduleFlush(): void {
  if (domScheduled) return;
  domScheduled = true;
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(flushPending);
  } else {
    setTimeout(flushPending, 16);
  }
}

function startObserving(): void {
  if (!observer || !document.body) return;
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function installDomFallback(): void {
  if (domInstalled || typeof document === 'undefined' || !document.body) return;
  domInstalled = true;
  walk(document.body);
  observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        if (record.target) pendingNodes.add(record.target);
        continue;
      }
      record.addedNodes.forEach((node) => pendingNodes.add(node));
    }
    if (pendingNodes.size > 0) scheduleFlush();
  });
  startObserving();
}

/**
 * 入口：把译名对照表应用到传入的数据对象（原地改写），并挂上 DOM 兜底层。
 * 在 src/data/index.ts 汇总导出时调用一次即可。
 */
export function applyNameOverrides(...roots: unknown[]): void {
  const table = readTable();
  if (!table) {
    if (typeof console !== 'undefined') {
      console.warn(
        '[译名对照表] 未找到内嵌映射块（#name-table-overrides）。' +
          '运行 npm run names 注入，或 npm run build 重新构建后即可生效。'
      );
    }
    return;
  }

  Object.assign(cnMap, table.cn ?? {});
  Object.assign(enMap, table.en ?? {});
  ({ re: cnRe, test: cnTest } = buildReplacer(cnMap, MIN_CN_KEY_LEN));
  ({ re: enRe, test: enTest } = buildReplacer(enMap, MIN_EN_KEY_LEN));

  if (!cnRe && !enRe) return;

  for (const root of roots) applyToValue(root, null);

  const cnCount = cnRe ? Object.keys(cnMap).length : 0;
  const enCount = enRe ? Object.keys(enMap).length : 0;
  if (cnCount || enCount) {
    console.info(`[译名对照表] 已应用 ${cnCount} 条中文映射 / ${enCount} 条英文映射`);
  }

  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installDomFallback, { once: true });
  } else {
    installDomFallback();
  }
}
