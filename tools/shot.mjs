import fs from 'node:fs';
import http from 'node:http';

const [, , url, out, mode = 'viewport', width = '1440', height = '1000', expr = ''] = process.argv;

const json = (method, path) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: Number(process.env.CDP_PORT || 9222), path, method },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const target = await json('PUT', `/json/new?${encodeURIComponent(url)}`);
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: 1,
  mobile: Number(width) < 500,
});
await sleep(2600);

if (expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.result && r.result.result.value !== undefined) {
    console.log('EVAL:', JSON.stringify(r.result.result.value));
  }
  await sleep(1600);
}

if (mode === 'full') {
  const metrics = await send('Page.getLayoutMetrics');
  const h = Math.ceil(metrics.result.cssContentSize.height);
  await send('Emulation.setDeviceMetricsOverride', {
    width: Number(width),
    height: Math.min(h, 20000),
    deviceScaleFactor: 1,
    mobile: Number(width) < 500,
  });
  await sleep(900);
}

const shot = await send('Page.captureScreenshot', { format: 'png' });
if (!shot.result || !shot.result.data) {
  console.error('capture failed', JSON.stringify(shot).slice(0, 300));
  process.exit(1);
}
fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log(`saved ${out}`);
ws.close();
process.exit(0);
