export type FactionCategory = 'great' | 'antagonist' | 'council' | 'newcomer';
export type Edition = 'base' | 'pok' | 'codex' | 'thunder';

export type RelationType =
  | 'blood' // 宿怨 / 战争 / 屠杀
  | 'vassal' // 主仆 / 奴役 / 占领
  | 'origin' // 同源 / 分裂 / 演化
  | 'creation' // 造物 / 唤醒 / 释放
  | 'alliance' // 同盟 / 合作
  | 'parasite' // 寄生 / 吞噬 / 利用
  | 'trade' // 贸易 / 利益
  | 'rival' // 竞争 / 对立主张
  | 'watch'; // 观察 / 守望

export interface Relation {
  a: string;
  b: string;
  type: RelationType;
  note: string;
  source: string;
}

export interface Faction {
  id: string;
  nameZh: string;
  nameEn: string;
  short: string; // 徽记上的字符
  category: FactionCategory;
  edition: Edition;
  species: string;
  speciesEn: string;
  form: string; // 物种形态分类，用于筛选
  homeworld: string;
  homeworldEn: string;
  region: string;
  keywords: string[];
  oneLiner: string;
  history: string[];
  society: string;
  lazaxRole: string;
  present: string;
  color: string;
  confidence?: 'solid' | 'single-source';
  sources: string[];
}

export interface Place {
  id: string;
  nameZh: string;
  nameEn: string;
  type: 'core' | 'homeworld' | 'anomaly' | 'station' | 'ruin' | 'beyond';
  region: string;
  desc: string;
  factions: string[];
  canon: boolean;
  pos: [number, number, number]; // 仅用于示意图排布，非官方坐标
  source: string;
}

export interface Era {
  id: string;
  order: number;
  span: string;
  title: string;
  subtitle: string;
  summary: string;
  events: { text: string; factions?: string[] }[];
  tint: string;
  tintName: string;
}

export interface GlossaryEntry {
  id: string;
  term: string;
  termEn: string;
  desc: string;
  factions: string[];
}
