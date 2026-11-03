import { useEffect, useState } from 'react';
import brandIcon from '../assets/favicon/favicon-64.png';

const ITEMS = [
  { id: 'top', label: '序章' },
  { id: 'prologue', label: '王座' },
  { id: 'chronicle', label: '编年史' },
  { id: 'geo', label: '星图' },
  { id: 'factions', label: '派系' },
  { id: 'network', label: '关系' },
  { id: 'lexicon', label: '辞典' },
  { id: 'sources', label: '来源' },
];

export default function Nav() {
  const [active, setActive] = useState('top');

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    ITEMS.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="nav-brand" href="#top" onClick={() => setActive('top')}>
          <img className="nav-brand-icon" src={brandIcon} alt="" width={24} height={24} />
          <span className="nav-brand-cn">帝国曙光</span>
          <span className="nav-brand-en">TWILIGHT IMPERIUM</span>
        </a>

        <nav className="nav-links" aria-label="章节导航">
          {ITEMS.map((i) => (
            <a
              key={i.id}
              href={`#${i.id}`}
              className={active === i.id ? 'active' : ''}
              onClick={() => setActive(i.id)}
            >
              {i.label}
            </a>
          ))}
        </nav>

        <div className="nav-meta">第四版 · 设定档案</div>
      </div>
    </header>
  );
}
