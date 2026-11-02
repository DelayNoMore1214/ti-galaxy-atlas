import { useCallback, useEffect, useState } from 'react';
import StarField from './components/StarField';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Prologue from './components/Prologue';
import Chronicle from './components/Chronicle';
import GeoSection from './components/GeoSection';
import Bestiary from './components/Bestiary';
import RelationGraph from './components/RelationGraph';
import Lexicon from './components/Lexicon';
import Sources from './components/Sources';
import FactionModal from './components/FactionModal';
import ErrorBoundary from './components/ErrorBoundary';
import { FACTIONS } from './data';

export default function App() {
  const [openId, setOpenId] = useState<string | null>(() => {
    const q = new URLSearchParams(window.location.search).get('open');
    return q && FACTIONS.some((f) => f.id === q) ? q : null;
  });
  const open = useCallback((id: string) => setOpenId(id), []);
  const locate = useCallback((id: string) => {
    setOpenId(null);
    window.dispatchEvent(new CustomEvent('atlas:focus', { detail: id }));
    window.setTimeout(() => {
      document.getElementById('network')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, []);

  // 滚动进场
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );
    const scan = () => document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    scan();
    const t = window.setTimeout(scan, 600);

    // 支持 ?scroll=geo 之类的深链定位（也可用于分享到具体章节）
    const target = new URLSearchParams(window.location.search).get('scroll');
    let t2 = 0;
    if (target) {
      t2 = window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'auto' });
      }, 120);
    }

    return () => {
      obs.disconnect();
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <>
      <ErrorBoundary><StarField /></ErrorBoundary>
      <div className="grain" />
      <Nav />
      <main className="main">
        <Hero />
        <Prologue />
        <Chronicle onOpen={open} />
        <ErrorBoundary><GeoSection onFaction={open} /></ErrorBoundary>
        <Bestiary onOpen={open} />
        <ErrorBoundary><RelationGraph onOpen={open} /></ErrorBoundary>
        <Lexicon onOpen={open} />
        <Sources />
      </main>

      <footer>
        <div className="footer-inner">
          <div>
            <strong>帝国曙光 · 银河档案</strong>
            Twilight Imperium 4th Edition · 世界观与派系设定整理
            <br />
            {FACTIONS.length} 个派系 · 9 幕编年 · 非官方同人资料站
          </div>
          <div style={{ maxWidth: 460 }}>
            Twilight Imperium 及相关名称为 Fantasy Flight Games 的商标与版权作品。
            <br />
            本站为中文译述与整理，不含规则内容。派系缩略图为官方角色插画（已压缩内联），
            无素材的派系使用程序生成纹章；插画版权归 Fantasy Flight Games 所有。
            <br />
            译名为社区习惯译法，非官方；引用处已标注来源。
          </div>
        </div>
      </footer>

      <FactionModal
        id={openId}
        onClose={() => setOpenId(null)}
        onOpen={open}
        onLocate={locate}
      />
    </>
  );
}
