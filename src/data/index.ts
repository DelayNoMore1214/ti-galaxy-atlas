import { FACTIONS_BASE } from './factionsBase';
import { FACTIONS_EXTRA } from './factionsExtra';
import { RELATIONS, RELATION_META } from './relations';
import { PLACES } from './places';
import { ERAS } from './eras';
import { GLOSSARY } from './glossary';
import { applyNameOverrides } from '../lib/nameOverrides';
import type { Faction, Relation } from './types';

export * from './types';
export { PLACES, ERAS, GLOSSARY, RELATIONS, RELATION_META };

export const FACTIONS: Faction[] = [...FACTIONS_BASE, ...FACTIONS_EXTRA];

export const FACTION_MAP: Record<string, Faction> = Object.fromEntries(
  FACTIONS.map((f) => [f.id, f])
);

export const CATEGORY_META: Record<
  string,
  { label: string; en: string; desc: string }
> = {
  great: { label: '伟大文明', en: 'Great Civilizations', desc: '银河社会的主干，也是"夺取王座"这件事最名正言顺的参与者。' },
  antagonist: { label: '敌对势力', en: 'Antagonist Factions', desc: '隐秘、好战或非人。有些根本不参与银河社会，本身就是威胁。' },
  council: { label: '议会机构', en: 'Council Body', desc: '不是文明，而是文明创造的工具。' },
  newcomer: { label: '新晋势力', en: 'Newcomers', desc: '在雷霆边缘星区打开后登上舞台的新面孔。' },
};

export const EDITION_META: Record<string, { label: string; short: string }> = {
  base: { label: '基础游戏', short: 'BASE' },
  pok: { label: '预言之王', short: 'PoK' },
  codex: { label: 'Codex 补充', short: 'CODEX' },
  thunder: { label: '雷霆边缘', short: 'TE' },
};

export const FORMS = [
  '人形',
  '兽人形',
  '爬行形',
  '水生',
  '昆虫',
  '植物',
  '机械',
  '能量生命',
  '蛇形',
  '鸟形',
  '异维度',
  '多族',
  '小型人形',
  '未知',
];

export function relationsOf(factionId: string): Relation[] {
  return RELATIONS.filter((r) => r.a === factionId || r.b === factionId);
}

export function otherSide(r: Relation, id: string): string {
  return r.a === id ? r.b : r.a;
}

export const SOURCES = [
  {
    name: 'Fantasy Flight Games · Twilight Imperium 第四版规则书（Learn to Play）',
    detail: '开篇的温哈兰编年史官叙事，是银河史（马哈克→拉扎克斯→暮色时代→夸恩事件→暮光战争→大清洗→黑暗年代）的官方主轴。',
    kind: '官方',
  },
  {
    name: 'Fantasy Flight Games · Guide to the Imperium',
    detail: '各族官方设定长文，包含母星描述、社会结构、在帝国中的位置。本站派系档案的主要依据。',
    kind: '官方',
  },
  {
    name: 'Prophecy of Kings 预览与背景文（FFG 官网 / 规则书）',
    detail: '马哈克归来、阿刻戎灾难、维伊尔-莱斯涌入，以及 7 个新派系的官方叙事。',
    kind: '官方',
  },
  {
    name: 'Twilight Codex Vol. I–IV（FFG 官方线上补充）',
    detail: '凯勒斯议会的组织章程、三执政人选与驻地安排。',
    kind: '官方',
  },
  {
    name: 'Thunder’s Edge 预览：Newcomers to the Galactic Stage（FFG, 2025）',
    detail: '最后壁垒、拉尔·内尔财团、深锻学者会、赤红叛乱、苍穹会／黑曜石的官方介绍。',
    kind: '官方',
  },
  {
    name: 'Embers of the Imperium（Genesys 跑团书，EDGE Studio）',
    detail: '为各派系补充了物种、母星与社会细节，并新增凯勒斯视角。',
    kind: '官方衍生',
  },
  {
    name: 'Twilight Imperium Wiki（Fandom）',
    detail: '母星与行星的风味文本汇编、派系索引、拉扎克斯语文本考据。用于补齐官方长文未覆盖的细节。',
    kind: '社区',
  },
  {
    name: 'MyGURPS · A Brief Primer of the Galaxy',
    detail: '把官方材料整理成带年份的编年表（27,000 / 3,000 / 2,600 / 300 / 32 / 30 / 5 年前），本站时间轴的刻度依据。',
    kind: '社区整理',
  },
  {
    name: 'Rex: Final Days of an Empire（FFG）',
    detail: '以帝都陷落为背景的衍生游戏，其叙事文本提供了战争末期的一手视角（如哈坎运输船、拉扎克斯战俘营）。',
    kind: '官方衍生',
  },
];

/**
 * 译名对照表覆盖：在任何组件读取数据之前原地改写译名。
 * 引用不变，因此 FACTION_MAP、星图/关系网（Canvas 上画的字）、弹窗都会同步看到新译名。
 * 映射块来自页面上内嵌的 #name-table-overrides（由 npm run names / vite 构建插件写入）。
 */
applyNameOverrides(
  FACTIONS_BASE,
  FACTIONS_EXTRA,
  PLACES,
  ERAS,
  GLOSSARY,
  RELATIONS,
  RELATION_META,
  CATEGORY_META,
  EDITION_META
);
