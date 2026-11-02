const fs = require('fs');
const p = 'src/styles/global.css';
let css = fs.readFileSync(p, 'utf8');

// 1) 注入倍率变量，并加宽竖向导航栏
css = css.replace(
  '  --nav-w: 84px;',
  '  --nav-w: 92px;\n  --fs: 1.25;\n  --fs-display: 1.1;'
);

// 2) 逐行把 font-size 换成 calc(... * var(--fs))
const displaySel = ['.hero h1', 'h2.title', '.era-num', '.modal-head h2'];
const lines = css.split('\n');
let sel = '';
let count = 0;
const out = lines.map((line) => {
  const t = line.trim();
  if (t.endsWith('{')) sel = t.slice(0, -1).trim();
  const m = line.match(/^(\s*)font-size:\s*([^;]+);\s*$/);
  if (!m) return line;
  const indent = m[1];
  const val = m[2].trim();
  if (val.endsWith('em')) return line; // em 会跟随父级，跳过
  const v = displaySel.includes(sel) ? '--fs-display' : '--fs';
  count += 1;
  return `${indent}font-size: calc(${val} * var(${v}));`;
});
css = out.join('\n');

// 3) 同步放大的版面常量
const ruleEdits = [
  ['.nav {', 'height: 46px;', 'height: 52px;'],
  ['.hero-quote {', 'max-width: 520px;', 'max-width: 640px;'],
  ['.prose p {', 'max-width: 760px;', 'max-width: 840px;'],
  ['.lede {', 'max-width: 720px;', 'max-width: 800px;'],
  ['.era {', 'grid-template-columns: 128px 1fr;', 'grid-template-columns: 148px 1fr;'],
  ['.rel-item {', 'grid-template-columns: 92px 1fr;', 'grid-template-columns: 106px 1fr;'],
  ['.src {', 'grid-template-columns: 96px 1fr;', 'grid-template-columns: 110px 1fr;'],
  ['.faction-card .one-liner {', 'min-height: 52px;', 'min-height: 65px;'],
  ['.modal {', 'max-width: 880px;', 'max-width: 940px;'],
  ['.map-shell {', 'height: 560px;', 'height: 600px;'],
  ['.graph-shell {', 'height: 620px;', 'height: 680px;'],
];

const replaceInRule = (src, selector, from, to) => {
  const i = src.indexOf(selector);
  if (i === -1) return src;
  const end = src.indexOf('}', i);
  if (end === -1) return src;
  const block = src.slice(i, end);
  if (!block.includes(from)) return src;
  return src.slice(0, i) + block.replace(from, to) + src.slice(end);
};

ruleEdits.forEach(([s, a, b]) => {
  css = replaceInRule(css, s, a, b);
});

css = css.replace('height: 460px;', 'height: 500px;'); // 移动端关系图

fs.writeFileSync(p, css);
console.log('font-size 改写条数:', count);
console.log('变量:', /--fs: 1\.25;/.test(css), /--fs-display: 1\.1;/.test(css));
console.log('剩余未包裹的 px 字号:', (css.match(/font-size:\s*[\d.]+px;/g) || []).length);
