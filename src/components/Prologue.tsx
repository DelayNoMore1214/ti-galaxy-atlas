export default function Prologue() {
  return (
    <section className="section" id="prologue">
      <div className="wrap">
        <div className="eyebrow">I · 序章</div>
        <h2 className="title">
          王座还在，<em>皇帝</em>已经不在了
        </h2>

        <div className="prose reveal">
          <p>
            三千年前，拉扎克斯的末代皇帝在梅卡托·雷克斯的轨道轰炸中与全家一同死去，没有指定继承人。
            此后二十年，这个统治银河近两万年的种族被追杀至近乎灭绝。再过数百年，暮光战争耗尽所有参战者的国力；
            又过数千年，黑暗年代让文明忘掉了怎么修理自己依赖的机器。
          </p>
          <p>
            现在，大族重新长出了牙齿。议会重新在帝都开会。空着的王座成了每一份条约背后真正的议题：
            <span className="dim">
              {' '}
              问题不再是"谁最强"，而是"谁有资格"——而资格这件事，取决于你相信哪一段历史。
            </span>
          </p>
          <p>
            这正是这个设定最锋利的地方：<strong style={{ color: '#e6c884', fontWeight: 400 }}>没有一方是干净的</strong>。解放者拉扎克斯建立了史上最长的和平，也用这份和平换来了两千年的傲慢；
            索尔终结了帝国，也执行了灭绝；卓恩分享过技术，也抽走了整个银河的维修知识；
            伊克斯查爱好和平，直到他们学会造武器。每个派系的档案里，都有一句它自己不愿提起的话。
          </p>
        </div>

        <div className="concept-row">
          <div className="concept reveal">
            <div className="concept-num">01</div>
            <h3>银河议会</h3>
            <div className="en">The Galactic Council</div>
            <p>
              拉扎克斯设立的代议机构，帝国治下数百个文明在其中拥有席位。它曾是共治的象征，暮色时代沦为阴谋温床。
              帝国灭亡后它停摆了三千年，直到 32 年前由温哈兰重新召集。今天它是唯一的全银河政治场。
            </p>
          </div>
          <div className="concept reveal">
            <div className="concept-num">02</div>
            <h3>温哈兰守护者</h3>
            <div className="en">The Winnaran Custodians</div>
            <p>
              留在帝都的温哈人后裔。他们不称自己为统治者，只称看守者：守住王座、守住档案、守住议会，
              直到有人配得上它。他们的困境是，这个人选的标准，由他们自己解释。
            </p>
          </div>
          <div className="concept reveal">
            <div className="concept-num">03</div>
            <h3>暮光战争</h3>
            <div className="en">The Twilight Wars</div>
            <p>
              从夸恩封锁到帝都陷落、再到延续数百年的混战。它不是一场战役，而是一个文明系统的崩溃过程：
              经济、技术、信任、记忆依次断裂。银河至今仍活在这场战争的后果里。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
