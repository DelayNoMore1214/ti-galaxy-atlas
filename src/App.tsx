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
            <br />
            <a
              className="footer-repo"
              href="https://github.com/DelayNoMore1214/ti-galaxy-atlas"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                />
              </svg>
              <span>GitHub 项目 · </span>
              <span className="repo-path">DelayNoMore1214/ti-galaxy-atlas</span>
              <span className="arrow" aria-hidden="true">
                ↗
              </span>
            </a>
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
