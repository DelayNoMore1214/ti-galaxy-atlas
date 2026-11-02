export default function WarpDiagram() {
  const nodes = [
    { x: 450, y: 225, label: '梅卡托·雷克斯', sub: 'MECATOL REX', kind: 'core' },
    { x: 196, y: 128, label: '夸恩虫洞', sub: 'QUANN', kind: 'trade' },
    { x: 700, y: 118, label: '沙莱里异常区', sub: 'SHALERI', kind: 'anomaly' },
    { x: 742, y: 330, label: '阿刻戎裂隙', sub: 'ACHERON RIFT', kind: 'rift' },
    { x: 470, y: 62, label: '伊克斯斯', sub: 'IXTH', kind: 'core' },
    { x: 168, y: 318, label: '虫洞枢纽', sub: 'WORMHOLE NEXUS', kind: 'beyond' },
    { x: 862, y: 190, label: '克鲁斯', sub: 'CREUSS', kind: 'beyond' },
  ];

  const color: Record<string, string> = {
    core: '#c9a961',
    trade: '#c9a94f',
    anomaly: '#6f7fd8',
    rift: '#b8425a',
    beyond: '#9a8fb8',
  };

  return (
    <div className="wormhole-wrap">
      <svg viewBox="0 0 900 460" role="img" aria-label="虫洞与裂隙网络示意图">
        <defs>
          <radialGradient id="riftGlow">
            <stop offset="0%" stopColor="#ff6a7a" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#8b1f3a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8b1f3a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dimension" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b3f5a" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#8b3f5a" stopOpacity="0.45" />
          </linearGradient>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#c9a961" />
          </marker>
        </defs>

        {/* 银河盘轮廓 */}
        <ellipse
          cx="450"
          cy="225"
          rx="330"
          ry="186"
          fill="none"
          stroke="rgba(201,169,97,0.14)"
          strokeDasharray="2 8"
        />
        <ellipse
          cx="450"
          cy="225"
          rx="196"
          ry="112"
          fill="none"
          stroke="rgba(120,140,180,0.12)"
          strokeDasharray="2 8"
        />

        {/* Alpha / Beta 虫洞网（虚线环流） */}
        <g stroke="rgba(140,170,230,0.35)" fill="none" strokeWidth="1.1">
          <path d="M196,128 C300,80 380,70 470,62" strokeDasharray="5 6" />
          <path d="M470,62 C560,80 650,95 700,118" strokeDasharray="5 6" />
          <path d="M700,118 C790,150 830,170 862,190" strokeDasharray="5 6" />
          <path d="M196,128 C150,190 140,250 168,318" strokeDasharray="5 6" />
          <path d="M168,318 C260,360 360,350 430,268" strokeDasharray="5 6" />
        </g>

        {/* 夸恩封锁线 */}
        <g>
          <line
            x1="196"
            y1="128"
            x2="268"
            y2="150"
            stroke="#d0514b"
            strokeWidth="2.4"
            strokeDasharray="7 5"
          />
          <text x="224" y="118" fill="#d0514b" fontSize="13" letterSpacing="1.5">
            莱特涅夫封锁线
          </text>
        </g>

        {/* 阿刻戎之门（已毁）→ 裂隙 → 异维度 */}
        <g>
          <circle cx="742" cy="330" r="52" fill="url(#riftGlow)" />
          <path
            d="M676,300 L742,330 L700,392"
            stroke="#b8425a"
            strokeWidth="1.4"
            fill="none"
            strokeDasharray="4 4"
          />
          <path
            d="M742,330 C790,380 830,400 880,420"
            stroke="url(#dimension)"
            strokeWidth="26"
            fill="none"
            strokeLinecap="round"
          />
          <text x="806" y="424" fill="#c98fa0" fontSize="13" letterSpacing="1.4">
            异维度 · 维伊尔-莱斯
          </text>
          <g stroke="#b8425a" strokeWidth="1.6">
            <line x1="712" y1="352" x2="772" y2="308" />
            <line x1="712" y1="308" x2="772" y2="352" />
          </g>
        </g>

        {/* 伊克斯斯被拽入核心 */}
        <path
          d="M470,62 C468,110 458,170 452,214"
          stroke="#a03a58"
          strokeWidth="1.6"
          strokeDasharray="6 4"
          markerEnd="url(#arrow)"
          fill="none"
        />
        <text x="486" y="150" fill="#b57a90" fontSize="13" letterSpacing="1.2">
          马哈克将母星拖入核心
        </text>

        {nodes.map((n) => (
          <g key={n.label}>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.kind === 'core' ? 16 : 11}
              fill={`${color[n.kind]}22`}
              stroke={color[n.kind]}
              strokeWidth="1.1"
            />
            <circle cx={n.x} cy={n.y} r={n.kind === 'core' ? 5 : 3.4} fill={color[n.kind]} />
            <text
              x={n.x}
              y={n.y + (n.kind === 'core' ? 34 : 28)}
              textAnchor="middle"
              fill="#e7e2d6"
              fontSize="15"
              letterSpacing="1.6"
            >
              {n.label}
            </text>
            <text
              x={n.x}
              y={n.y + (n.kind === 'core' ? 49 : 43)}
              textAnchor="middle"
              fill="#7d7768"
              fontSize="10.5"
              letterSpacing="1.4"
            >
              {n.sub}
            </text>
          </g>
        ))}

        <text x="20" y="440" fill="#5f5a50" fontSize="12" letterSpacing="1.2">
          示意图：仅表达连通关系与叙事作用，不代表真实空间距离或方位
        </text>
      </svg>
    </div>
  );
}
