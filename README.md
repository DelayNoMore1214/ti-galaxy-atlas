<a id="zh"></a>

# 帝国曙光 · 银河档案 / Twilight Imperium Galaxy Atlas

《帝国曙光 第四版》（Twilight Imperium 4th Edition）世界观、银河史、地理与 30 个派系的设定资料档案站。

A single-file, story-driven lore archive for *Twilight Imperium 4th Edition* — its history, geography, and 30 factions.

**简体中文** · [English](#en)

[![Live Site](https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E8%AE%BF%E9%97%AE-delaynomore1214.github.io-c9a961)](https://delaynomore1214.github.io/ti-galaxy-atlas/)
[![Deploy](https://github.com/DelayNoMore1214/ti-galaxy-atlas/actions/workflows/deploy.yml/badge.svg)](https://github.com/DelayNoMore1214/ti-galaxy-atlas/actions/workflows/deploy.yml)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-0.166-000000?logo=three.js&logoColor=white)](https://threejs.org)

> 本站只讲设定，**不含任何规则与玩法内容**。

---

## 在线访问

<https://delaynomore1214.github.io/ti-galaxy-atlas/>

纯静态页面，构建产物是**单个 `dist/index.html`**（约 3 MB），所有 JS、CSS、24 张派系插图（500px）全部内联，运行时零外部请求，下载后可离线双击打开。

## 内容

| 章节 | 锚点 | 内容 |
| --- | --- | --- |
| 序章 | `#top` | 开场视觉 |
| 王座 | `#prologue` | 王座空悬与帝国继承危机 |
| 编年史 | `#chronicle` | 9 幕银河史，从马哈克到暮光战争 |
| 星图 | `#geo` | 三维星系图，33 个地点（母星、星区、遗迹） |
| 派系 | `#factions` | 30 个派系档案，按类别／版本／物种形态筛选 |
| 关系 | `#network` | 力导向关系网，59 条关系、9 种关系类型 |
| 辞典 | `#lexicon` | 22 条术语 |
| 来源 | `#sources` | 官方与社区参考资料及归属说明 |

**30 个派系**分四类：伟大文明（Great Civilizations）、敌对势力（Antagonist Factions）、议会机构（Council Body）、新晋势力（Newcomers），覆盖基础游戏、预言之王（PoK）、Codex 补充与雷霆边缘（Thunder's Edge）。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript 5.5 |
| 构建 | Vite 5 + `vite-plugin-singlefile`（产物合并为单 HTML） |
| 三维 | Three.js 0.166 —— 星空背景、三维星系图 |
| 动效 | framer-motion 11 + CSS + IntersectionObserver 滚动进场 |
| 关系网 | 自研力导向布局（Canvas 渲染，支持拖拽、聚焦、缩略图节点） |
| 纹章 | 程序化生成（FNV-1a 哈希 → 确定性几何纹章），无图派系的回退方案 |
| 部署 | GitHub Actions → GitHub Pages |

## 目录结构

```
ti-galaxy-atlas/
├── .github/workflows/deploy.yml   推送 main 自动构建并发布 Pages
├── src/
│   ├── main.tsx                   入口
│   ├── App.tsx                    章节编排、深链、滚动进场
│   ├── components/                15 个组件（星图、关系网、弹窗、导航…）
│   ├── data/                      内容层：派系 / 地点 / 纪元 / 术语 / 关系
│   ├── lib/                       程序化纹章、环境开关
│   ├── styles/global.css
│   └── assets/portraits/          24 张派系插图（构建时 base64 内联）
├── tools/                         开发期脚本（图片压缩、批量改名、截图）
├── index.html
└── vite.config.ts
```

## 本地开发

需要 Node.js 18+（开发时使用 20）。

```bash
npm install
npm run dev        # 开发服务器
npm run build      # 产出 dist/index.html
npm run preview    # 预览构建产物
```

## 部署

推送到 `main` 即触发 `.github/workflows/deploy.yml`：

```
npm ci → npm run build → upload-pages-artifact → deploy-pages
```

约 1 分钟后线上自动更新。`dist/` 与 `node_modules/` 不入库，构建全部在 CI 完成。

首次克隆到你自己的账号时需要做的：

1. 仓库 Settings → Pages → Source 选择 **GitHub Actions**；
2. 推一次 `main`，等待 Actions 变绿。

## URL 参数

| 参数 | 作用 |
| --- | --- |
| `?open=<faction-id>` | 直接打开某派系详情，如 `?open=sol` |
| `?scroll=<section>` | 直接定位某章节，如 `?scroll=geo` |
| `?static=1` | 静态模式：只渲染少量帧后停止动画，供无头截图与低性能设备使用 |

## 维护内容

派系数据在 `src/data/factionsBase.ts`（17 个）与 `src/data/factionsExtra.ts`（13 个），字段定义见 `src/data/types.ts`。

新增派系：

1. 在 `factionsExtra.ts` 追加一条记录，`id` 用小写英文；
2. 可选：把插图放到 `src/assets/portraits/<id>.jpg`（`portraits.ts` 用 `import.meta.glob` 自动收录，无需登记）；
3. 关系写在 `src/data/relations.ts`，用 `a` / `b` 两端的 `id` 连接。

改动后 `npm run build` 会自动重新内联全部资源。

浏览器自动设置了 `prefers-reduced-motion: reduce` 时，动画会自动降级。

## 版权

Twilight Imperium 及相关名称为 **Fantasy Flight Games** 的商标与版权作品。本站为非官方同人资料站，内容为中文译述与整理，不含规则内容；译名采用社区习惯译法。

派系插图版权归 Fantasy Flight Games 所有，已压缩内联，仅作标识用途；未收录插图的派系使用程序生成的几何纹章。

---

<a id="en"></a>

# Twilight Imperium Galaxy Atlas

A lore archive for *Twilight Imperium 4th Edition*: galactic history, geography, and 30 factions.

[简体中文](#zh) · **English**

[![Live Site](https://img.shields.io/badge/Live%20Site-delaynomore1214.github.io-c9a961)](https://delaynomore1214.github.io/ti-galaxy-atlas/)

> Lore only. **No rules or gameplay content.**

## Live

<https://delaynomore1214.github.io/ti-galaxy-atlas/>

A fully static site. The build output is a **single `dist/index.html`** (~3 MB) with every JS chunk, stylesheet, and all 24 faction portraits inlined — zero runtime requests, and it opens offline by double-clicking.

## Sections

| Section | Anchor | Content |
| --- | --- | --- |
| Prologue | `#top` | Opening sequence |
| The Throne | `#prologue` | The vacant throne and the succession crisis |
| Chronicle | `#chronicle` | 9 acts of galactic history, from the Mahact to the Twilight Wars |
| Star Map | `#geo` | 3D galaxy map with 33 locations (homeworlds, sectors, ruins) |
| Factions | `#factions` | 30 dossiers, filterable by category, edition, and species form |
| Relations | `#network` | Force-directed network of 59 relations across 9 relation types |
| Lexicon | `#lexicon` | 22 terms |
| Sources | `#sources` | Official and community references with attribution |

The **30 factions** fall into four categories — Great Civilizations, Antagonist Factions, Council Body, and Newcomers — spanning the base game, Prophecy of Kings, the Codex supplements, and Thunder's Edge.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | React 18 + TypeScript 5.5 |
| Build | Vite 5 with `vite-plugin-singlefile` (output collapses into one HTML file) |
| 3D | Three.js 0.166 — animated starfield and the 3D star map |
| Motion | framer-motion 11, CSS transitions, IntersectionObserver reveals |
| Relation graph | Hand-rolled force simulation on Canvas with drag, focus, and portrait nodes |
| Crests | Procedurally generated (FNV-1a hash → deterministic geometry) for factions without art |
| Deploy | GitHub Actions → GitHub Pages |

## Project layout

```
ti-galaxy-atlas/
├── .github/workflows/deploy.yml   Build and publish Pages on push to main
├── src/
│   ├── main.tsx                   Entry
│   ├── App.tsx                    Section orchestration, deep links, scroll reveals
│   ├── components/                15 components (star map, relation graph, modals, nav)
│   ├── data/                      Content layer: factions, places, eras, glossary, relations
│   ├── lib/                       Procedural crests, environment flags
│   ├── styles/global.css
│   └── assets/portraits/          24 faction portraits (base64-inlined at build)
├── tools/                         Dev scripts (image compression, bulk renames, screenshots)
├── index.html
└── vite.config.ts
```

## Getting started

Node.js 18+ (developed on 20).

```bash
npm install
npm run dev        # Dev server
npm run build      # Emits dist/index.html
npm run preview    # Preview the build
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`:

```
npm ci → npm run build → upload-pages-artifact → deploy-pages
```

The live site updates about a minute later. `dist/` and `node_modules/` are untracked; everything is built in CI.

To fork and deploy under your own account:

1. Repo Settings → Pages → Source: **GitHub Actions**;
2. Push to `main` and wait for the Action to go green.

## URL parameters

| Parameter | Effect |
| --- | --- |
| `?open=<faction-id>` | Open a faction dossier directly, e.g. `?open=sol` |
| `?scroll=<section>` | Jump to a section, e.g. `?scroll=geo` |
| `?static=1` | Static mode: render a few frames then halt animation (headless screenshots, low-end devices) |

## Editing content

Faction data lives in `src/data/factionsBase.ts` (17 entries) and `src/data/factionsExtra.ts` (13 entries); the schema is in `src/data/types.ts`.

Adding a faction:

1. Append a record to `factionsExtra.ts` with a lowercase `id`;
2. Optional: drop art at `src/assets/portraits/<id>.jpg` — `portraits.ts` picks it up via `import.meta.glob`, no registration needed;
3. Add relations in `src/data/relations.ts`, referencing both sides by `id`.

`npm run build` re-inlines every asset automatically. Animations degrade gracefully under `prefers-reduced-motion: reduce`.

## Legal

Twilight Imperium and related marks are trademarks and copyrights of **Fantasy Flight Games**. This is an unofficial fan archive of translated and compiled lore, with no rules content included. Chinese names follow common community translations.

Faction illustrations remain the property of Fantasy Flight Games; they are compressed and inlined for identification purposes only. Factions without official art use procedurally generated geometric crests.
