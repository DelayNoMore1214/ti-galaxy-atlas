/**
 * 译名对照表 · 共享核心
 *
 * 被 tools/nameTable.mjs（CLI）与 vite.config.ts（构建插件）共用，
 * 负责：CSV 解析/序列化、行与绑定清单的匹配、编译成运行时映射、注入 dist/index.html。
 *
 * 主表三列：CN（显示译名）/ EN（官方英文名）/ 类别（派系名称、种族名称、星图名称、人物名称、组织名称）。
 * 同一个中文名可能对应多条记录（既是派系名称又是种族名称，或既是种族名称又是星图名称），
 * 它们在编译时归为同一组——页面替换是按字符串全局生效的，所以组内译名必须一致；
 * 只改动其中一行时，会自动把该译名应用到同组的其它行。
 *
 * 编译产物（内嵌在页面里的 JSON）：
 *   { "v": 1, "cn": { "原中文名": "显示译名" }, "en": { "原英文名": "显示英文名" } }
 */
import fs from 'node:fs';
import path from 'node:path';

export const BLOCK_ID = 'name-table-overrides';
export const BLOCK_START = '<!-- NAME_TABLE_START -->';
export const BLOCK_END = '<!-- NAME_TABLE_END -->';
export const CSV_HEADER = ['CN', 'EN', '类别'];
export const CATEGORIES = ['派系名称', '种族名称', '星图名称', '人物名称', '组织名称'];
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const DEFAULT_CSV = path.join(ROOT, '译名对照表.csv');
export const DEFAULT_BINDINGS = path.join(ROOT, 'tools', 'nameBindings.json');
export const DIST_HTML = path.join(ROOT, 'dist', 'index.html');

const KEY_SEP = '\u0000';
const tripleOf = (row) => `${row.cn}${KEY_SEP}${row.en}${KEY_SEP}${row.category}`;

/** 解析 CSV 文本（支持引号转义、CRLF、BOM）。返回 [{ cn, en, category, line }] */
export function parseCsv(text) {
  const src = String(text).replace(/^\ufeff/, '');
  const records = [];
  let field = '';
  let record = [];
  let line = 1;
  let recordLine = 1;
  let inQuotes = false;

  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    pushField();
    records.push({ fields: record, line: recordLine });
    record = [];
    recordLine = line;
  };

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') line += 1;
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      line += 1;
      pushRecord();
      recordLine = line;
    } else {
      field += ch;
    }
  }
  if (field !== '' || record.length > 0) pushRecord();

  const nonEmpty = records.filter((r) => r.fields.some((f) => f.trim() !== ''));
  if (nonEmpty.length === 0) return { rows: [], errors: ['CSV 为空'] };

  const header = nonEmpty[0].fields.map((f) => f.trim().toLowerCase());
  const hasHeader = header.includes('cn') && header.includes('en');
  const idx = hasHeader
    ? {
        cn: header.indexOf('cn'),
        en: header.indexOf('en'),
        category: header.findIndex((h) => h === '类别' || h === 'category' || h === 'type'),
      }
    : { cn: 0, en: 1, category: 2 };

  const body = hasHeader ? nonEmpty.slice(1) : nonEmpty;
  const rows = body.map((r) => ({
    cn: (r.fields[idx.cn] ?? '').trim(),
    en: (r.fields[idx.en] ?? '').trim(),
    category: idx.category >= 0 ? (r.fields[idx.category] ?? '').trim() : '',
    line: r.line,
  }));

  return { rows: rows.filter((r) => r.cn !== '' || r.en !== ''), errors: [] };
}

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 序列化为主表格式（不含 BOM，调用方自行加） */
export function serializeCsv(rows) {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) lines.push([r.cn, r.en, r.category].map(csvCell).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

export function loadBindings(bindingPath = DEFAULT_BINDINGS) {
  const raw = fs.readFileSync(bindingPath, 'utf8');
  const data = JSON.parse(raw);
  const entries = Array.isArray(data) ? data : data.entries;
  if (!Array.isArray(entries)) throw new Error('nameBindings.json 结构异常：缺少 entries 数组');

  const invalid = entries.filter((e) => !e || typeof e.cn !== 'string' || e.cn.trim() === '');
  if (invalid.length) throw new Error(`nameBindings.json 有 ${invalid.length} 条缺少 cn 字段`);

  return entries.map((e) => ({
    cn: e.cn.trim(),
    en: (e.en ?? '').trim(),
    category: (e.category ?? '').trim(),
    variants: Array.isArray(e.variants) ? e.variants.filter((v) => typeof v === 'string' && v.trim()) : [],
    risk: Boolean(e.risk),
    note: e.note ?? '',
  }));
}

export function loadTableRows(csvPath = DEFAULT_CSV) {
  if (!fs.existsSync(csvPath)) throw new Error(`找不到主表：${csvPath}`);
  const parsed = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  return parsed.rows;
}

function indexEntries(entries) {
  const byEnCat = new Map(); // en + 类别 → entry[]
  const byEn = new Map(); // en → entry[]
  const byCnCat = new Map(); // cn + 类别 → entry[]
  const byCn = new Map(); // cn → entry[]
  const push = (map, key, value) => {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };
  for (const entry of entries) {
    push(byEnCat, entry.en && `${entry.en}${KEY_SEP}${entry.category}`, entry);
    push(byEn, entry.en, entry);
    push(byCnCat, `${entry.cn}${KEY_SEP}${entry.category}`, entry);
    push(byCn, entry.cn, entry);
  }
  return { byEnCat, byEn, byCnCat, byCn };
}

function pickUnique(map, key) {
  const list = map.get(key);
  return list && list.length === 1 ? list[0] : null;
}

function matchRow(row, index) {
  return (
    pickUnique(index.byEnCat, `${row.en}${KEY_SEP}${row.category}`) ||
    pickUnique(index.byEn, row.en) ||
    pickUnique(index.byCnCat, `${row.cn}${KEY_SEP}${row.category}`) ||
    pickUnique(index.byCn, row.cn) ||
    null
  );
}

/** 组内译名对齐：只改了一行 → 该译名应用到全组；多行各改各的 → 派系名优先并报冲突 */
function resolveGroupDisplay(originalCn, group, problems, warnings) {
  const displays = [...new Set(group.rows.map((r) => r.row.cn).filter(Boolean))];
  if (displays.length === 0) return originalCn;
  if (displays.length === 1) return displays[0];

  const changed = displays.filter((d) => d !== originalCn);
  if (changed.length === 1) {
    warnings.push(`「${originalCn}」在 ${group.rows.length} 行里出现，已统一采用「${changed[0]}」`);
    return changed[0];
  }

  const fac = group.rows.find((r) => r.entry.category === '派系名称' && r.row.cn);
  const chosen = fac ? fac.row.cn : displays[0];
  problems.push({
    kind: 'conflict',
    message: `「${originalCn}」的多行译名不一致（${displays.join(' / ')}），已采用「${chosen}」。请把这些行改成同一个译名。`,
  });
  return chosen;
}

/** 逐行匹配绑定条目（供 check 统计用） */
export function matchRows(rows, entries) {
  const index = indexEntries(entries);
  return rows.map((row) => ({ row, entry: matchRow(row, index) }));
}

/** 主表行 → 运行时映射。返回 { table, problems, warnings, stats, usedEntries } */
export function compileTable(rows, entries) {
  const index = indexEntries(entries);
  const problems = [];
  const warnings = [];
  const groups = new Map(); // 原中文名 → { originalCn, entries:Set, rows:[{row, entry}] }
  const seen = new Set();

  for (const row of rows) {
    if (!row.cn && !row.en) continue;
    const triple = tripleOf(row);
    if (seen.has(triple)) {
      warnings.push(`重复行：${row.cn} / ${row.en} / ${row.category}（第 ${row.line} 行）——已忽略`);
      continue;
    }
    const entry = matchRow(row, index);
    if (!entry) {
      problems.push({
        kind: 'unresolved',
        line: row.line,
        message: `第 ${row.line} 行无法对应到页面词条：CN「${row.cn}」EN「${row.en}」类别「${row.category}」`,
      });
      continue;
    }
    seen.add(triple);
    let group = groups.get(entry.cn);
    if (!group) {
      group = { originalCn: entry.cn, entries: new Set(), rows: [] };
      groups.set(entry.cn, group);
    }
    group.entries.add(entry);
    group.rows.push({ row, entry });
  }

  const cn = Object.create(null);
  const en = Object.create(null);
  const usedEntries = new Set();

  for (const [originalCn, group] of groups) {
    const display = resolveGroupDisplay(originalCn, group, problems, warnings);
    if (display && display !== originalCn) cn[originalCn] = display;

    for (const { row, entry } of group.rows) {
      usedEntries.add(entry);
      if (entry.en && row.en && row.en !== entry.en && !/[／/]/.test(entry.en)) {
        en[entry.en] = row.en;
      }
    }

    for (const entry of group.entries) {
      for (const variant of entry.variants) {
        if (!variant || variant === display) continue;
        if (cn[variant] && cn[variant] !== display) {
          problems.push({
            kind: 'conflict',
            message: `旧译「${variant}」同时指向「${cn[variant]}」与「${display}」（${originalCn}）`,
          });
          continue;
        }
        cn[variant] = display;
      }
    }
  }

  const sortByLength = (obj) =>
    Object.fromEntries(
      Object.entries(obj).sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0], 'zh'))
    );

  const table = {
    v: 1,
    generated: new Date().toISOString(),
    cn: sortByLength(cn),
    en: sortByLength(en),
    meta: {
      rows: rows.length,
      entries: entries.length,
      groups: groups.size,
      cnPairs: Object.keys(cn).length,
      enPairs: Object.keys(en).length,
    },
  };

  const stats = {
    rows: rows.length,
    entries: entries.length,
    groups: groups.size,
    mapped: usedEntries.size,
    cnPairs: Object.keys(cn).length,
    enPairs: Object.keys(en).length,
  };

  return { table, problems, warnings, stats, usedEntries };
}

/** 生成内嵌块（含标记） */
export function buildBlock(table) {
  const json = JSON.stringify(table).replace(/<\//g, '<\\/');
  return [
    BLOCK_START,
    `    <script type="text/plain" id="${BLOCK_ID}">${json}</script>`,
    BLOCK_END,
  ].join('\n');
}

/** 取出现有的内嵌块（含标记），没有则返回 null */
export function extractBlock(html) {
  const start = html.indexOf(BLOCK_START);
  const end = html.indexOf(BLOCK_END);
  if (start === -1 || end === -1 || end < start) return null;
  return html.slice(start, end + BLOCK_END.length);
}

/** 把内嵌块写入 HTML（替换已有块，或在 <head> 后插入） */
export function injectBlock(html, block) {
  const existing = extractBlock(html);
  if (existing) {
    const at = html.indexOf(existing);
    return { html: html.slice(0, at) + block + html.slice(at + existing.length), mode: 'replaced' };
  }
  const head = /<head[^>]*>/i.exec(html);
  if (head) {
    const at = head.index + head[0].length;
    return { html: `${html.slice(0, at)}\n${block}${html.slice(at)}`, mode: 'inserted' };
  }
  return { html: `${block}\n${html}`, mode: 'prepended' };
}

/** 一次读取主表 + 绑定清单并编译 */
export function buildTableFromFiles({ csvPath = DEFAULT_CSV, bindingPath = DEFAULT_BINDINGS } = {}) {
  const entries = loadBindings(bindingPath);
  const rows = loadTableRows(csvPath);
  return { ...compileTable(rows, entries), entries, rows };
}
