import React from 'react';

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

interface Props {
  seed: string;
  color: string;
  size?: number;
  active?: boolean;
}

/** 程序化生成的派系纹章 —— 不使用任何官方美术素材。 */
export default function Sigil({ seed, color, size = 46, active = false }: Props) {
  const h = hash(seed);
  const petals = 3 + (h % 6); // 3–8
  const inner = 2 + ((h >> 3) % 4);
  const rotation = (h >> 5) % 90;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const uid = `sg-${seed}`;

  const points = (count: number, radius: number, offset = 0) =>
    Array.from({ length: count }, (_, i) => {
      const a = (Math.PI * 2 * i) / count - Math.PI / 2 + offset;
      return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
    });

  const outer = points(petals, r, 0);
  const mid = points(petals, r * 0.62, Math.PI / petals);
  const core = points(inner, r * 0.3, 0);

  const poly = (pts: number[][]) => pts.map((p) => p.join(',')).join(' ');

  return (
    <svg
      className="sigil"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ filter: active ? `drop-shadow(0 0 10px ${color}66)` : 'none' }}
    >
      <defs>
        <radialGradient id={uid} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid})`} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="0.7"
          strokeOpacity="0.55"
        />
        <polygon
          points={poly(outer)}
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.85"
        />
        <polygon
          points={poly(mid)}
          fill="none"
          stroke={color}
          strokeWidth="0.7"
          strokeOpacity="0.45"
        />
        <polygon points={poly(core)} fill={color} fillOpacity="0.5" />
        {outer.map((p, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p[0]}
            y2={p[1]}
            stroke={color}
            strokeWidth="0.5"
            strokeOpacity="0.28"
          />
        ))}
        <circle cx={cx} cy={cy} r={size * 0.035} fill={color} fillOpacity="0.9" />
      </g>
    </svg>
  );
}
