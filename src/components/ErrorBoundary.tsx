import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  failed: boolean;
  msg: string;
}

/** 局部容错：某个可视化组件出错时不至于让整页空白。 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, msg: '' };

  static getDerivedStateFromError(err: Error): State {
    return { failed: true, msg: err?.message || '未知错误' };
  }

  componentDidCatch(err: Error) {
    // eslint-disable-next-line no-console
    console.warn('[atlas] component failed:', err?.message);
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          style={{
            border: '1px solid rgba(201,169,97,0.2)',
            padding: '28px 30px',
            color: '#b9b3a4',
            fontSize: 17,
            lineHeight: 2,
            fontFamily: 'var(--serif)',
          }}
        >
          此处的交互可视化在当前浏览器环境下无法运行（{this.state.msg}）。
          <br />
          页面其余内容不受影响，可继续阅读；也可以换用支持 WebGL 的浏览器查看星图。
        </div>
      );
    }
    return this.props.children;
  }
}
