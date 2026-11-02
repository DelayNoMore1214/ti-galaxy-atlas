import { ERAS, FACTION_MAP } from '../data';

export default function Chronicle({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="section" id="chronicle">
      <div className="wrap">
        <div className="eyebrow">II · 编年史</div>
        <h2 className="title">
          九幕，从<em>基因巫师</em>到一道裂缝
        </h2>
        <p className="lede">
          以下时间轴以温纳兰编年史官的记述为骨架，年份取自官方与社区整理的编年表。所有时间都是"距今"，因为《帝国编年史》把拉扎克斯抵达帝都的那一年记为"元年"——历史是从征服者到达的那一刻开始计数的。
        </p>

        <div>
          {ERAS.map((era) => (
            <article className="era reveal" key={era.id} style={{ borderTopColor: 'var(--line-soft)' }}>
              <div className="era-index">
                <div className="era-num">{String(era.order).padStart(2, '0')}</div>
                <div className="era-span">{era.span}</div>
                <div
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12.5,
                    letterSpacing: '0.14em',
                    color: '#6f6a5e',
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      background: era.tint,
                      border: '1px solid rgba(201,169,97,0.25)',
                      display: 'inline-block',
                    }}
                  />
                  {era.tintName}
                </div>
              </div>
              <div>
                <h3 className="era-title">{era.title}</h3>
                <div className="era-sub">{era.subtitle}</div>
                <p className="era-summary">{era.summary}</p>
                <ul className="era-events">
                  {era.events.map((e, i) => (
                    <li key={i}>
                      {e.text}
                      {e.factions?.map((fid) => {
                        const f = FACTION_MAP[fid];
                        if (!f) return null;
                        return (
                          <button key={fid} className="era-tag" onClick={() => onOpen(fid)}>
                            {f.nameZh}
                          </button>
                        );
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
