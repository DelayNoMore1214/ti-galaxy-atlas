import { FACTION_MAP, GLOSSARY } from '../data';

export default function Lexicon({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="section" id="lexicon">
      <div className="wrap">
        <div className="eyebrow">VI · 主题辞典</div>
        <h2 className="title">
          {GLOSSARY.length} 个<em>专有名词</em>
        </h2>
        <p className="lede">
          这个世界的质感，藏在名词里：基因巫术、交响、迪尔祖加、灰火病、曼杜敕令。
          读懂了它们，派系的行为就不再需要解释。
        </p>

        <div className="lex-grid">
          {GLOSSARY.map((g) => (
            <div className="lex-item reveal" key={g.id}>
              <h4>{g.term}</h4>
              <div className="en">{g.termEn}</div>
              <p>{g.desc}</p>
              <div className="chip-row">
                {g.factions.map((fid) => {
                  const f = FACTION_MAP[fid];
                  if (!f) return null;
                  return (
                    <button key={fid} className="chip" onClick={() => onOpen(fid)}>
                      {f.nameZh}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
