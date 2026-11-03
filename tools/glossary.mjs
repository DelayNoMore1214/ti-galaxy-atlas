#!/usr/bin/env node
/**
 * 术语表 · CLI
 *
 *   node tools/glossary.mjs sync    读术语表 → 与页面数据对齐 → 编译 → 注入 dist/index.html
 *   node tools/glossary.mjs watch   监听术语表，保存即自动同步
 *   node tools/glossary.mjs check   校验对齐情况：页面词条是否有对应、别名是否失效、正文键是否存在
 *
 * 唯一需要维护的文件：根目录《帝国曙光_术语表_CN-EN.csv》
 * 英文名对不上的少数条目写在 tools/glossaryAliases.json（人物、组织别称等）。
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  ALIASES,
  DIST_HTML,
  GLOSSARY_CSV,
  ROOT,
  buildBlock,
  buildFromFiles,
  extractBlock,
  indexGlossary,
  injectBlock,
  resolveRef,
} from './glossaryCore.mjs';

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

function readCorpus() {
  const files = [];
  const walk = (abs) => {
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(abs)) walk(path.join(abs, name));
    } else if (/\.(tsx?|html|css)$/.test(abs)) {
      files.push(abs);
    }
  };
  walk(path.join(ROOT, 'src'));
  return { files, text: files.map((f) => fs.readFileSync(f, 'utf8')).join('\n') };
}

function summarize(result) {
  const { stats, warnings } = result;
  ok(
    `已对齐术语 ${stats.applied}/${stats.rows} 条 → 实体字段 ${stats.entityPairs} 个、` +
      `正文替换 ${stats.textPairs} 条、英文转写 ${stats.textEnPairs ?? 0} 条`
  );
  if (stats.applied < stats.rows) {
    dim(`  术语表里另有 ${stats.rows - stats.applied} 条页面未使用（正常，站点只讲设定）`);
  }
  if (stats.unmatchedPage.length) {
    dim(`  页面词条暂无对应译名 ${stats.unmatchedPage.length} 条（保留现有译名）`);
  }
  for (const message of warnings) warn(message);
}

function cmdSync() {
  const result = buildFromFiles();
  summarize(result);

  if (!fs.existsSync(DIST_HTML)) {
    warn('dist/index.html 不存在，跳过注入。先跑一次 npm run build。');
    return result.warnings.length === 0;
  }

  const html = fs.readFileSync(DIST_HTML, 'utf8');
  const had = extractBlock(html) !== null;
  const injected = injectBlock(html, buildBlock(result.table));
  fs.writeFileSync(DIST_HTML, injected.html, 'utf8');
  ok(`已注入 dist/index.html（${injected.mode === 'replaced' ? '替换旧块' : '新增块'}，原块${had ? '存在' : '不存在'}）`);
  dim('  刷新浏览器（Cmd+R）即可看到新译名。');
  return result.warnings.length === 0;
}

function cmdCheck() {
  const result = buildFromFiles();
  summarize(result);
  const corpus = readCorpus();
  const problems = [];

  // 正文替换键必须真的出现在页面源码里，否则是拼写/对齐问题。
  // 别名里的旧译/异写允许当前页面不存在（留作以后归并），不计为错误。
  const aliasKeys = result.aliasKeys ?? new Set();
  for (const key of Object.keys(result.table.text)) {
    if (aliasKeys.has(key)) continue;
    if (!corpus.text.includes(key)) problems.push(`正文替换键在页面源码中找不到：「${key}」`);
  }
  for (const key of Object.keys(result.table.textEn ?? {})) {
    if (aliasKeys.has(key)) continue;
    if (!corpus.text.includes(key)) problems.push(`英文转写键在页面源码中找不到：「${key}」`);
  }

  // 实体 id 必须存在
  const ids = {
    factions: Object.keys(result.table.factions),
    places: Object.keys(result.table.places),
    eras: Object.keys(result.table.eras),
    glossary: Object.keys(result.table.glossary),
  };
  const exists = {
    factions: new Set(result.terms.factions.map((f) => f.id)),
    places: new Set(result.terms.places.map((p) => p.id)),
    eras: new Set(result.terms.eras.map((e) => e.id)),
    glossary: new Set(result.terms.terms.map((t) => t.id)),
  };
  for (const kind of Object.keys(ids)) {
    for (const id of ids[kind]) {
      if (!exists[kind].has(id)) problems.push(`实体 id 不存在：${kind}/${id}`);
    }
  }

  // 别名能解析
  const index = indexGlossary(result.rows);
  for (const [key, raw] of Object.entries(result.aliases.text)) {
    const ref = typeof raw === 'string' ? raw : raw.ref;
    if (!resolveRef(ref, index)) problems.push(`别名失效：「${key}」→「${ref}」`);
  }
  for (const [key, ref] of Object.entries(result.aliases.entities)) {
    if (!resolveRef(ref, index)) problems.push(`实体别名失效：「${key}」→「${ref}」`);
  }

  if (result.stats.unmatchedPage.length) {
    dim('  暂无对应的页面词条：');
    for (const item of result.stats.unmatchedPage.slice(0, 30)) say(`    · ${item}`);
    if (result.stats.unmatchedPage.length > 30) dim(`    …另有 ${result.stats.unmatchedPage.length - 30} 条`);
  }

  if (problems.length) {
    for (const message of problems) bad(message);
  }
  return problems.length === 0 && result.warnings.length === 0;
}

function cmdWatch() {
  let running = false;
  let timer = null;

  const run = (reason) => {
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
  say(`${COLORS.green}监听中…${COLORS.reset} 保存术语表后自动同步；刷新浏览器即可看到新译名（Ctrl+C 退出）`);

  const watch = (file, label) => {
    if (!fs.existsSync(file)) return;
    fs.watchFile(file, { interval: 400 }, (curr, prev) => {
      if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) run(label);
    });
  };
  watch(GLOSSARY_CSV, '术语表');
  watch(ALIASES, '别名表');
  return true;
}

const COMMANDS = { sync: cmdSync, watch: cmdWatch, check: cmdCheck };
const command = process.argv[2] || 'sync';

if (!COMMANDS[command]) {
  bad(`未知命令：${command}（可用：sync / watch / check）`);
  process.exit(1);
}

say(`${COLORS.cyan}术语表 · ${command}${COLORS.reset}`);
dim(`  术语表：${path.relative(ROOT, GLOSSARY_CSV)}`);
dim(`  别名表：${path.relative(ROOT, ALIASES)}`);
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
