import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STATIC, REDUCED_MOTION, STATIC_FRAMES } from '../lib/env';

/** 全站背景：三维星野 + 缓慢自转的银河粒子盘。 */
export default function StarField() {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;

    const reduced = REDUCED_MOTION;
    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );
    camera.position.set(0, 19, 34);
    camera.lookAt(0, -3, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'low-power',
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const galaxy = new THREE.Group();

    // ── 星系盘主体
    const COUNT = isMobile ? 4200 : 9000;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);

    const gold = new THREE.Color('#d9b877');
    const warm = new THREE.Color('#c98b5a');
    const cold = new THREE.Color('#7f9dd6');
    const pale = new THREE.Color('#e8e4d8');

    const ARMS = 3;
    const R = 26;

    for (let i = 0; i < COUNT; i++) {
      const isCore = Math.random() < 0.22;
      let r: number;
      let theta: number;
      let y: number;

      if (isCore) {
        r = Math.pow(Math.random(), 1.9) * R * 0.28;
        theta = Math.random() * Math.PI * 2;
        y = (Math.random() - 0.5) * (2.4 - r * 0.08);
      } else {
        r = Math.pow(Math.random(), 0.68) * R;
        const arm = Math.floor(Math.random() * ARMS);
        theta =
          arm * ((Math.PI * 2) / ARMS) +
          r * 0.42 +
          (Math.random() - 0.5) * (0.55 + r * 0.012);
        y = (Math.random() - 0.5) * (1.7 - r * 0.035) * (0.4 + Math.random());
      }

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      const t = r / R;
      const c = isCore
        ? pale.clone().lerp(gold, Math.random() * 0.5)
        : cold.clone().lerp(warm, Math.min(1, t * 1.25 + Math.random() * 0.2));
      if (!isCore && Math.random() < 0.12) c.lerp(pale, 0.55);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 0.6 + 0.35;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const sprite = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    const mat = new THREE.PointsMaterial({
      size: 0.34,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    galaxy.add(points);

    // ── 远景星点（不随盘旋转）
    const FAR = isMobile ? 700 : 1500;
    const farPos = new Float32Array(FAR * 3);
    for (let i = 0; i < FAR; i++) {
      const v = new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(70 + Math.random() * 130);
      farPos[i * 3] = v.x;
      farPos[i * 3 + 1] = v.y;
      farPos[i * 3 + 2] = v.z;
    }
    const farGeo = new THREE.BufferGeometry();
    farGeo.setAttribute('position', new THREE.BufferAttribute(farPos, 3));
    const farPoints = new THREE.Points(
      farGeo,
      new THREE.PointsMaterial({
        size: 0.9,
        color: 0xdfe6f5,
        transparent: true,
        opacity: 0.42,
        map: sprite,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    scene.add(farPoints);
    scene.add(galaxy);

    galaxy.rotation.x = 0.62;
    galaxy.position.y = -7;
    galaxy.position.x = 9;

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    let raf = 0;
    let frames = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      const dt = clock.getDelta();
      if (!reduced) {
        galaxy.rotation.y += dt * 0.022;
        targetX += (mouseX * 1.6 - targetX) * 0.02;
        targetY += (mouseY * 0.9 - targetY) * 0.02;
        camera.position.x = targetX;
        camera.position.y = 19 - targetY * 1.4;
        camera.lookAt(0, -3, 0);
        farPoints.rotation.y += dt * 0.004;
      }
      renderer.render(scene, camera);
      frames += 1;
      if (STATIC) {
        if (frames < STATIC_FRAMES) raf = requestAnimationFrame(tick);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const o = Math.max(0.3, 1 - y / 620);
        el.style.opacity = String(o);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      geo.dispose();
      farGeo.dispose();
      mat.dispose();
      sprite.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div id="starfield" ref={holder} />;
}
