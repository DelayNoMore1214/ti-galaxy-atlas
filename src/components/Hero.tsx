import { FACTIONS, PLACES, RELATIONS, ERAS } from '../data';

export default function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero-inner">
        <div className="hero-seal">TWILIGHT IMPERIUM · FOURTH EDITION · LORE ARCHIVE</div>
        <h1>
          <span>帝国曙光</span>
          <span className="line2">银河档案</span>
        </h1>

        <div className="hero-sub">
          <blockquote className="hero-quote">
            我叫 Mahthom Iq Seerva，温哈兰的编年史看守者。我在旧梅卡托城的年代塔里写下这些文字。
            我的子民守护这座城市已逾三千年——自大清洗以来，我们看管着王座、帝国档案与银河议会，
            履行我们对末代皇帝许下的承诺。
            <br />
            <br />
            我的手在颤抖，因为我确信：我们的守护，会在我这一代结束。
            <cite>— 温哈兰编年史官，致银河的公开信（据官方规则书序章译述）</cite>
          </blockquote>

          <div className="hero-stats">
            <div>
              <strong>{FACTIONS.length}</strong>个派系档案
            </div>
            <div>
              <strong>{ERAS.length}</strong>幕银河编年
            </div>
            <div>
              <strong>{PLACES.length}</strong>处地理锚点
            </div>
            <div>
              <strong>{RELATIONS.length}</strong>条派系关系
            </div>
            <div style={{ marginTop: 10, color: '#5f5a50', fontSize: 13 }}>
              纯设定资料 · 不含任何规则与玩法
            </div>
          </div>
        </div>
      </div>
      <div className="scroll-cue">向下 · SCROLL</div>
    </header>
  );
}
