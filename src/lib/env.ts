/** 静态渲染模式：用于无头截图与低性能设备（?static=1）。 */
export const STATIC =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('static');

export const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 首帧 + 少量帧后停止动画循环 */
export const STATIC_FRAMES = 4;
