/**
 * 术语表 · 运行时覆盖层
 *
 * 数据来源：页面内嵌块
 *   <script type="text/plain" id="glossary-overrides">{ ... }</script>
 * 该块由 tools/glossary.mjs（npm run names）或 vite 构建插件从根目录 glossary-cn-en.csv 编译而来。
 *
 * 覆盖顺序（重要）：
 *  1) 正文替换：把页面里出现的旧译名（text 映射）换成新译名——React 文本、Canvas 星图/关系网都会跟着变；
 *  2) 实体字段：按 id 精确覆盖 派系名/种族/母星、地点名、纪元名、辞典术语，
 *     这样卡片可以用全称（如「蓝特涅夫男爵」），正文里仍是词干（「蓝特涅夫舰队」）。
 *  3) DOM 兜底：组件里硬编码的文案用 TreeWalker + MutationObserver 再扫一遍。
 */

interface GlossaryTable {
  v?: number;
  factions?: Record<string, Record<string, string>>;
  places?: Record<string, Record<string, string>>;
  eras?: Record<string, Record<string, string>>;
  glossary?: Record<string, Record<string, string>>;
  text?: Record<string, string>;
  /** 英文名 → 中文显示（只用于中文展示字段与正文，不碰 nameEn/subtitle 等） */
  textEn?: Record<string, string>;
  meta?: Record<string, unknown>;
}

interface ApplyTargets {
  factions?: unknown[];
  places?: unknown[];
  eras?: unknown[];
  glossary?: unknown[];
  roots?: unknown[];
}

const BLOCK_ID = 'glossary-overrides';
const MIN_KEY_LEN = 2;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);

/** 中文展示字段之外，这些字段里的英文不替换（英文名、副标题、引用等） */
const SKIP_EN_FIELDS = new Set([
  'subtitle',
  'sources',
  'source',
  'id',
  'short',
  'color',
  'form',
  'edition',
  'category',
  'type',
  'canon',
  'pos',
]);

const textMap: Record<string, string> = {};
const textEnMap: Record<string, string> = {};
let textRe: RegExp | null = null;
let textTest: RegExp | null = null;
let textEnRe: RegExp | null = null;
let textEnTest: RegExp | null = null;
let domInstalled = false;
let domScheduled = false;
let observer: MutationObserver | null = null;
const pendingNodes = new Set<Node>();

function readTable(): GlossaryTable | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(BLOCK_ID);
  if (!el || !el.textContent) return null;
  try {
    return JSON.parse(el.textContent) as GlossaryTable;
  } catch (err) {
    console.warn('[术语表] 内嵌映射解析失败，已跳过覆盖：', err);
    return null;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildReplacer(map: Record<string, string>, cjkOnly = true) {
  const keys = Object.keys(map)
    .filter((k) => (!cjkOnly || /[\u4e00-\u9fff]/.test(k)) && k.length >= (cjkOnly ? MIN_KEY_LEN : 3))
    .sort((a, b) => b.length - a.length || a.localeCompare(b, 'zh'));
  if (keys.length === 0) return { re: null as RegExp | null, test: null as RegExp | null };
  const source = keys.map(escapeRegExp).join('|');
  return { re: new RegExp(source, 'g'), test: new RegExp(source) };
}

/**
 * 单遍替换。若新译名是「旧名 + 后缀」（如 诺尔 → 诺尔虫人），
 * DOM 兜底层第二次扫到「诺尔虫人」时要跳过，避免叠成「诺尔虫人虫人」。
 */
function replaceText(input: string): string {
  if (!textRe || !input) return input;
  return input.replace(textRe, (match: string, offset: number, whole: string) => {
    const display = textMap[match];
    if (!display) return match;
    if (
      display.startsWith(match) &&
      whole.startsWith(display.slice(match.length), offset + match.length)
    ) {
      return match;
    }
    return display;
  });
}

/** 英文名 → 中文：只在中文展示字段里用，避免把 nameEn / 副标题改成中文 */
function replaceTextEn(input: string): string {
  if (!textEnRe || !input) return input;
  return input.replace(textEnRe, (match) => textEnMap[match] ?? match);
}

function enFieldAllowed(key: string | null): boolean {
  if (!key) return true;
  if (/En$/.test(key)) return false;
  return !SKIP_EN_FIELDS.has(key);
}

function applyToValue(value: unknown, key: string | null = null): unknown {
  if (typeof value === 'string') {
    let out = replaceText(value);
    if (enFieldAllowed(key)) out = replaceTextEn(out);
    return out;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) value[i] = applyToValue(value[i], key);
    return value;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const field of Object.keys(obj)) obj[field] = applyToValue(obj[field], field);
    return value;
  }
  return value;
}

function applyEntities(
  list: unknown[] | undefined,
  overrides: Record<string, Record<string, string>> | undefined
): number {
  if (!list || !overrides) return 0;
  let count = 0;
  for (const raw of list) {
    const item = raw as Record<string, unknown> | null;
    const id = item && typeof item.id === 'string' ? item.id : '';
    if (!id) continue;
    const override = overrides[id];
    if (!override) continue;
    for (const [field, value] of Object.entries(override)) {
      if (typeof value !== 'string') continue;
      item[field] = value;
      count += 1;
    }
  }
  return count;
}

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  // 英文名/副标题/引用等展示位不参与「英文 → 中文」转写
  return parent.closest('.en, small, .nav-brand-en, [lang="en"]') !== null;
}

function rewriteTextNode(node: Text): void {
  const value = node.nodeValue;
  if (!value) return;
  let next = value;
  if (textTest && textTest.test(next)) next = replaceText(next);
  if (textEnTest && textEnTest.test(next)) next = replaceTextEn(next);
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
 * 入口：把术语表应用到数据对象（原地改写），并挂上 DOM 兜底层。
 * 在 src/data/index.ts 汇总导出时调用一次即可。
 */
export function applyNameOverrides(targets: ApplyTargets = {}): void {
  const table = readTable();
  if (!table) {
    if (typeof console !== 'undefined') {
      console.warn(
        '[术语表] 未找到内嵌映射块（#glossary-overrides）。' +
          '运行 npm run names 注入，或 npm run build 重新构建后即可生效。'
      );
    }
    return;
  }

  Object.assign(textMap, table.text ?? {});
  Object.assign(textEnMap, table.textEn ?? {});
  ({ re: textRe, test: textTest } = buildReplacer(textMap));
  ({ re: textEnRe, test: textEnTest } = buildReplacer(textEnMap, false));

  // 1) 正文替换：先做，避免把新译名再套一遍
  for (const root of targets.roots ?? []) applyToValue(root);

  // 2) 实体字段精确覆盖
  let entityCount = 0;
  entityCount += applyEntities(targets.factions, table.factions);
  entityCount += applyEntities(targets.places, table.places);
  entityCount += applyEntities(targets.eras, table.eras);
  entityCount += applyEntities(targets.glossary, table.glossary);

  if (textRe || textEnRe || entityCount) {
    console.info(
      `[术语表] 已应用 ${Object.keys(textMap).length} 条中文替换 / ` +
        `${Object.keys(textEnMap).length} 条英文转写 / ${entityCount} 个实体字段`
    );
  }

  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installDomFallback, { once: true });
  } else {
    installDomFallback();
  }
}
