import { useMemo, useState } from 'react';
import Sigil from '../lib/Sigil';
import { CATEGORY_META, EDITION_META, FACTIONS, FORMS } from '../data';
import { PORTRAITS } from '../data/portraits';

export default function Bestiary({ onOpen }: { onOpen: (id: string) => void }) {
  const [cat, setCat] = useState<string>('all');
  const [ed, setEd] = useState<string>('all');
  const [form, setForm] = useState<string>('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return FACTIONS.filter((f) => {
      if (cat !== 'all' && f.category !== cat) return false;
      if (ed !== 'all' && f.edition !== ed) return false;
      if (form !== 'all' && f.form !== form) return false;
      if (!query) return true;
      return (
        f.nameZh.toLowerCase().includes(query) ||
        f.nameEn.toLowerCase().includes(query) ||
        f.keywords.some((k) => k.toLowerCase().includes(query)) ||
        f.species.toLowerCase().includes(query) ||
        f.homeworld.toLowerCase().includes(query)
      );
    });
  }, [cat, ed, form, q]);

  const formsInUse = useMemo(() => {
    const used = new Set(FACTIONS.map((f) => f.form));
    return FORMS.filter((f) => used.has(f));
  }, []);

  return (
    <section className="section" id="factions">
      <div className="wrap">
        <div className="eyebrow">IV · 派系图鉴</div>
        <h2 className="title">
          三十个<em>文明</em>，三十种想坐上去的理由
        </h2>
        <p className="lede">
          基础游戏 17 族、《预言之王》7 族、Codex 的凯勒斯议会、《雷霆边缘》5
          族——全部收录。每份档案只写设定与历史，不涉及任何规则数值。中文译名为社区习惯译法，非官方。
        </p>

        <div className="filters">
          <div className="filter-group">
            <span>分类</span>
            <div className="pill-row">
              <button className={`pill ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
                全部
              </button>
              {Object.entries(CATEGORY_META).map(([k, v]) => (
                <button
                  key={k}
                  className={`pill ${cat === k ? 'active' : ''}`}
                  onClick={() => setCat(k)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span>登场</span>
            <div className="pill-row">
              <button className={`pill ${ed === 'all' ? 'active' : ''}`} onClick={() => setEd('all')}>
                全部
              </button>
              {Object.entries(EDITION_META).map(([k, v]) => (
                <button
                  key={k}
                  className={`pill ${ed === k ? 'active' : ''}`}
                  onClick={() => setEd(k)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span>形态</span>
            <div className="pill-row">
              <button
                className={`pill ${form === 'all' ? 'active' : ''}`}
                onClick={() => setForm('all')}
              >
                全部
              </button>
              {formsInUse.map((f) => (
                <button
                  key={f}
                  className={`pill ${form === f ? 'active' : ''}`}
                  onClick={() => setForm(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="search filter-group">
            <span>检索</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="输入派系名、物种、母星或关键词…"
              aria-label="检索派系"
            />
          </div>
        </div>

        <div className="mono" style={{ marginBottom: 14 }}>
          {list.length} / {FACTIONS.length} 个派系
        </div>

        <div className="faction-grid">
          {list.map((f) => (
            <article
              key={f.id}
              className="faction-card"
              style={{ ['--accent-soft' as any]: `${f.color}22` }}
              onClick={() => onOpen(f.id)}
            >
              <div className="faction-card-head">
                {PORTRAITS[f.id] ? (
                  <img
                    className="portrait portrait-card"
                    src={PORTRAITS[f.id]}
                    alt={f.nameZh + ' 角色立绘'}
                    loading="lazy"
                  />
                ) : (
                  <Sigil seed={f.id} color={f.color} size={44} />
                )}
                <div>
                  <h3>{f.nameZh}</h3>
                  <div className="en">{f.nameEn}</div>
                </div>
              </div>
              <p className="one-liner">{f.oneLiner}</p>
              <div className="meta">
                <span className="ed">{EDITION_META[f.edition].short}</span>
                <span>{f.form}</span>
                <span style={{ marginLeft: 'auto', color: f.color, opacity: 0.85 }}>
                  {CATEGORY_META[f.category].label}
                </span>
              </div>
            </article>
          ))}
        </div>

        {list.length === 0 && (
          <p style={{ color: '#837d6f', fontFamily: 'var(--serif)', padding: '40px 0' }}>
            没有符合条件的派系。试试清空筛选。
          </p>
        )}
      </div>
    </section>
  );
}
