#!/usr/bin/env node
/**
 * 译名对照表 · CLI
 *
 *   node tools/nameTable.mjs extract   从 tools/nameBindings.json 重新生成主表（保留你已改过的 CN）
 *   node tools/nameTable.mjs sync      读取主表 → 编译 → 注入 dist/index.html（刷新页面即生效）
 *   node tools/nameTable.mjs check     校验主表与页面源码是否对得上，列出未匹配/失效词条
 *
 * 主表三列：CN / EN / 类别（派系名称、种族名称、星图名称、人物名称、组织名称）。
 * 同一个中文名可以有多行（例如「巴鲁尼」既是派系名称又是种族名称），
 * 改其中任意一行都会同步到同名的其它行；若多行改得不一样，会提示冲突并优先采用「派系名称」那一行。
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  CATEGORIES,
  CSV_HEADER,
  DEFAULT_BINDINGS,
  DEFAULT_CSV,
  DIST_HTML,
  ROOT,
  buildBlock,
  buildTableFromFiles,
  extractBlock,
  injectBlock,
  loadBindings,
  matchRows,
  parseCsv,
  serializeCsv,
} from './nameTableCore.mjs';

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const say = (...args) => console.log(...args);
const ok = (msg) => say(`${COLORS.green}✔${COLORS.reset} ${msg}`);
const warn = (msg) => say(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`);
const bad = (msg) => say(`${COLORS.red}✖${COLORS.reset} ${msg}`);
const dim = (msg) => say(`${COLORS.dim}${msg}${COLORS.reset}`);

/** 复合写法（如「弧首星 / 雷恩·特拉（弧首星系）」）拆成词元，判断是否已被绑定清单覆盖 */
function isCoveredName(nameZh, knownCn) {
  if (knownCn.has(nameZh)) return true;
  const tokens = nameZh
    .split(/[／/]/)
    .map((t) => t.replace(/[（(][^）)]*[）)]/g, '').trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const cjkTokens = tokens.filter((t) => /[\u4e00-\u9fff]/.test(t));
  if (cjkTokens.length === 0) return true; // 纯英文写法（如 Archon Ren）无需中文对照
  return cjkTokens.every((t) => knownCn.has(t));
}

function readCorpus() {
  const roots = ['src', 'index.html'];
  const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.html', '.css']);
  const files = [];
  const walk = (abs) => {
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(abs)) walk(path.join(abs, name));
    } else if (exts.has(path.extname(abs).toLowerCase())) {
      files.push(abs);
    }
  };
  for (const rel of roots) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) walk(abs);
  }
  return { files, text: files.map((f) => fs.readFileSync(f, 'utf8')).join('\n') };
}

function readExistingRows() {
  if (!fs.existsSync(DEFAULT_CSV)) return [];
  try {
    return parseCsv(fs.readFileSync(DEFAULT_CSV, 'utf8')).rows;
  } catch (err) {
    warn(`读取现有主表失败，将按绑定清单重新生成：${err.message}`);
    return [];
  }
}

function writeCsv(file, rows) {
  fs.writeFileSync(file, `\ufeff${serializeCsv(rows)}`, 'utf8');
}

function printProblems(problems, warnings) {
  for (const w of warnings) warn(w);
  for (const p of problems) {
    if (p.kind === 'unresolved') bad(p.message);
    else if (p.kind === 'conflict') bad(`映射冲突：${p.message}`);
    else warn(p.message);
  }
}

/** 同组（同一原中文名）多行对齐：只改了一行就把该译名铺开到全组 */
function alignGroups(items) {
  const groups = new Map();
  for (const item of items) {
    const list = groups.get(item.original);
    if (list) list.push(item);
    else groups.set(item.original, [item]);
  }

  const messages = [];
  for (const [original, list] of groups) {
    const displays = [...new Set(list.map((i) => i.cn).filter(Boolean))];
    if (displays.length <= 1) continue;
    const changed = displays.filter((d) => d !== original);
    let chosen;
    if (changed.length === 1) {
      chosen = changed[0];
    } else {
      const fac = list.find((i) => i.category === '派系名称' && i.cn);
      chosen = fac ? fac.cn : displays[0];
      messages.push(`「${original}」各行译名不一致（${displays.join(' / ')}），已统一为「${chosen}」，请确认`);
    }
    for (const item of list) item.cn = chosen;
  }
  return messages;
}

function cmdExtract() {
  const entries = loadBindings(DEFAULT_BINDINGS);
  const existing = readExistingRows();

  const byEnCat = new Map();
  const byEn = new Map();
  const byCnCat = new Map();
  const byCn = new Map();
  const push = (map, key, row) => {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  };
  for (const row of existing) {
    push(byEnCat, row.en && `${row.en}\u0000${row.category}`, row);
    push(byEn, row.en, row);
    push(byCnCat, `${row.cn}\u0000${row.category}`, row);
    push(byCn, row.cn, row);
  }
  const one = (map, key) => {
    const list = key ? map.get(key) : null;
    return list && list.length === 1 ? list[0] : null;
  };

  const usedPrev = new Set();
  const items = entries.map((entry) => {
    const prev =
      one(byEnCat, entry.en && `${entry.en}\u0000${entry.category}`) ||
      one(byEn, entry.en) ||
      one(byCnCat, `${entry.cn}\u0000${entry.category}`) ||
      one(byCn, entry.cn) ||
      null;
    if (prev) usedPrev.add(prev);
    return { cn: prev?.cn || entry.cn, en: entry.en, category: entry.category, original: entry.cn };
  });

  const alignMessages = alignGroups(items);
  for (const msg of alignMessages) warn(msg);

  const rows = items.map(({ cn, en, category }) => ({ cn, en, category }));
  const extras = existing.filter((row) => !usedPrev.has(row));
  for (const extra of extras) rows.push({ cn: extra.cn, en: extra.en, category: extra.category });

  writeCsv(DEFAULT_CSV, rows);

  // 扫一遍数据源码，提醒还没登记的新专名
  const corpus = readCorpus();
  const knownCn = new Set(entries.map((e) => e.cn));
  const missing = new Set();
  for (const file of corpus.files) {
    if (!/[\\/]src[\\/]data[\\/]/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/nameZh:\s*'([^']+)'/g)) {
      if (!isCoveredName(m[1], knownCn)) missing.add(m[1]);
    }
  }
  for (const term of missing) {
    warn(`页面源码里有、但绑定清单未登记的词条：「${term}」——如属派系/地点名，请补进 tools/nameBindings.json`);
  }

  const unknownCategory = rows.filter((r) => r.category && !CATEGORIES.includes(r.category));
  for (const row of unknownCategory) {
    warn(`未知类别「${row.category}」（${row.cn}）——可用类别：${CATEGORIES.join(' / ')}`);
  }

  ok(`已生成主表：${path.relative(ROOT, DEFAULT_CSV)}（${rows.length} 行，表头 ${CSV_HEADER.join(' / ')}）`);
  dim('  下一步：编辑主表的 CN 列，然后运行 npm run names');
  return missing.size === 0 && unknownCategory.length === 0;
}

function cmdSync() {
  const { table, problems, warnings, stats } = buildTableFromFiles();
  printProblems(problems, warnings);

  if (!fs.existsSync(DIST_HTML)) {
    warn('dist/index.html 不存在，跳过注入。先跑一次 npm run build 生成产物。');
    return problems.length === 0;
  }

  const html = fs.readFileSync(DIST_HTML, 'utf8');
  const hadBlock = extractBlock(html) !== null;
  const result = injectBlock(html, buildBlock(table));
  fs.writeFileSync(DIST_HTML, result.html, 'utf8');

  ok(`已注入 dist/index.html（${result.mode === 'replaced' ? '替换旧块' : '新增块'}，原块${hadBlock ? '存在' : '不存在'}）`);
  dim(
    `  主表 ${stats.rows} 行 → ${stats.groups} 组同名条目，替换对 CN ${stats.cnPairs} / EN ${stats.enPairs}`
  );
  dim('  刷新浏览器（或重新打开 dist/index.html）即可看到新译名。');
  return problems.length === 0;
}

function cmdCheck() {
  const { table, problems, warnings, stats, entries, rows } = buildTableFromFiles();
  printProblems(problems, warnings);

  const corpus = readCorpus();
  const uniqueCn = [...new Set(entries.map((e) => e.cn))];
  const missing = uniqueCn.filter((cn) => !corpus.text.includes(cn));
  const staleVariants = [];
  for (const entry of entries) {
    for (const variant of entry.variants) {
      if (!corpus.text.includes(variant)) staleVariants.push(`${entry.cn} ← ${variant}`);
    }
  }

  const matched = matchRows(rows, entries);
  const changed = matched.filter(({ row, entry }) => entry && row.cn !== entry.cn);

  const dist = {};
  for (const row of rows) {
    const key = row.category || '(未填类别)';
    dist[key] = (dist[key] || 0) + 1;
  }
  for (const key of Object.keys(dist)) {
    if (!CATEGORIES.includes(key)) warn(`主表里有未知类别「${key}」（${dist[key]} 行）——可用类别：${CATEGORIES.join(' / ')}`);
  }

  const dupIndex = new Map();
  for (const entry of entries) {
    const key = `${entry.en}\u0000${entry.category}`;
    if (!entry.en) continue;
    if (dupIndex.has(key)) {
      warn(`绑定清单里「${entry.en}（${entry.category}）」出现了不止一次，请确认不是重复登记`);
    }
    dupIndex.set(key, entry);
  }

  if (missing.length) {
    bad('以下词条在页面源码里找不到（拼写可能已变，或词条已删除）：');
    for (const term of missing) say(`    · ${term}`);
  }
  if (staleVariants.length && process.argv.includes('--verbose')) {
    warn('以下旧译/异写当前页面里未出现（保留它们可在旧译再次出现时自动归并）：');
    for (const pair of staleVariants) say(`    · ${pair}`);
  }

  const riskyChanged = changed.filter(({ entry }) => entry.risk);
  if (riskyChanged.length) {
    warn('以下通用词被改译，页面中包含该词的其它文案也会一起变：');
    for (const { row } of riskyChanged) say(`    · ${row.cn}（第 ${row.line} 行）`);
  }

  say('');
  ok(`主表 ${stats.rows} 行 / 绑定 ${stats.entries} 条 → 命中 ${stats.groups} 组同名条目（${stats.mapped} 条词条记录）`);
  dim(`  类别分布：${Object.entries(dist).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  dim(`  替换对：CN ${Object.keys(table.cn).length} 条，EN ${Object.keys(table.en).length} 条；改动 ${changed.length} 行`);
  if (changed.length) {
    dim('  改动预览（原名 → 新名）：');
    for (const { row } of changed.slice(0, 12)) {
      const original = entries.find((e) => e.en === row.en && e.category === row.category)?.cn ?? row.cn;
      say(`    · ${original} → ${row.cn}（${row.category}）`);
    }
    if (changed.length > 12) dim(`    …另有 ${changed.length - 12} 行`);
  }

  return problems.length === 0 && missing.length === 0;
}

/** 监听主表：保存即自动同步，省得每次手动敲命令 */
function cmdWatch() {
  let running = false;
  let timer = null;

  const trigger = (reason) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (running) return;
      running = true;
      try {
        say('');
        dim(`[${new Date().toLocaleTimeString()}] ${reason}有变化，重新同步…`);
        cmdSync();
        say('  监听中…（刷新浏览器即可看到新译名，Ctrl+C 退出）');
      } catch (err) {
        bad(err.message);
      } finally {
        running = false;
      }
    }, 160);
  };

  cmdSync();
  say('');
  say(`${COLORS.green}监听中…${COLORS.reset} 保存主表后自动同步；刷新浏览器即可看到新译名（Ctrl+C 退出）`);

  const watch = (file, label) =>
    fs.watchFile(file, { interval: 400 }, (curr, prev) => {
      if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) trigger(label);
    });

  watch(DEFAULT_CSV, '主表');
  watch(DEFAULT_BINDINGS, '绑定清单');
  return true;
}

const COMMANDS = { extract: cmdExtract, sync: cmdSync, check: cmdCheck, watch: cmdWatch };
const command = process.argv[2] || 'sync';

if (!COMMANDS[command]) {
  bad(`未知命令：${command}（可用：extract / sync / check / watch）`);
  process.exit(1);
}

say(`${COLORS.cyan}译名对照表 · ${command}${COLORS.reset}`);
say(`${COLORS.dim}  主表：${path.relative(ROOT, DEFAULT_CSV)}${COLORS.reset}`);
say(`${COLORS.dim}  绑定：${path.relative(ROOT, DEFAULT_BINDINGS)}${COLORS.reset}`);
say('');

let okFlag = false;
try {
  okFlag = COMMANDS[command]() !== false;
} catch (err) {
  bad(err.stack || err.message);
  process.exit(1);
}
say('');
if (command !== 'watch') process.exit(okFlag ? 0 : 1);
