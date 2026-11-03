import { useMemo, useState } from 'react';
import { CATEGORY_META, FACTION_MAP, RELATIONS, RELATION_META } from '../data';
import { PORTRAITS } from '../data/portraits';

const W = 1120;
const H = 780;
const CX = W / 2;
const CY = H / 2;

interface Ring {
  cat: 'council' | 'great' | 'antagonist' | 'newcomer';
  rx: number;
  ry: number;
  tint: string;
  /** 起始角偏移，错开各环，避免节点沿同一半径叠成一列 */
  start: number;
  /** 标签朝外（最外环）还是朝内（中间环，落在环间空档里） */
  labelOut: boolean;
  /** 同一轨道内的顺序＝故事相邻顺序（顺时针） */
  ids: string[];
}

const RINGS: Ring[] = [
  { cat: 'council', rx: 100, ry: 70, tint: '#c9a961', start: 0, labelOut: true, ids: ['keleres'] },
  {
    cat: 'great',
    rx: 250,
    ry: 176,
    tint: '#8fa87f',
    start: Math.PI * 0.07,
    labelOut: false,
    ids: [
      'winnu',
      'sol',
      'hacan',
      'jolnar',
      'xxcha',
      'yin',
      'muaat',
      'norr',
      'saar',
      'arborec',
      'naazrokha',
      'titans',
      'argent',
    ],
  },
  {
    cat: 'antagonist',
    rx: 372,
    ry: 262,
    tint: '#b06070',
    start: -Math.PI * 0.06,
    labelOut: false,
    ids: [
      'l1z1x',
      'nekro',
      'letnev',
      'naalu',
      'yssaril',
      'mahact',
      'creuss',
      'vuilraith',
      'empyrean',
      'nomad',
      'mentak',
    ],
  },
  {
    cat: 'newcomer',
    rx: 452,
    ry: 318,
    tint: '#8f8fb8',
    start: Math.PI * 0.16,
    labelOut: true,
    ids: ['lastbastion', 'deepwrought', 'crimson', 'firmament', 'ralnel'],
  },
];

const NODE_R = 21;
const START = -Math.PI / 2;

interface Node {
  id: string;
  x: number;
  y: number;
  lx: number;
  ly: number;
  anchor: 'start' | 'middle' | 'end';
}

interface Props {
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function NarrativeOrbit({ selected, onSelect }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const map = new Map<string, Node>();
    RINGS.forEach((ring) => {
      const dir: 1 | -1 = ring.labelOut ? 1 : -1;
      ring.ids.forEach((id, i) => {
        const a = START + ring.start + (i / ring.ids.length) * Math.PI * 2;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const x = CX + cos * ring.rx;
        const y = CY + sin * ring.ry;
        const off = NODE_R + 13;
        const hx = cos * dir;
        map.set(id, {
          id,
          x,
          y,
          lx: x + hx * off,
          ly: y + sin * off * dir + 4,
          anchor: Math.abs(cos) < 0.35 ? 'middle' : hx > 0 ? 'start' : 'end',
        });
      });
    });
    return map;
  }, []);

  const focus = hover ?? selected;

  const edges = useMemo(() => {
    const out: { key: number; a: string; b: string; color: string; d: string }[] = [];
    RELATIONS.forEach((r, i) => {
      const a = nodes.get(r.a);
      const b = nodes.get(r.b);
      if (!a || !b) return;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const cx = mx + (CX - mx) * 0.16;
      const cy = my + (CY - my) * 0.16;
      out.push({
        key: i,
        a: r.a,
        b: r.b,
        color: RELATION_META[r.type].color,
        d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`,
      });
    });
    return out;
  }, [nodes]);

  const relCount = useMemo(() => {
    const count: Record<string, number> = {};
    RELATIONS.forEach((r) => {
      count[r.a] = (count[r.a] || 0) + 1;
      count[r.b] = (count[r.b] || 0) + 1;
    });
    return count;
  }, []);

  const nodeList = Array.from(nodes.values());

  return (
    <>
      <div className="orbit-legend">
        {RINGS.map((ring) => (
          <span className="orbit-legend-item" key={ring.cat}>
            <i style={{ background: ring.tint }} />
            {CATEGORY_META[ring.cat].label}
            <b>{ring.ids.length}</b>
          </span>
        ))}
        <span className="orbit-legend-hint">由内到外 = 与王座的关系层级</span>
      </div>

      <div className="orbit-shell">
        <svg
          className="orbit-map"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="派系叙事轨道示意图：半径表示与王座的关系层级，弧上位置表示故事相邻"
        >
          <defs>
            {nodeList.map((n) => (
              <clipPath id={`orbit-clip-${n.id}`} key={n.id}>
                <circle cx={n.x} cy={n.y} r={NODE_R} />
              </clipPath>
            ))}
          </defs>

          {[...RINGS].reverse().map((ring) => (
            <ellipse
              key={ring.cat}
              cx={CX}
              cy={CY}
              rx={ring.rx}
              ry={ring.ry}
              fill="#c9a961"
              fillOpacity="0.022"
              stroke={ring.tint}
              strokeOpacity="0.5"
              strokeDasharray="2 8"
            />
          ))}

          {/* 中心：王座 */}
          <g className="orbit-throne">
            <circle cx={CX} cy={CY} r="26" fill="rgba(201,169,97,0.06)" stroke="rgba(201,169,97,0.35)" />
            <circle cx={CX} cy={CY} r="4" fill="#e6c884" />
            <text x={CX} y={CY + 48} textAnchor="middle" className="orbit-throne-label">
              王座 · 梅卡托·雷克斯
            </text>
          </g>

          <g className="orbit-edges">
            {edges.map((e) => {
              const on = focus ? focus === e.a || focus === e.b : true;
              const dim = focus && !on;
              return (
                <path
                  key={e.key}
                  d={e.d}
                  fill="none"
                  stroke={e.color}
                  strokeWidth={focus && on ? 1.8 : 1}
                  strokeOpacity={dim ? 0.035 : focus && on ? 0.9 : 0.16}
                />
              );
            })}
          </g>

          <g className="orbit-nodes">
            {nodeList.map((n) => {
              const f = FACTION_MAP[n.id];
              const src = PORTRAITS[n.id];
              const isFocus = focus === n.id;
              const isSelected = selected === n.id;
              const related =
                !focus ||
                isFocus ||
                RELATIONS.some(
                  (r) => (r.a === focus && r.b === n.id) || (r.b === focus && r.a === n.id)
                );
              return (
                <g
                  key={n.id}
                  className={`orbit-node${isFocus ? ' is-focus' : ''}${isSelected ? ' is-selected' : ''}`}
                  style={{ opacity: related ? 1 : 0.42 }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${f.nameZh}，${relCount[n.id] || 0} 条关系`}
                  onClick={() => onSelect(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(n.id);
                    }
                  }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(n.id)}
                  onBlur={() => setHover(null)}
                >
                  <circle cx={n.x} cy={n.y} r={NODE_R + 4} fill="transparent" />
                  <circle cx={n.x} cy={n.y} r={NODE_R + 1.5} fill="#0a0f18" />
                  {src ? (
                    <image
                      href={src}
                      x={n.x - NODE_R}
                      y={n.y - NODE_R}
                      width={NODE_R * 2}
                      height={NODE_R * 2}
                      clipPath={`url(#orbit-clip-${n.id})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <text
                      x={n.x}
                      y={n.y + 5}
                      textAnchor="middle"
                      fill={f.color}
                      fontSize="16"
                      fontFamily="Songti SC, serif"
                    >
                      {f.nameZh.slice(0, 1)}
                    </text>
                  )}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={NODE_R}
                    fill="none"
                    stroke={isSelected ? '#f2dcae' : f.color}
                    strokeOpacity={isSelected ? 1 : 0.75}
                    strokeWidth={isSelected ? 2.4 : 1.4}
                  />
                </g>
              );
            })}
          </g>

          <text x="26" y={H - 16} className="orbit-caption">
            示意图：半径＝与王座的关系层级，不是空间距离；角度仅示意故事相邻，连线只表示关系
          </text>

          <g className="orbit-labels">
            {nodeList.map((n) => {
              const f = FACTION_MAP[n.id];
              const isFocus = focus === n.id;
              const isSelected = selected === n.id;
              const related =
                !focus ||
                isFocus ||
                RELATIONS.some(
                  (r) => (r.a === focus && r.b === n.id) || (r.b === focus && r.a === n.id)
                );
              return (
                <text
                  key={n.id}
                  x={n.lx}
                  y={n.ly}
                  textAnchor={n.anchor}
                  className={`orbit-label${isFocus || isSelected ? ' is-focus' : ''}`}
                  style={{ opacity: related ? 1 : 0.45 }}
                >
                  {f.nameZh}
                </text>
              );
            })}
          </g>
        </svg>

        <div className="orbit-list">
          {RINGS.map((ring) => (
            <div className="orbit-list-group" key={ring.cat}>
              <h4>
                <i style={{ background: ring.tint }} />
                {CATEGORY_META[ring.cat].label} · {ring.ids.length}
              </h4>
              <div className="orbit-chips">
                {ring.ids.map((id) => {
                  const f = FACTION_MAP[id];
                  return (
                    <button
                      key={id}
                      className={`orbit-chip${selected === id ? ' is-active' : ''}`}
                      onClick={() => onSelect(id)}
                    >
                      {PORTRAITS[id] && <img src={PORTRAITS[id]} alt="" loading="lazy" />}
                      <span>{f.nameZh}</span>
                      <em>{relCount[id] || 0}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
