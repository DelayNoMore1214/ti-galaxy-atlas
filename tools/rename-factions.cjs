const fs = require('fs');
const path = require('path');

const files = [
  'src/data/factionsBase.ts',
  'src/data/factionsExtra.ts',
  'src/data/places.ts',
  'src/data/eras.ts',
  'src/data/relations.ts',
  'src/data/glossary.ts',
  'src/data/index.ts',
  'src/components/Hero.tsx',
  'src/components/Prologue.tsx',
  'src/components/GeoSection.tsx',
  'src/components/Bestiary.tsx',
  'src/components/RelationGraph.tsx',
  'src/components/Lexicon.tsx',
  'src/components/Sources.tsx',
  'src/components/FactionModal.tsx',
];

// 顺序重要：先处理长词，避免被短词替换破坏
const MAP = [
  ['纳鲁集合体', '纳鲁集体'],
  ['温纳兰', '温哈兰'],
  ['穆阿特余烬', '穆阿特'],
  ['乔尔-纳尔', '卓恩'],
  ['萨达克·诺尔', '萨尔达克·诺尔'],
  ['奈克罗', '内克罗'],
  ['克鲁斯', '克瑞斯'],
  ['萨阿尔', '萨尔'],
  ['伊萨里尔', '伊萨瑞尔'],
  ['莱特涅夫', '巴鲁尼'],
  ['阿伯雷克', '阿博瑞克'],
  ['温努', '温哈'],
  ['克萨查', '伊克斯查'],
];

let total = 0;
const report = {};

files.forEach((rel) => {
  const p = path.resolve(rel);
  if (!fs.existsSync(p)) return;
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;
  MAP.forEach(([from, to]) => {
    const n = s.split(from).length - 1;
    if (n > 0) {
      s = s.split(from).join(to);
      total += n;
      report[from] = (report[from] || 0) + n;
    }
  });
  if (s !== orig) fs.writeFileSync(p, s);
});

console.log('替换次数合计:', total);
console.log(report);
