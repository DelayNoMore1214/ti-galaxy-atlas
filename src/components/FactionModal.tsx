import { useEffect } from 'react';
import Sigil from '../lib/Sigil';
import { PORTRAITS } from '../data/portraits';
import {
  CATEGORY_META,
  EDITION_META,
  FACTION_MAP,
  RELATION_META,
  otherSide,
  relationsOf,
} from '../data';

interface Props {
  id: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onLocate: (id: string) => void;
}

export default function FactionModal({ id, onClose, onOpen, onLocate }: Props) {
  const faction = id ? FACTION_MAP[id] : null;

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [id, onClose]);

  if (!faction) return null;
  const rels = relationsOf(faction.id);
  const cat = CATEGORY_META[faction.category];
  const ed = EDITION_META[faction.edition];

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{ borderColor: `${faction.color}55` }}
        role="dialog"
        aria-modal="true"
        aria-label={faction.nameZh}
      >
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>

        <div className="modal-head">
          {PORTRAITS[faction.id] ? (
            <img
              className="portrait portrait-modal"
              src={PORTRAITS[faction.id]}
              alt={faction.nameZh + ' 角色立绘'}
            />
          ) : (
            <Sigil seed={faction.id} color={faction.color} size={64} active />
          )}
          <div>
            <h2>{faction.nameZh}</h2>
            <div className="en">{faction.nameEn}</div>
          </div>
        </div>

        <p className="modal-one-liner">
          {faction.oneLiner}
        </p>

        <dl className="spec-table">
          <div className="spec">
            <dt>物种</dt>
            <dd>
              {faction.species}
              <small>{faction.speciesEn}</small>
            </dd>
          </div>
          <div className="spec">
            <dt>母星 / 据点</dt>
            <dd>
              {faction.homeworld}
              <small>{faction.homeworldEn}</small>
            </dd>
          </div>
          <div className="spec">
            <dt>分类</dt>
            <dd>
              {cat.label}
              <small>{cat.en}</small>
            </dd>
          </div>
          <div className="spec">
            <dt>登场</dt>
            <dd>
              {ed.label}
              <small>{ed.short}</small>
            </dd>
          </div>
          <div className="spec">
            <dt>星系</dt>
            <dd>{faction.region}</dd>
          </div>
          <div className="spec">
            <dt>关键词</dt>
            <dd>{faction.keywords.join(' · ')}</dd>
          </div>
        </dl>

        <div className="modal-section">
          <h4>历史与由来</h4>
          {faction.history.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="modal-section">
          <h4>社会与政体</h4>
          <p>{faction.society}</p>
        </div>

        <div className="modal-section">
          <h4>与拉扎克斯帝国</h4>
          <p>{faction.lazaxRole}</p>
        </div>

        <div className="modal-section">
          <h4>当下局势</h4>
          <p>{faction.present}</p>
        </div>

        <div className="modal-section">
          <h4>关系 · {rels.length} 条</h4>
          <div className="rel-list">
            {rels.map((r, i) => {
              const other = FACTION_MAP[otherSide(r, faction.id)];
              const meta = RELATION_META[r.type];
              if (!other) return null;
              return (
                <div
                  key={i}
                  className="rel-item"
                  onClick={() => onOpen(other.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onOpen(other.id);
                  }}
                >
                  <div className="rel-type" style={{ color: meta.color }}>
                    {meta.label}
                  </div>
                  <div className="rel-body">
                    <strong>
                      {other.nameZh}{' '}
                      <span lang="en" style={{ color: '#7d7768' }}>
                        {other.nameEn}
                      </span>
                    </strong>
                    <span>{r.note}</span>
                    <em>出处 · {r.source}</em>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 26, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="chip" onClick={() => onLocate(faction.id)}>
            在关系图中定位
          </button>
          <button className="chip" onClick={onClose}>
            关闭档案
          </button>
        </div>

        <div className="modal-section">
          <h4>资料来源</h4>
          <div className="mono source-note">
            {faction.sources.map((s) => (
              <div key={s}>— {s}</div>
            ))}
          </div>
          {faction.confidence === 'single-source' && (
            <p style={{ fontSize: 15, color: '#9a8f78', marginTop: 14 }}>
              注：该派系官方公开的叙事文本较少，以上内容仅采用可溯源部分，未作推演补足。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
