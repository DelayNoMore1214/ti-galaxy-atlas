/**
 * 术语表 · 共享核心
 *
 * 唯一数据源：项目根目录 glossary-cn-en.csv（CN / EN / 类别 / 备注）。
 * 职责：解析术语表 → 与页面数据（src/data）自动对齐 → 编译成运行时覆盖表 → 注入 dist/index.html。
 *
 * 对齐方式：
 *   1) 英文名匹配（忽略大小写、The、撇号、括号）；
 *   2) tools/glossaryAliases.json 里的人工对齐（人物、组织、正文别称等英文对不上的）；
 *   3) 中文名完全相同的直接沿用。
 * 页面没有出现的术语会被忽略（术语表本身比站点内容全），不会报错。
 *
 * 编译产物：
 *   { factions: { id: { nameZh, species } }, places: { id: { nameZh } },
 *     eras: { id: { title } }, glossary: { id: { term } }, text: { 原文: 显示译名 } }
 * 运行时先做正文替换（text），再按 id 精确覆盖实体字段；因此正文可以用「词干」而卡片用全称。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BLOCK_ID = 'glossary-overrides';
export const BLOCK_START = '<!-- GLOSSARY_START -->';
export const BLOCK_END = '<!-- GLOSSARY_END -->';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GLOSSARY_CSV = path.join(ROOT, 'glossary-cn-en.csv');
export const ALIASES = path.join(ROOT, 'tools', 'glossaryAliases.json');
export const DIST_HTML = path.join(ROOT, 'dist', 'index.html');
export const CSV_HEADER = ['CN', 'EN', '类别', '备注'];

/** 派系全称 → 正文词干时可剥掉的后缀（按长度优先匹配） */
const STEM_SUFFIXES = [
  '余烬军团',
  '酋长国',
  '男爵领',
  '兄弟会',
  '智慧体',
  '小行星带',
  '氏族',
  '学盟',
  '王国',
  '联盟',
  '部落',
  '军团',
  '幽灵',
  '病毒',
  '联邦',
  '帝国',
  '议会',
  '集体',
  '诸王',
  '族',
  '男爵',
];

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
  if (nonEmpty.length === 0) return [];
  const header = nonEmpty[0].fields.map((f) => f.trim().toLowerCase());
  const hasHeader = header.includes('cn') && header.includes('en');
  const idx = {
    cn: hasHeader ? header.indexOf('cn') : 0,
    en: hasHeader ? header.indexOf('en') : 1,
    category: hasHeader ? header.indexOf('类别') : 2,
    note: hasHeader ? header.indexOf('备注') : 3,
  };

  return (hasHeader ? nonEmpty.slice(1) : nonEmpty)
    .map((r) => ({
      cn: (r.fields[idx.cn] ?? '').trim(),
      en: (r.fields[idx.en] ?? '').trim(),
      category: idx.category >= 0 ? (r.fields[idx.category] ?? '').trim() : '',
      note: idx.note >= 0 ? (r.fields[idx.note] ?? '').trim() : '',
      line: r.line,
    }))
    .filter((r) => r.cn || r.en);
}

export function normalizeEn(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`´]/g, "'")
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 剥掉括号说明：阿博瑞克（植物／真菌共生体） → 阿博瑞克 */
function stripParen(value) {
  return String(value || '').replace(/[（(][^）)]*[）)]/g, '').trim();
}

/** 拆分复合写法：弧首星 / 雷恩·特拉（基纳拉三星系） */
function splitParts(value) {
  return String(value || '')
    .split(/[／/]/)
    .map((part) => stripParen(part))
    .filter(Boolean);
}

export function loadGlossary(csvPath = GLOSSARY_CSV) {
  if (!fs.existsSync(csvPath)) throw new Error(`找不到术语表：${csvPath}`);
  return parseCsv(fs.readFileSync(csvPath, 'utf8'));
}

export function indexGlossary(rows) {
  const byEn = new Map();
  const byCn = new Map();
  const push = (map, key, row) => {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  };
  for (const row of rows) {
    push(byEn, normalizeEn(row.en), row);
    push(byCn, row.cn, row);
  }
  return { byEn, byCn };
}

function readDataFile(name) {
  return fs.readFileSync(path.join(ROOT, 'src', 'data', name), 'utf8');
}

function splitBlocks(text) {
  return text
    .split(/\n  \{\n/)
    .slice(1)
    .map((chunk) => chunk.split('\n  },')[0]);
}

function field(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*'([^']*)'`));
  return match ? match[1] : '';
}

/** 读取页面上的实体清单（派系 / 地点 / 纪元 / 辞典） */
export function loadPageTerms() {
  const factions = [];
  for (const file of ['factionsBase.ts', 'factionsExtra.ts']) {
    for (const block of splitBlocks(readDataFile(file))) {
      const id = field(block, 'id');
      if (!id) continue;
      factions.push({
        id,
        nameZh: field(block, 'nameZh'),
        nameEn: field(block, 'nameEn'),
        species: field(block, 'species'),
        speciesEn: field(block, 'speciesEn'),
        homeworld: field(block, 'homeworld'),
        homeworldEn: field(block, 'homeworldEn'),
        region: field(block, 'region'),
      });
    }
  }

  const places = splitBlocks(readDataFile('places.ts'))
    .map((block) => ({
      id: field(block, 'id'),
      nameZh: field(block, 'nameZh'),
      nameEn: field(block, 'nameEn'),
    }))
    .filter((p) => p.id);

  const eras = splitBlocks(readDataFile('eras.ts'))
    .map((block) => ({
      id: field(block, 'id'),
      title: field(block, 'title'),
      subtitle: field(block, 'subtitle'),
    }))
    .filter((e) => e.id);

  const terms = splitBlocks(readDataFile('glossary.ts'))
    .map((block) => ({
      id: field(block, 'id'),
      term: field(block, 'term'),
      termEn: field(block, 'termEn'),
    }))
    .filter((t) => t.id);

  return { factions, places, eras, terms };
}

export function loadAliases(aliasPath = ALIASES) {
  if (!fs.existsSync(aliasPath)) return { entities: {}, text: {}, skip: [] };
  const data = JSON.parse(fs.readFileSync(aliasPath, 'utf8'));
  return {
    entities: data.entities ?? {},
    text: data.text ?? {},
    skip: Array.isArray(data.skip) ? data.skip : [],
  };
}

/** 「类别｜英文」或「英文」或「中文」→ 术语表行 */
export function resolveRef(ref, index) {
  const text = String(ref || '').trim();
  if (!text) return null;
  const sep = text.indexOf('｜') >= 0 ? '｜' : text.indexOf('|') >= 0 ? '|' : null;
  if (sep) {
    const [category, key] = text.split(sep).map((s) => s.trim());
    const list = (index.byEn.get(normalizeEn(key)) || index.byCn.get(key) || []).filter(
      (row) => !category || row.category === category
    );
    return list[0] ?? null;
  }
  const list = index.byEn.get(normalizeEn(text)) || index.byCn.get(text) || [];
  return list[0] ?? null;
}

function pickRow(rows, categoryHints) {
  if (!rows || rows.length === 0) return null;
  if (categoryHints && categoryHints.length > 0) {
    for (const category of categoryHints) {
      const hit = rows.find((row) => row.category === category);
      if (hit) return hit;
    }
    return null; // 类别不符就不要硬配（否则「Winnu」会把派系名配到星球上）
  }
  return rows[0];
}

function findByEn(index, value, categoryHints) {
  const key = normalizeEn(value);
  if (!key) return null;
  return pickRow(index.byEn.get(key), categoryHints);
}

function findByCn(index, value, categoryHints) {
  if (!value) return null;
  return pickRow(index.byCn.get(stripParen(value)), categoryHints);
}

export function deriveText(cn, kind) {
  if (kind === 'plain') return cn;
  if (kind === 'race') {
    if (cn.endsWith('虫人')) return cn; // 诺尔虫人 不拆
    return cn.endsWith('人') && cn.length > 2 ? cn.slice(0, -1) : cn;
  }
  for (const suffix of [...STEM_SUFFIXES].sort((a, b) => b.length - a.length)) {
    if (cn.endsWith(suffix) && cn.length - suffix.length >= 2) {
      return cn.slice(0, -suffix.length);
    }
  }
  return cn;
}

function normalizeAlias(value) {
  if (!value) return null;
  if (typeof value === 'string') return { ref: value, mode: 'plain' };
  return { ref: value.ref || value.row || '', mode: value.mode || 'plain' };
}

/**
 * 把术语表对齐到页面词条。
 * 返回 { entities, text, applied, unmatchedPage, usedRows, warnings }
 */
export function linkTerms({ rows, terms, aliases }) {
  const index = indexGlossary(rows);
  const entities = {};
  const text = {};
  const textEn = {};
  const warnings = [];
  const usedRows = new Set();
  const applied = [];
  const unmatchedPage = [];

  const setEntity = (kind, id, field, value) => {
    entities[kind] ??= {};
    entities[kind][id] ??= {};
    entities[kind][id][field] = value;
  };
  const aliasKeys = new Set(Object.keys(aliases.text));
  const aliasApplied = new Set();
  const setText = (key, value, force = false) => {
    if (!key || !value || key === value) return;
    // 纯英文键只在「中文展示字段」里替换（不会动 nameEn/speciesEn 等）
    if (!/[\u4e00-\u9fff]/.test(key)) {
      if (textEn[key] && textEn[key] !== value && !force) {
        warnings.push(`英文正文映射冲突：「${key}」既是「${textEn[key]}」又是「${value}」，以先出现的为准`);
        return;
      }
      textEn[key] = value;
      return;
    }
    // 人工别名优先级最高，自动对齐不要和它抢同一个键
    if (!force && aliasKeys.has(key)) return;
    if (!force && text[key] && text[key] !== value) {
      warnings.push(`正文映射冲突：「${key}」既是「${text[key]}」又是「${value}」，以先出现的为准`);
      return;
    }
    text[key] = value;
  };
  const record = (row, where) => {
    usedRows.add(row);
    applied.push({ cn: row.cn, en: row.en, category: row.category, where });
  };

  for (const faction of terms.factions) {
    const aliasName = aliases.entities[`faction:${faction.id}:name`];
    const nameRow =
      (aliasName ? resolveRef(aliasName, index) : null) ||
      findByEn(index, faction.nameEn, ['派系名称', '组织机构']) ||
      findByCn(index, faction.nameZh, ['派系名称']);
    if (nameRow) {
      setEntity('factions', faction.id, 'nameZh', nameRow.cn);
      // 页面原本就是全长名（哈坎酋长国）时，正文里要保留全称，另外补一条词干（哈坎）；
      // 页面原本是简称（巴鲁尼、卓恩）时，正文用新词干即可。
      const pageStem = deriveText(faction.nameZh, 'faction');
      if (pageStem !== faction.nameZh) {
        setText(faction.nameZh, nameRow.cn);
        setText(pageStem, deriveText(nameRow.cn, 'faction'));
      } else {
        setText(faction.nameZh, deriveText(nameRow.cn, 'faction'));
      }
      record(nameRow, `派系 ${faction.id} · 名称`);
    } else {
      unmatchedPage.push(`派系名称：${faction.nameZh}（${faction.nameEn}）`);
    }

    const aliasSpecies = aliases.entities[`faction:${faction.id}:species`];
    const speciesRow =
      (aliasSpecies ? resolveRef(aliasSpecies, index) : null) ||
      findByEn(index, stripParen(faction.speciesEn), ['种族/物种']) ||
      findByCn(index, stripParen(faction.species), ['种族/物种']);
    if (speciesRow) {
      const paren = (faction.species.match(/[（(][^）)]*[）)]\s*$/) || [''])[0];
      setEntity('factions', faction.id, 'species', `${speciesRow.cn}${paren}`);
      setText(stripParen(faction.species), deriveText(speciesRow.cn, 'race'));
      record(speciesRow, `派系 ${faction.id} · 种族`);
    }

    // 母星：拆成单个星球，逐个对齐；全部对上时把整串也换成中文
    const cnParts = splitParts(faction.homeworld);
    const enParts = splitParts(faction.homeworldEn);
    const mappedHome = [];
    cnParts.forEach((part, i) => {
      const alias = normalizeAlias(aliases.text[part]);
      const row =
        (alias ? resolveRef(alias.ref, index) : null) ||
        findByEn(index, enParts[i], ['星球', '地点', '恒星/星系']) ||
        findByCn(index, part, ['星球', '地点', '恒星/星系']);
      if (row) {
        const display = deriveText(row.cn, alias?.mode || 'plain');
        setText(part, display);
        mappedHome.push(display);
        record(row, `派系 ${faction.id} · 母星`);
      } else {
        mappedHome.push(null);
      }
    });
    if (mappedHome.length > 1 && mappedHome.every(Boolean)) {
      setEntity('factions', faction.id, 'homeworld', mappedHome.join(' / '));
    }

    const aliasRegion = normalizeAlias(aliases.text[faction.region]);
    const regionRow = aliasRegion ? resolveRef(aliasRegion.ref, index) : null;
    if (regionRow) {
      setText(faction.region, deriveText(regionRow.cn, aliasRegion.mode), true);
      record(regionRow, `派系 ${faction.id} · 星区`);
    }
  }

  for (const place of terms.places) {
    const rawAlias = aliases.entities[`place:${place.id}:name`] || aliases.text[place.nameZh];
    const alias = normalizeAlias(rawAlias);
    const cnParts = splitParts(place.nameZh);
    const enParts = splitParts(place.nameEn);
    const parenSuffix = (place.nameZh.match(/[（(][^）)]*[）)]\s*$/) || [''])[0];
    const mapped = [];
    cnParts.forEach((part, i) => {
      const partAlias = normalizeAlias(aliases.text[part]);
      const row =
        (alias && cnParts.length === 1 ? resolveRef(alias.ref, index) : null) ||
        (partAlias ? resolveRef(partAlias.ref, index) : null) ||
        findByEn(index, enParts[i], ['星球', '地点', '恒星/星系', '组织机构']) ||
        findByCn(index, part, ['星球', '地点', '恒星/星系']);
      if (row) {
        const display = deriveText(row.cn, partAlias?.mode || alias?.mode || 'plain');
        mapped.push(display);
        setText(part, display);
        record(row, `地点 ${place.id}`);
      } else {
        mapped.push(null);
      }
    });
    if (mapped.length > 0 && mapped.every(Boolean)) {
      const joined = mapped.join(' / ');
      setEntity('places', place.id, 'nameZh', cnParts.length === 1 ? `${joined}${parenSuffix}` : joined);
    }
  }

  for (const era of terms.eras) {
    const alias = aliases.entities[`era:${era.id}:title`];
    const row =
      (alias ? resolveRef(alias, index) : null) ||
      findByEn(index, era.subtitle, ['事件/时代']) ||
      findByCn(index, era.title, ['事件/时代']);
    if (row) {
      setEntity('eras', era.id, 'title', row.cn);
      setText(era.title, row.cn);
      record(row, `编年史 ${era.id}`);
    }
  }

  for (const term of terms.terms) {
    const alias = aliases.entities[`glossary:${term.id}:term`] || aliases.text[term.term];
    const row =
      (alias ? resolveRef(alias, index) : null) ||
      findByEn(index, term.termEn, []) ||
      findByCn(index, term.term, []) ||
      null;
    if (row) {
      setEntity('glossary', term.id, 'term', row.cn);
      setText(term.term, row.cn);
      record(row, `辞典 ${term.id}`);
    }
  }

  // 纯正文别名（人物、组织、事件别称等）；优先级最高，覆盖自动对齐结果
  for (const [original, raw] of Object.entries(aliases.text)) {
    if (!original) continue;
    const alias = normalizeAlias(raw);
    const row = resolveRef(alias.ref, index);
    if (!row) {
      warnings.push(`别名失效：「${original}」→「${alias.ref}」在术语表里找不到`);
      continue;
    }
    setText(original, deriveText(row.cn, alias.mode), true);
    aliasApplied.add(original);
    record(row, '正文别名');
  }

  return { entities, text, textEn, applied, unmatchedPage, usedRows, warnings, aliasKeys: aliasApplied };
}

export function compile({ rows, terms, aliases }) {
  const linked = linkTerms({ rows, terms, aliases });
  const sortByLength = (obj) =>
    Object.fromEntries(
      Object.entries(obj).sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0], 'zh'))
    );

  const table = {
    v: 2,
    generated: new Date().toISOString(),
    factions: linked.entities.factions ?? {},
    places: linked.entities.places ?? {},
    eras: linked.entities.eras ?? {},
    glossary: linked.entities.glossary ?? {},
    text: sortByLength(linked.text),
    textEn: sortByLength(linked.textEn ?? {}),
  };

  const stats = {
    rows: rows.length,
    applied: linked.usedRows.size,
    textPairs: Object.keys(table.text).length,
    textEnPairs: Object.keys(table.textEn).length,
    entityPairs:
      Object.values(table.factions).reduce((n, o) => n + Object.keys(o).length, 0) +
      Object.keys(table.places).length +
      Object.keys(table.eras).length +
      Object.keys(table.glossary).length,
    unmatchedPage: linked.unmatchedPage,
  };

  return { table, stats, warnings: linked.warnings, applied: linked.applied, aliasKeys: linked.aliasKeys };
}

export function buildBlock(table) {
  const json = JSON.stringify(table).replace(/<\//g, '<\\/');
  return [
    BLOCK_START,
    `    <script type="text/plain" id="${BLOCK_ID}">${json}</script>`,
    BLOCK_END,
  ].join('\n');
}

export function extractBlock(html) {
  const start = html.indexOf(BLOCK_START);
  const end = html.indexOf(BLOCK_END);
  if (start === -1 || end === -1 || end < start) return null;
  return html.slice(start, end + BLOCK_END.length);
}

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

export function buildFromFiles({ csvPath = GLOSSARY_CSV, aliasPath = ALIASES } = {}) {
  const rows = loadGlossary(csvPath);
  const terms = loadPageTerms();
  const aliases = loadAliases(aliasPath);
  const result = compile({ rows, terms, aliases });
  return { ...result, rows, terms, aliases };
}
