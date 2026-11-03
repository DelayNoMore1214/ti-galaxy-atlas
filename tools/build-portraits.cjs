const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SRC = path.join(os.homedir(), 'WorkBuddy', '2026-11-02-03-39-00', '帝国曙光', '派系缩略图');
const OUT = path.resolve('src/assets/portraits');
fs.mkdirSync(OUT, { recursive: true });

// 文件 → 派系 id（按角色所属派系人工核对）
const MAP = [
  ['Dirzuga Rophal.png', 'arborec'],
  ['Baron Unlenn.png', 'letnev'],
  ['The Lay of Lisis.png', 'saar'],
  ['Fire Warden Umbat.png', 'muaat'],
  ['Hacan Carth.png', 'hacan'],
  ['Supreme Admiral DeLouis.png', 'sol'],
  ['Emissary Taivra.png', 'creuss'],
  ['Diplomat 2RAM.png', 'l1z1x'],
  ['Erwan Mentak, Founder of the Coalition.png', 'mentak'],
  ['Q’uesh Sish.png', 'naalu'],
  ['Mordai, The First.png', 'nekro'],
  ['G’hom Sek’kus.png', 'norr'],
  ['Doctor Sucaban.png', 'jolnar'],
  ['Muad Di Faruuq.png', 'winnu'],
  ['Elder Qanoj.png', 'xxcha'],
  ['Brother Milor.png', 'yin'],
  ['Ssruu.png', 'yssaril'],
  ['Sakora Aun Navori, Argent Vanguard.png', 'argent'],
  ['Conservator Procyon.png', 'empyrean'],
  ['Airo Shir Aur.png', 'mahact'],
  ['Tetrarch Clik.png', 'naazrokha'],
  ['The Nomad.png', 'nomad'],
  ['Pyrolusius the Observer.png', 'titans'],
  ['That Which Molds Flesh.png', 'vuilraith'],
];

// 弹窗里按 250×250 CSS px 显示，输出 500×500 以覆盖 2x 屏
const SIZE = 500;

let done = 0;
const missing = [];

MAP.forEach(([file, id]) => {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) {
    missing.push(file);
    return;
  }
  const w = Number(
    execFileSync('sips', ['-g', 'pixelWidth', src], { encoding: 'utf8' }).match(/pixelWidth: (\d+)/)[1]
  );
  const crop = Math.round(w * 0.93);
  const tmp = path.join(OUT, id + '.tmp.jpg');
  execFileSync('sips', ['-c', String(crop), String(crop), src, '--out', tmp], { stdio: 'ignore' });
  const out = path.join(OUT, id + '.jpg');
  execFileSync(
    'sips',
    ['-Z', String(SIZE), '-s', 'format', 'jpeg', '-s', 'formatOptions', '78', tmp, '--out', out],
    { stdio: 'ignore' }
  );
  fs.unlinkSync(tmp);
  done += 1;
});

const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.jpg'));
const bytes = files.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`converted ${done}, files ${files.length}, total ${(bytes / 1024).toFixed(0)} KB`);
if (missing.length) console.log('MISSING:', missing.join(', '));
