import { useEffect } from 'react';
import { FACTION_MAP } from '../data';
import type { Place } from '../data';

const TYPE_LABEL: Record<string, string> = {
  core: '核心',
  homeworld: '母星系',
  anomaly: '异常区',
  station: '空间站',
  ruin: '废墟',
  beyond: '银河之外',
};

interface Props {
  place: Place | null;
  onClose: () => void;
  onFaction: (id: string) => void;
  onLocate: (id: string) => void;
}

export default function PlaceModal({ place, onClose, onFaction, onLocate }: Props) {
  useEffect(() => {
    if (!place) return;
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
  }, [place, onClose]);

  if (!place) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal place-modal"
        role="dialog"
        aria-modal="true"
        aria-label={place.nameZh}
      >
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>

        <div className="modal-head">
          <div>
            <div className="place-type">{TYPE_LABEL[place.type] ?? '地点'}</div>
            <h2>{place.nameZh}</h2>
            <div className="en">{place.nameEn}</div>
          </div>
        </div>

        <p className="modal-one-liner">{place.region}</p>

        <dl className="spec-table">
          <div className="spec">
            <dt>类型</dt>
            <dd>
              {TYPE_LABEL[place.type] ?? '地点'}
              <small>{place.type}</small>
            </dd>
          </div>
          <div className="spec">
            <dt>所属区域</dt>
            <dd>{place.region}</dd>
          </div>
        </dl>

        <div className="modal-section">
          <h4>地点档案</h4>
          <p>{place.desc}</p>
        </div>

        {place.factions.length > 0 && (
          <div className="modal-section">
            <h4>相关派系 · {place.factions.length}</h4>
            <div className="chip-row">
              {place.factions.map((fid) => {
                const f = FACTION_MAP[fid];
                if (!f) return null;
                return (
                  <button
                    key={fid}
                    className="chip"
                    onClick={() => {
                      onClose();
                      onFaction(fid);
                    }}
                  >
                    {f.nameZh}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-section">
          <h4>出处</h4>
          <div className="mono source-note">{place.source}</div>
          <p className="place-note">
            图中位置为示意排布，官方从未公布各派系与地点的坐标；此处只表达记载中的相对关系。
          </p>
        </div>

        <div style={{ marginTop: 26, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="chip" onClick={() => onLocate(place.id)}>
            在星图中定位
          </button>
          <button className="chip" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
