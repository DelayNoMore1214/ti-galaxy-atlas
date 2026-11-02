/**
 * 派系头像：构建时以 base64 内联进单文件，运行时不请求任何外部资源。
 * 未收录头像的派系（凯勒斯、最后壁垒、拉尔·内尔、深锻学者会、赤红叛乱、苍穹会）回退到程序化纹章。
 */
const modules = import.meta.glob('../assets/portraits/*.jpg', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Record<string, string>;

export const PORTRAITS: Record<string, string> = {};

Object.entries(modules).forEach(([path, url]) => {
  const id = path.split('/').pop()!.replace(/\.jpg$/, '');
  if (typeof url === 'string') PORTRAITS[id] = url;
});

export const hasPortrait = (id: string) => Boolean(PORTRAITS[id]);
