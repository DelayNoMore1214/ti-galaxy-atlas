import { useEffect, useState } from 'react';

const ITEMS = [
  { id: 'top', label: '序' },
  { id: 'prologue', label: '王座' },
  { id: 'chronicle', label: '编年' },
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
    <nav className="nav" aria-label="章节导航">
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
  );
}
