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
            <h4>关于译名</h4>
            <p>
              《帝国曙光》没有官方简体中文版，社区译名并不统一。本站采用常见音译（拉扎克斯、马哈克、梅卡托·雷克斯、伊克斯查……），
              并在每个派系名、地名旁永久并列英文原文，便于对照英文资料。注意："拉扎克斯"一词在历史叙述中指旧帝国种族（Lazax），同时也是 L1Z1X 思维网这一派系的中文名——两者同源，书中靠英文名区分。
            </p>
          </div>
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
            <h4>关于图像</h4>
            <p>
              30 个派系中，24 个使用官方角色立绘（Agent / Commander / Hero）作为圆形缩略图；图片已压缩至
              500px 并以 base64 内联，随单文件一起分发。凯勒斯、最后壁垒、拉尔·内尔、深锻学者会、赤红叛乱、苍穹会
              这 6 个派系暂无素材，仍使用按派系 ID 程序生成的几何纹章。所有插画版权归 Fantasy Flight Games
              所有，本站仅作非商业性的设定整理引用。
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
