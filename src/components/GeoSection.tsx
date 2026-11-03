import { useMemo, useState } from 'react';
import GalaxyMap, { MapLink, MapNode } from './GalaxyMap';
import NarrativeOrbit from './NarrativeOrbit';
import WarpDiagram from './WarpDiagram';
import PlaceModal from './PlaceModal';
import { FACTION_MAP, PLACES } from '../data';
import type { Place } from '../data';

const PLACE_COLOR: Record<string, string> = {
  core: '#c9a961',
  homeworld: '#8fa87f',
  anomaly: '#6f7fd8',
  station: '#c9a94f',
  ruin: '#b07a3c',
  beyond: '#9a8fb8',
};

const PLACE_TYPE_LABEL: Record<string, string> = {
  core: '核心',
  homeworld: '母星系',
  anomaly: '异常区',
  station: '空间站',
  ruin: '废墟',
  beyond: '银河之外',
};

const CANON_LINKS: MapLink[] = [
  { a: 'mecatol', b: 'ixth', color: '#a03a58', alpha: 0.5 },
  { a: 'mecatol', b: 'quann', color: '#c9a94f', alpha: 0.4 },
  { a: 'quann', b: 'shaleri', color: '#8cb0e0', alpha: 0.3 },
  { a: 'shaleri', b: 'creuss-home', color: '#8cb0e0', alpha: 0.45 },
  { a: 'shaleri', b: 'acheron', color: '#b8425a', alpha: 0.4 },
  { a: 'mecatol', b: 'nexus', color: '#8cb0e0', alpha: 0.22 },
  { a: 'arc-prime', b: 'quann', color: '#d0514b', alpha: 0.3 },
  { a: 'jord', b: 'quann', color: '#d0514b', alpha: 0.3 },
  { a: 'mecatol', b: 'the-dark', color: '#8f8fc0', alpha: 0.2 },
];

export default function GeoSection({ onFaction }: { onFaction: (id: string) => void }) {
  const [tab, setTab] = useState<'canon' | 'inferred' | 'warp'>('canon');
  const [selectedPlace, setSelectedPlace] = useState<string>('mecatol');
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [openPlace, setOpenPlace] = useState<string | null>(null);

  const canonNodes: MapNode[] = useMemo(
    () =>
      PLACES.map((p) => ({
        id: p.id,
        label: p.nameZh,
        color: PLACE_COLOR[p.type] ?? '#8fa87f',
        pos: p.pos,
        size: p.type === 'core' ? 0.3 : p.type === 'anomaly' ? 0.24 : 0.2,
      })),
    []
  );

  const place: Place | undefined = PLACES.find((p) => p.id === selectedPlace);

  return (
    <section className="section" id="geo">
      <div className="wrap">
        <div className="eyebrow">III · 银河地理</div>
        <h2 className="title">
          一张没有坐标的<em>星图</em>
        </h2>
        <p className="lede">
          帝国留下的星图被伊布纳·维尔·西德烧掉了一半，剩下的还被历代胜者改写过。TI4
          从未公布任何派系的坐标——棋盘是玩家自己拼的。所以这里给出三层：只放有出处的正典锚点、按叙事关系推演的布局、以及真正决定银河政治的虫洞网络。
        </p>

        <div className="tabs">
          <button className={`tab ${tab === 'canon' ? 'active' : ''}`} onClick={() => setTab('canon')}>
            ① 正典锚点
          </button>
          <button
            className={`tab ${tab === 'inferred' ? 'active' : ''}`}
            onClick={() => setTab('inferred')}
          >
            ② 关系推演
          </button>
          <button className={`tab ${tab === 'warp' ? 'active' : ''}`} onClick={() => setTab('warp')}>
            ③ 虫洞与裂隙
          </button>
        </div>

        {tab === 'canon' && (
          <>
            <div className="confidence canon">◆ 正典层：每个节点都有官方文本出处，位置为示意排布</div>
            <GalaxyMap
              nodes={canonNodes}
              links={CANON_LINKS}
              selectedId={selectedPlace}
              onSelect={(id) => {
                setSelectedPlace(id);
                setSelectedFaction(null);
              }}
            />
            {place && (
              <div className="map-detail">
                <h3>{place.nameZh}</h3>
                <div className="en">
                  {place.nameEn} · {PLACE_TYPE_LABEL[place.type]} · {place.region}
                </div>
                <p>{place.desc}</p>
                <div className="chip-row">
                  {place.factions.map((fid) => {
                    const f = FACTION_MAP[fid];
                    if (!f) return null;
                    return (
                      <button key={fid} className="chip" onClick={() => onFaction(fid)}>
                        {f.nameZh}
                      </button>
                    );
                  })}
                  <button className="chip" onClick={() => setOpenPlace(place.id)}>
                    展开完整档案
                  </button>
                </div>
                <div className="mono source-note" style={{ marginTop: 14 }}>
                  出处 · {place.source}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'inferred' && (
          <>
            <div className="confidence inferred">
              ◇ 推演层：官方从未给出派系坐标。半径是<strong>与王座的关系层级</strong>、不是距离；
              同一轨道上的相邻位置只按故事相邻排列，连线是关系、不是航道
            </div>
            <NarrativeOrbit
              selected={selectedFaction}
              onSelect={(id) => setSelectedFaction((prev) => (prev === id ? null : id))}
            />
          </>
        )}

        {tab === 'warp' && (
          <>
            <div className="confidence canon">
              ◆ 关系图：确认的是"谁与谁相连"，不是"相距多远"
            </div>
            <WarpDiagram />
            <div className="wormhole-notes">
              <div className="wormhole-note">
                <h4>夸恩通道 · 战争动脉</h4>
                <p>
                  银河最繁忙的贸易航道之一。巴鲁尼在此设封锁线，索尔在此开火，帝国在此失去最后的权威。夸恩行星因 Alpha
                  虫洞的发现成为商人与走私者的中转站。
                </p>
              </div>
              <div className="wormhole-note">
                <h4>沙莱里通道 · 坏空间</h4>
                <p>
                  船只会在此消失，且不留任何痕迹。克瑞斯的领域、银翼远征的秘密拦截区、以及通往阿刻戎的方向——三者重叠在同一片星图上。
                </p>
              </div>
              <div className="wormhole-note">
                <h4>阿刻戎之门 · 已毁</h4>
                <p>
                  拉扎克斯摧毁它、银翼守望它、克瑞斯重开它、马哈克过载它。每一次操作都改变了银河：最后一次把现实撕开了一道口子。
                </p>
              </div>
              <div className="wormhole-note">
                <h4>虫洞枢纽 · 法外之地</h4>
                <p>
                  只能经由虫洞抵达，且与每一个虫洞系统相邻。它在物理上属于网络的一部分，在政治上不属于任何文明——因此成了所有人都在用、却没人承认拥有的地方。
                </p>
              </div>
            </div>
          </>
        )}

        <div className="rule" />
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          地理志 · {PLACES.length} 处
        </div>
        <div className="place-grid">
          {PLACES.map((p) => (
            <div
              key={p.id}
              className="place-card"
              role="button"
              tabIndex={0}
              onClick={() => setOpenPlace(p.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setOpenPlace(p.id);
              }}
            >
              <div className="type">
                {PLACE_TYPE_LABEL[p.type]} · {p.region}
              </div>
              <h4>{p.nameZh}</h4>
              <div className="en">{p.nameEn}</div>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <PlaceModal
        place={openPlace ? PLACES.find((p) => p.id === openPlace) ?? null : null}
        onClose={() => setOpenPlace(null)}
        onFaction={(id) => {
          setOpenPlace(null);
          onFaction(id);
        }}
        onLocate={(id) => {
          setOpenPlace(null);
          setTab('canon');
          setSelectedPlace(id);
          document.getElementById('geo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
    </section>
  );
}
