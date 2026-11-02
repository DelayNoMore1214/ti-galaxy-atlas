import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STATIC } from '../lib/env';

export interface MapNode {
  id: string;
  label: string;
  sub?: string;
  color: string;
  pos: [number, number, number];
  size?: number;
}

export interface MapLink {
  a: string;
  b: string;
  color?: string;
  alpha?: number;
  dashed?: boolean;
}

interface Props {
  nodes: MapNode[];
  links?: MapLink[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  showRings?: boolean;
}

/** three.js 星图：可拖拽旋转、可缩放、可点选。坐标仅为示意排布。 */
export default function GalaxyMap({
  nodes,
  links = [],
  selectedId,
  onSelect,
  showRings = true,
}: Props) {
  const shell = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const labelHost = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ selected: selectedId });
  const [noWebGL, setNoWebGL] = useState(false);
  stateRef.current.selected = selectedId;

  useEffect(() => {
    const host = canvasHost.current;
    const labels = labelHost.current;
    if (!host || !labels) return;

    const W = () => host.clientWidth || 800;
    const H = () => host.clientHeight || 560;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, W() / H(), 0.1, 500);
    camera.position.set(0, 17, 30);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (err) {
      setNoWebGL(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.rotation.x = 0.28;
    scene.add(root);

    // 银河盘参考环
    if (showRings) {
      [7.4, 12.2, 16.6].forEach((r, i) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(r - 0.02, r + 0.02, 128),
          new THREE.MeshBasicMaterial({
            color: i === 1 ? 0xc9a961 : 0x6e7f9e,
            transparent: true,
            opacity: i === 1 ? 0.32 : 0.18,
            side: THREE.DoubleSide,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        root.add(ring);
      });
    }

    const haloTexture = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.22, 'rgba(255,255,255,0.45)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();

    const nodeMeshes: THREE.Mesh[] = [];
    const nodeMap = new Map<string, THREE.Object3D>();
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);

    nodes.forEach((n) => {
      const group = new THREE.Group();
      group.position.set(n.pos[0] * 0.95, n.pos[1] * 0.95, n.pos[2] * 0.95);

      const color = new THREE.Color(n.color);
      const size = (n.size ?? 0.2) * 1.35;

      const core = new THREE.Mesh(
        sphereGeo,
        new THREE.MeshBasicMaterial({ color })
      );
      core.scale.setScalar(size);
      core.userData.id = n.id;
      group.add(core);
      nodeMeshes.push(core);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: haloTexture,
          color,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      halo.scale.setScalar(size * 11);
      group.add(halo);

      group.userData = { id: n.id, halo, core, base: size };
      root.add(group);
      nodeMap.set(n.id, group);
    });

    // 连接线
    const lineGeo = new THREE.BufferGeometry();
    const pts: number[] = [];
    const cols: number[] = [];
    links.forEach((l) => {
      const a = nodeMap.get(l.a);
      const b = nodeMap.get(l.b);
      if (!a || !b) return;
      pts.push(a.position.x, a.position.y, a.position.z);
      pts.push(b.position.x, b.position.y, b.position.z);
      const c = new THREE.Color(l.color || '#7d8aa5');
      const alpha = l.alpha ?? 0.35;
      cols.push(c.r * alpha, c.g * alpha, c.b * alpha);
      cols.push(c.r * alpha, c.g * alpha, c.b * alpha);
    });
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    root.add(lines);

    // DOM 标签
    labels.innerHTML = '';
    const labelEls = new Map<string, HTMLDivElement>();
    nodes.forEach((n) => {
      const el = document.createElement('div');
      el.className = 'map-label';
      el.textContent = n.label;
      labels.appendChild(el);
      labelEls.set(n.id, el);
    });

    // 交互
    let rotY = 0;
    let rotX = 0.28;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let zoom = 1;
    let zoomTarget = 1;
    let hovered: string | null = null;
    const pointer = new THREE.Vector2(-10, -10);
    const raycaster = new THREE.Raycaster();

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      shell.current?.classList.add('dragging');
    };
    const onUp = () => {
      dragging = false;
      shell.current?.classList.remove('dragging');
    };
    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (dragging) {
        rotY += (e.clientX - lastX) * 0.006;
        rotX = Math.max(-0.9, Math.min(1.15, rotX + (e.clientY - lastY) * 0.004));
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const onClick = () => {
      if (hovered) onSelect(hovered);
    };

    const el = renderer.domElement;
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', () => {
      pointer.set(-10, -10);
    });
    el.addEventListener('click', onClick);

    let raf = 0;
    const tmp = new THREE.Vector3();

    const tick = () => {
      root.rotation.y += (rotY - root.rotation.y) * 0.12;
      root.rotation.x += (rotX - root.rotation.x) * 0.12;
      zoom += (zoomTarget - zoom) * 0.12;
      camera.position.set(0, 14.5 * zoom, 26 * zoom);
      camera.lookAt(0, 0, 0);

      // hover raycast
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(nodeMeshes, false);
      const hitId = hits.length ? (hits[0].object.userData.id as string) : null;
      if (hitId !== hovered) {
        hovered = hitId;
        el.style.cursor = hitId ? 'pointer' : 'grab';
      }

      // node highlight + label projection
      const w = W();
      const h = H();

      // 1) 先投影，收集候选标签
      const cands: {
        id: string;
        x: number;
        y: number;
        wd: number;
        priority: number;
        el: HTMLDivElement;
        hot: boolean;
      }[] = [];

      nodeMap.forEach((g, id) => {
        const isSel = stateRef.current.selected === id;
        const isHot = hovered === id;
        const halo = g.userData.halo as THREE.Sprite;
        const core = g.userData.core as THREE.Mesh;
        const target = isSel ? 2.2 : isHot ? 1.7 : 1;
        halo.scale.setScalar((g.userData.base as number) * 11 * target);
        core.scale.setScalar((g.userData.base as number) * (isSel ? 1.5 : isHot ? 1.25 : 1));
        (halo.material as THREE.SpriteMaterial).opacity = isSel ? 1 : isHot ? 0.9 : 0.7;

        const labelEl = labelEls.get(id);
        if (!labelEl) return;
        tmp.set(g.position.x, g.position.y, g.position.z);
        g.parent!.updateMatrixWorld();
        tmp.applyMatrix4(g.parent!.matrixWorld).project(camera);
        if (tmp.z >= 1) {
          labelEl.style.display = 'none';
          return;
        }
        const px = (tmp.x * 0.5 + 0.5) * w;
        const py = (-tmp.y * 0.5 + 0.5) * h;
        const isCore = (g.userData.base as number) > 0.26;
        cands.push({
          id,
          x: px,
          y: py,
          wd: labelEl.textContent!.length * 13 + 9,
          priority: isSel || isHot ? 0 : isCore ? 1 : 3,
          el: labelEl,
          hot: isSel || isHot,
        });
      });

      // 2) 屏幕空间去重叠：优先保留选中/悬停/核心点
      cands.sort((a, b) => a.priority - b.priority);
      const placed: { x: number; y: number; w: number }[] = [];
      cands.forEach((c) => {
        // 标签以节点为锚点向上偏移，故碰撞盒中心取 y-28
        const cy = c.y - 28;
        const hit = placed.some(
          (p) =>
            Math.abs(p.x - c.x) < (p.w + c.wd) / 2 + 4 && Math.abs(p.y - cy) < 24
        );
        if (hit && c.priority > 0) {
          c.el.style.display = 'none';
          return;
        }
        placed.push({ x: c.x, y: cy, w: c.wd });
        c.el.style.display = 'block';
        c.el.style.left = `${c.x}px`;
        c.el.style.top = `${c.y}px`;
        c.el.classList.toggle('hot', c.hot);
        c.el.style.opacity = c.hot ? '1' : '0.7';
      });

      renderer.render(scene, camera);
    };
    let t3 = 0;
    if (STATIC) {
      for (let i = 0; i < 30; i++) tick();
      t3 = window.setTimeout(() => {
        for (let i = 0; i < 3; i++) tick();
      }, 320);
    } else {
      const loop = () => {
        tick();
        raf = requestAnimationFrame(loop);
      };
      loop();
    }

    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    (shell.current as any).__zoom = (dir: number) => {
      zoomTarget = Math.max(0.6, Math.min(1.75, zoomTarget + dir * 0.15));
    };

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t3);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('click', onClick);
      sphereGeo.dispose();
      lineGeo.dispose();
      haloTexture.dispose();
      renderer.dispose();
      if (el.parentNode === host) host.removeChild(el);
      labels.innerHTML = '';
    };
  }, [nodes, links, onSelect, showRings]);

  if (noWebGL) {
    const pts = nodes.map((n) => ({
      ...n,
      x: 450 + n.pos[0] * 19,
      y: 230 + n.pos[2] * 15,
      wd: n.label.length * 12.5 + 7,
    }));
    // 简易去重叠：选中优先，其次按 y 排序
    const placed: { x: number; y: number; w: number }[] = [];
    const shown = new Set<string>();
    [...pts]
      .sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : a.y - b.y))
      .forEach((p) => {
        const cy = p.y - 14;
        const conflict = placed.some(
          (q) => Math.abs(q.x - p.x) < (q.w + p.wd) / 2 + 4 && Math.abs(q.y - cy) < 20
        );
        if (conflict && p.id !== selectedId) return;
        placed.push({ x: p.x, y: cy, w: p.wd });
        shown.add(p.id);
      });
    return (
      <div className="map-shell" ref={shell}>
        <svg viewBox="0 0 900 460" style={{ width: '100%', height: '100%' }}>
          {links.map((l, i) => {
            const a = pts.find((p) => p.id === l.a);
            const b = pts.find((p) => p.id === l.b);
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={l.color || '#7d8aa5'}
                strokeOpacity={Math.min(0.6, (l.alpha ?? 0.3) * 1.2)}
                strokeWidth="1"
              />
            );
          })}
          {pts.map((p) => (
            <g key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={selectedId === p.id ? 8 : 4.5}
                fill={p.color}
                opacity={selectedId === p.id ? 1 : 0.85}
              />
              {shown.has(p.id) && (
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  fontSize="13"
                  fill={selectedId === p.id ? '#fff2d4' : 'rgba(230,225,214,0.7)'}
                >
                  {p.label}
                </text>
              )}
            </g>
          ))}
          <text x="16" y="444" fontSize="11" fill="#5f5a50">
            当前设备不支持 WebGL，已切换为平面星图（同为示意排布）
          </text>
        </svg>
        <div className="map-hint">点击星点查看档案</div>
      </div>
    );
  }

  return (
    <div className="map-shell" ref={shell}>
      <div ref={canvasHost} style={{ position: 'absolute', inset: 0 }} />
      <div ref={labelHost} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div className="map-hint">拖拽旋转 · 点击星点查看档案</div>
      <div className="map-tools">
        <button
          aria-label="放大"
          onClick={() => (shell.current as any)?.__zoom?.(-1)}
        >
          ＋
        </button>
        <button
          aria-label="缩小"
          onClick={() => (shell.current as any)?.__zoom?.(1)}
        >
          －
        </button>
      </div>
      <div className="map-legend">
        <span>
          <i style={{ background: '#c9a961' }} />
          核心 / 帝都
        </span>
        <span>
          <i style={{ background: '#6f7fd8' }} />
          异常区 / 裂隙
        </span>
        <span>
          <i style={{ background: '#8fa87f' }} />
          母星系
        </span>
        <span>
          <i style={{ background: '#9a8fb8' }} />
          银河之外
        </span>
      </div>
    </div>
  );
}
