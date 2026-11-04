import { SOURCES } from '../data';

export default function Sources() {
  return (
    <section className="section" id="sources">
      <div className="wrap">
        <div className="eyebrow">VII · 资料与方法</div>
        <h2 className="title">
          每一条设定，<em>都能指回去</em>
        </h2>
        <p className="lede">
          这个站点不含原创剧情，也不做"合理推测"。以下九类材料构成全部内容基础；能对上两处来源的设定才写，只有单一来源的会在档案里标注。
        </p>

        <div className="src-list">
          {SOURCES.map((s, i) => (
            <div className="src" key={i}>
              <div className="kind">{s.kind}</div>
              <div>
                <h4>{s.name}</h4>
                <p>{s.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="disclaimers">
          <div className="disclaimer">
            <h4>关于地理图</h4>
            <p>
              FFG 从未公布任何派系的坐标。游戏地图由玩家在开局时自行拼接，只有梅卡托·雷克斯固定位于中心。
              因此本站把"官方文本明确记载的地点"与"按叙事关系推演的布局"严格分开，后者的方位不具任何权威性。
            </p>
          </div>
          <div className="disclaimer">
            <h4>不含规则内容</h4>
            <p>
              全站不包含任何玩法、单位属性、科技树、策略或得分机制。所有数字只用于历史年代、派系数量与关系条数。
            </p>
          </div>
          <div className="disclaimer">
            <h4>版权</h4>
            <p>
              Twilight Imperium 为 Fantasy Flight Games（Asmodee 集团）的商标与版权作品。本站为非商业性质的同人设定整理，
              文字为中文译述与概述，不构成对原作的替代。
            </p>
          </div>
          <div className="disclaimer">
            <h4>已知不确定项</h4>
            <p>
              雷霆边缘 5 族的官方公开叙事较新且篇幅有限；游牧者的"来自暮光之陨时间线"一说目前只见于衍生小说与社区考据，
              尚未被官方规则文本确证，站内已作为"流传说法"处理。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
