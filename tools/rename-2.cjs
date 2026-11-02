const fs = require('fs');

const edits = [
  // ── L1Z1X → 拉扎克斯 ─────────────────────
  [
    'src/data/factionsBase.ts',
    "    nameZh: 'L1Z1X 思维网',",
    "    nameZh: '拉扎克斯',",
  ],
  [
    'src/data/factionsBase.ts',
    "他们自称 L1Z1X，外界叫他们\"利兹克斯\"。",
    "他们自称 L1Z1X，外界叫他们\"利兹克斯\"——如今他们要求别人叫他们拉扎克斯。",
  ],
  [
    'src/data/factionsBase.ts',
    '莫尔代是 L1Z1X 思维网里最有天赋的"增强师"之一。',
    '莫尔代是拉扎克斯思维网里最有天赋的"增强师"之一。',
  ],
  [
    'src/data/glossary.ts',
    "desc: 'L1Z1X 的社会形态：",
    "desc: '拉扎克斯（L1Z1X）的社会形态：",
  ],
  [
    'src/data/eras.ts',
    '{ text: \'30 年前："失落的拉扎克斯"以赛博格思维网 L1Z1X 的形态归来，宣称王座继承权，同时高速征服邻近世界。\'',
    '{ text: \'30 年前："失落的拉扎克斯"以赛博格思维网（L1Z1X）的形态归来，宣称王座继承权，同时高速征服邻近世界。\'',
  ],
  [
    'src/data/eras.ts',
    "{ text: '不久后：L1Z1X 的一个故障分支演化为自我复制的机械蜂群——内克罗病毒，被列为银河级威胁。'",
    "{ text: '不久后：该思维网的一个故障分支演化为自我复制的机械蜂群——内克罗病毒，被列为银河级威胁。'",
  ],
  [
    'src/data/relations.ts',
    "note: 'L1Z1X 正是大清洗的幸存者。",
    "note: '拉扎克斯（L1Z1X 思维网）正是大清洗的幸存者。",
  ],
  [
    'src/data/relations.ts',
    "note: '温哈主张王座继承权，L1Z1X 则自称拉扎克斯本体的延续。",
    "note: '温哈主张王座继承权，而赛博格思维网则自称拉扎克斯本体的延续。",
  ],
  [
    'src/data/relations.ts',
    "note: '内克罗病毒出自 L1Z1X 的\"增强师\"莫尔代。",
    "note: '内克罗病毒出自拉扎克斯思维网的\"增强师\"莫尔代。",
  ],
  [
    'src/data/places.ts',
    '如今它是 L1Z1X 思维网的首都',
    '如今它是拉扎克斯思维网的首都',
  ],
  [
    'src/data/places.ts',
    '这里曾经是 L1Z1X 的一处研究设施',
    '这里曾经是拉扎克斯思维网的一处研究设施',
  ],
  [
    'src/components/RelationGraph.tsx',
    '                L1Z1X、索尔或温哈，会看到三种互不相容的记忆。',
    '                拉扎克斯、索尔或温哈，会看到三种互不相容的记忆。',
  ],

  // ── 殷兄弟会 → 布鲁克·纳尔 ────────────────
  [
    'src/data/factionsBase.ts',
    "    nameZh: '殷兄弟会',",
    "    nameZh: '布鲁克·纳尔',",
  ],
  [
    'src/data/factionsBase.ts',
    '兄弟会由此成为银河中最虔诚也最阴沉的社群：',
    '这个教团由此成为银河中最虔诚也最阴沉的社群：',
  ],
  [
    'src/data/factionsBase.ts',
    '在殷的教义里，牺牲不是战术，是仪式。',
    '在布鲁克·纳尔的教义里，牺牲不是战术，是仪式。',
  ],
  [
    'src/data/glossary.ts',
    '在殷兄弟会中，病痕越深越受尊崇',
    '在布鲁克·纳尔中，病痕越深越受尊崇',
  ],
  [
    'src/data/relations.ts',
    "note: '殷兄弟会由人类克隆而成",
    "note: '布鲁克·纳尔由人类克隆而成",
  ],
  [
    'src/data/places.ts',
    "desc: '殷兄弟会的世界。",
    "desc: '布鲁克·纳尔的世界。",
  ],
];

let ok = 0;
const miss = [];
edits.forEach(([file, from, to]) => {
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes(from)) {
    miss.push(`${file} :: ${from.slice(0, 34)}`);
    return;
  }
  s = s.replace(from, to);
  fs.writeFileSync(file, s);
  ok += 1;
});

console.log('applied', ok, '/', edits.length);
if (miss.length) console.log('MISSED:\n' + miss.join('\n'));
