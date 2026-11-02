import { useEffect, useRef, useState } from 'react';
import { STATIC } from '../lib/env';
import { PORTRAITS } from '../data/portraits';
import {
  FACTIONS,
  FACTION_MAP,
  RELATIONS,
  RELATION_META,
  otherSide,
} from '../data';

interface Props {
  onOpen: (id: string) => void;
}

interface SimNode {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  degree: number;
}

const TYPES = ['blood', 'vassal', 'origin', 'creation', 'alliance', 'parasite', 'trade', 'rival', 'watch'];

export default function RelationGraph({ onOpen }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<string[]>(TYPES);
  const simRef = useRef<{ nodes: SimNode[]; byId: Map<string, SimNode> } | null>(null);
  const hoverRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const activeRef = useRef<string[]>(TYPES);
  const sizeRef = useRef({ w: 800, h: 620 });

  selectedRef.current = selected;
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d')!;

    const { w, h } = sizeRef.current;
    const degree: Record<string, number> = {};
    RELATIONS.forEach((r) => {
      degree[r.a] = (degree[r.a] || 0) + 1;
      degree[r.b] = (degree[r.b] || 0) + 1;
    });

    const nodes: SimNode[] = FACTIONS.map((f, i) => {
      const a = (i / FACTIONS.length) * Math.PI * 2;
      const rad = Math.min(w, h) * 0.32;
      return {
        id: f.id,
        label: f.nameZh,
        color: f.color,
        x: w / 2 + Math.cos(a) * rad + (Math.random() - 0.5) * 30,
        y: h / 2 + Math.sin(a) * rad + (Math.random() - 0.5) * 30,
        vx: 0,
        vy: 0,
        r: 16 + Math.min(5, (degree[f.id] || 0) * 0.28),
        degree: degree[f.id] || 0,
      };
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));

    // 预加载头像（base64，无需网络）
    const avatars = new Map<string, HTMLImageElement>();
    FACTIONS.forEach((f) => {
      const src = PORTRAITS[f.id];
      if (!src) return;
      const img = new Image();
      img.src = src;
      avatars.set(f.id, img);
    });
    simRef.current = { nodes, byId };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes.forEach((n) => {
        n.x = Math.max(40, Math.min(rect.width - 40, n.x * (rect.width / w)));
        n.y = Math.max(30, Math.min(rect.height - 30, n.y * (rect.height / h)));
      });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ── interaction
    let dragId: string | null = null;
    let downPos = { x: 0, y: 0 };
    let moved = 0;

    const localPos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const hit = (x: number, y: number) => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if ((n.x - x) ** 2 + (n.y - y) ** 2 <= (n.r + 6) ** 2) return n;
      }
      return null;
    };

    const onDown = (e: PointerEvent) => {
      const { x, y } = localPos(e);
      const n = hit(x, y);
      downPos = { x, y };
      moved = 0;
      if (n) {
        dragId = n.id;
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onMove = (e: PointerEvent) => {
      const { x, y } = localPos(e);
      moved = Math.hypot(x - downPos.x, y - downPos.y);
      if (dragId) {
        const n = byId.get(dragId)!;
        n.x = x;
        n.y = y;
        n.vx = 0;
        n.vy = 0;
      } else {
        const n = hit(x, y);
        hoverRef.current = n ? n.id : null;
        canvas.style.cursor = n ? 'pointer' : 'default';
      }
    };

    const onUp = (e: PointerEvent) => {
      const { x, y } = localPos(e);
      if (dragId && moved < 5) {
        const n = byId.get(dragId)!;
        setSelected((prev) => (prev === n.id ? null : n.id));
      } else if (!dragId) {
        const n = hit(x, y);
        if (!n) setSelected(null);
      }
      dragId = null;
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', () => {
      hoverRef.current = null;
    });

    // ── simulation + render
    let raf = 0;
    const step = () => {
      const { w: cw, h: ch } = sizeRef.current;
      const cx = cw / 2;
      const cy = ch / 2;
      const focus = selectedRef.current || hoverRef.current;
      const types = activeRef.current;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            d2 = 1;
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
          }
          const d = Math.sqrt(d2);
          const f = 6800 / d2;
          const ux = (dx / d) * f;
          const uy = (dy / d) * f;
          a.vx -= ux;
          a.vy -= uy;
          b.vx += ux;
          b.vy += uy;
        }
      }

      RELATIONS.forEach((r) => {
        const a = byId.get(r.a);
        const b = byId.get(r.b);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const target = 178;
        const f = (d - target) * 0.0022;
        const ux = (dx / d) * f;
        const uy = (dy / d) * f;
        a.vx += ux;
        a.vy += uy;
        b.vx -= ux;
        b.vy -= uy;
      });

      nodes.forEach((n) => {
        n.vx += (cx - n.x) * 0.0016;
        n.vy += (cy - n.y) * 0.0022;
        if (n.id === dragId) return;
        n.vx *= 0.9;
        n.vy *= 0.9;
        const sp = Math.hypot(n.vx, n.vy);
        if (sp > 14) {
          n.vx = (n.vx / sp) * 14;
          n.vy = (n.vy / sp) * 14;
        }
        n.x += n.vx;
        n.y += n.vy;
        const pad = 40;
        if (n.x < pad) {
          n.x = pad;
          n.vx *= -0.4;
        }
        if (n.x > cw - pad) {
          n.x = cw - pad;
          n.vx *= -0.4;
        }
        if (n.y < pad) {
          n.y = pad;
          n.vy *= -0.4;
        }
        if (n.y > ch - pad) {
          n.y = ch - pad;
          n.vy *= -0.4;
        }
      });

      // draw
      ctx.clearRect(0, 0, cw, ch);

      RELATIONS.forEach((r) => {
        const a = byId.get(r.a);
        const b = byId.get(r.b);
        if (!a || !b) return;
        const meta = RELATION_META[r.type];
        const on = types.includes(r.type);
        const related = !focus || focus === r.a || focus === r.b;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = meta.color;
        ctx.globalAlpha = on ? (related ? (focus ? 0.8 : 0.42) : 0.06) : 0.02;
        ctx.lineWidth = related && focus ? 1.7 : 1;
        ctx.stroke();
      });

      ctx.globalAlpha = 1;

      const labels: {
        x: number;
        y: number;
        w: number;
        text: string;
        focus: boolean;
        related: boolean;
        prio: number;
      }[] = [];

      nodes.forEach((n) => {
        const isFocus = focus === n.id;
        const related =
          !focus ||
          n.id === focus ||
          RELATIONS.some(
            (r) => (r.a === focus && r.b === n.id) || (r.b === focus && r.a === n.id)
          );
        const rr = n.r * (isFocus ? 1.22 : 1);
        const img = avatars.get(n.id);

        ctx.save();
        ctx.globalAlpha = related ? 1 : 0.26;

        // 底盘（同时作为缺图时的占位）
        ctx.beginPath();
        ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
        ctx.fillStyle = '#0b1018';
        ctx.fill();

        // 头像裁成圆
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, n.x - rr, n.y - rr, rr * 2, rr * 2);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
          ctx.fillStyle = n.color + '22';
          ctx.fill();
          ctx.save();
          ctx.fillStyle = n.color;
          ctx.font = `600 ${Math.round(rr * 0.95)}px "Songti SC", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.label.slice(0, 1), n.x, n.y + 1);
          ctx.restore();
        }

        // 圆环
        ctx.beginPath();
        ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = isFocus ? '#f2dcae' : n.color;
        ctx.lineWidth = isFocus ? 2.6 : 1.7;
        ctx.globalAlpha = related ? (isFocus ? 1 : 0.9) : 0.22;
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;

        const small = cw < 720;
        const showLabel = !small || isFocus || hoverRef.current === n.id || n.degree >= 5;
        if (!showLabel) return;
        const size = isFocus ? 16 : 14;
        ctx.font = `${isFocus ? 600 : 400} ${size}px "PingFang SC", "Songti SC", sans-serif`;
        labels.push({
          x: n.x,
          y: n.y - n.r - 7,
          w: ctx.measureText(n.label).width,
          text: n.label,
          focus: isFocus,
          related,
          prio: isFocus ? 0 : n.degree >= 5 ? 1 : 2,
        });
      });

      labels.sort((a, b) => a.prio - b.prio);
      const boxes: { x: number; y: number; w: number }[] = [];
      labels.forEach((l) => {
        const box = { x: l.x - l.w / 2, y: l.y - 11, w: l.w };
        const clash = boxes.some(
          (b) => Math.abs(b.x + b.w / 2 - l.x) < (b.w + l.w) / 2 + 4 && Math.abs(b.y - box.y) < 19
        );
        if (clash && !l.focus) return;
        boxes.push(box);
        ctx.font = `${l.focus ? 600 : 400} ${l.focus ? 16 : 14}px "PingFang SC", "Songti SC", sans-serif`;
        ctx.fillStyle = l.focus
          ? '#fff4d8'
          : l.related
          ? 'rgba(230,225,214,0.85)'
          : 'rgba(230,225,214,0.24)';
        ctx.textAlign = 'center';
        ctx.fillText(l.text, l.x, l.y);
      });

      raf = 0;
    };
    let t2 = 0;
    if (STATIC) {
      for (let i = 0; i < 30; i++) step();
      // ResizeObserver 会重置 canvas，稍后再补画一遍
      t2 = window.setTimeout(() => {
        for (let i = 0; i < 220; i++) step();
      }, 320);
    } else {
      const loop = () => {
        step();
        raf = requestAnimationFrame(loop);
      };
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t2);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
    };
  }, []);

  useEffect(() => {
    const onFocus = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      if (FACTION_MAP[id]) setSelected(id);
    };
    window.addEventListener('atlas:focus', onFocus as EventListener);
    return () => window.removeEventListener('atlas:focus', onFocus as EventListener);
  }, []);

  const sel = selected ? FACTION_MAP[selected] : null;
  const selRels = selected
    ? RELATIONS.filter((r) => r.a === selected || r.b === selected)
    : [];

  return (
    <section className="section" id="network">
      <div className="wrap">
        <div className="eyebrow">V · 关系网络</div>
        <h2 className="title">
          谁欠谁<em>一条命</em>
        </h2>
        <p className="lede">
          三十个派系之间，有屠杀、有奴役、有同一具身体的两次分裂、也有一起造出来的怪物。这张图只记录官方文本里写明的牵连——点击星点看它欠了谁、又救了谁。
        </p>

        <div className="graph-tools">
          <button
            className={`pill ${active.length === TYPES.length ? 'active' : ''}`}
            onClick={() => setActive(TYPES)}
          >
            全部关系
          </button>
          {TYPES.map((t) => {
            const meta = RELATION_META[t];
            const on = active.includes(t);
            return (
              <button
                key={t}
                className={`pill ${on ? 'active' : ''}`}
                style={on ? { borderColor: `${meta.color}88`, color: meta.color } : undefined}
                onClick={() =>
                  setActive((prev) =>
                    prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                  )
                }
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="graph-shell" ref={wrapRef}>
          <canvas ref={canvasRef} />
          <div className="graph-hint">拖动星点重排 · 点击查看关系</div>
        </div>

        <div className="graph-panel">
          {sel ? (
            <>
              <h3>
                {sel.nameZh}{' '}
                <span style={{ fontSize: 15, letterSpacing: '0.2em', color: '#7d7768' }}>
                  {sel.nameEn}
                </span>
              </h3>
              <div className="rel-list">
                {selRels.map((r, i) => {
                  const other = FACTION_MAP[otherSide(r, sel.id)];
                  const meta = RELATION_META[r.type];
                  if (!other) return null;
                  return (
                    <div key={i} className="rel-item" onClick={() => onOpen(other.id)}>
                      <div className="rel-type" style={{ color: meta.color }}>
                        {meta.label}
                      </div>
                      <div className="rel-body">
                        <strong>{other.nameZh}</strong>
                        <span>{r.note}</span>
                        <em>出处 · {r.source}</em>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="chip" onClick={() => onOpen(sel.id)}>
                  打开完整档案
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>选择一个派系</h3>
              <p className="empty">
                线越密，牵连越多。拉扎克斯遗产这条线上挂着继承者、灭绝者与看守者——点开
                拉扎克斯、索尔或温哈，会看到三种互不相容的记忆。
              </p>
              <div className="chip-row" style={{ marginTop: 4 }}>
                {['l1z1x', 'sol', 'winnu', 'mahact', 'argent', 'keleres'].map((id) => (
                  <button key={id} className="chip" onClick={() => setSelected(id)}>
                    {FACTION_MAP[id].nameZh}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
