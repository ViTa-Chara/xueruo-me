import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url)), workspace = resolve(here, '../../..');
const cli = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'skills/playwright/scripts/playwright_cli.sh');
const url = process.env.HT_PREVIEW_URL || 'http://127.0.0.1:8790/';
await mkdir(resolve(workspace, 'output/playwright'), { recursive: true });
function run(args, timeout = 60000) {
  const child = spawnSync(cli, ['-s=ht-measure', ...args], { cwd: workspace, encoding: 'utf8', timeout, maxBuffer: 2 ** 20 });
  if (child.status !== 0 || /### Error/.test(child.stdout)) throw Error(child.stderr || child.stdout || String(child.error));
  const match = child.stdout.match(/### Result\n(\{[^\n]*\})/);
  return match ? JSON.parse(match[1]) : null;
}
run(['open', 'about:blank', '--config', resolve(here, 'browser.config.json')]);
const filter = process.env.HT_MEASURE_ENGINE;
if (filter && !['three', 'noa', 'classic'].includes(filter)) throw Error('HT_MEASURE_ENGINE must be three, noa, or classic');
const results = filter ? JSON.parse(await readFile(resolve(here, '../public/benchmark/results.json'), 'utf8')) : { date: '2026-10-08', environment: 'Apple M5 Pro / macOS 27 / Chromium 155，无头浏览器，localhost 静态服务器，无网络或 CPU 限速',
  method: '每项使用新浏览器上下文（空缓存）；出生点等待区块稳定后采样 10 秒。两个新候选统一视距、FOV、控制与实体预算。JS 堆不含 WASM 堆、GPU 或 Worker 内存。', runs: [], sceneRuns: [] };
for (const mobile of [false, true]) for (const type of ['three', 'noa', 'classic']) {
  if (filter && type !== filter) continue;
  const target = type === 'classic' ? `benchmark/classic.html${mobile ? '?mobile=1' : ''}` : `?engine=${type}${mobile ? '&mobile=1' : ''}`;
  const code = `async (page) => {
    const context = await page.context().browser().newContext({viewport:${JSON.stringify(mobile ? { width: 915, height: 412 } : { width: 1440, height: 900 })}, deviceScaleFactor:1, hasTouch:${mobile}, isMobile:${mobile}});
    const test = await context.newPage(), errors = [];
    test.on('pageerror', e => errors.push(e.message));
    test.on('console', e => { if(e.type()==='error' && !e.text().includes('favicon.ico')) errors.push(e.text()); });
    await test.goto(${JSON.stringify(new URL(target, url).href)});
    await test.waitForFunction(() => window.xrReady === true, null, {timeout:30000});
    await test.waitForTimeout(5000);
    await test.evaluate(() => window.ht.resetMetrics());
    await test.waitForTimeout(10000);
    const result = await test.evaluate(() => {
      const canvas = document.querySelector('canvas'), gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const debug = gl?.getExtension('WEBGL_debug_renderer_info');
      return {...window.ht.metrics(), resources:performance.getEntriesByType('resource').filter(r=>r.transferSize>0).map(r=>({name:new URL(r.name).pathname,bytes:r.transferSize})), renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null};
    });
    result.mobile = ${mobile}; result.errors = errors;
    await test.screenshot({path:${JSON.stringify(`output/playwright/${type}-${mobile ? 'mobile' : 'desktop'}-spawn.png`)}});
    if(${type !== 'classic'}) {
      await test.evaluate(() => window.ht.view([108,2,286],0,-.04));
      await test.waitForTimeout(5000); await test.evaluate(() => window.ht.resetMetrics()); await test.waitForTimeout(6000);
      result.workshop = await test.evaluate(() => window.ht.metrics());
      await test.screenshot({path:${JSON.stringify(`output/playwright/${type}-${mobile ? 'mobile' : 'desktop'}-workshop.png`)}});
    }
    await context.close(); return result;
  }`;
  const result = run(['run-code', code]);
  if (result.samples < 300 || result.workshop && result.workshop.samples < 150)
    throw Error(`Invalid measurement: too few rendered frames (${type}, mobile=${mobile})`);
  const previous = results.runs.findIndex(row => row.engine === result.engine && row.mobile === result.mobile);
  if (previous >= 0) results.runs[previous] = result; else results.runs.push(result);
  if (result.workshop) {
    const scene = { ...result.workshop, scene: '精密加工车间' };
    const index = results.sceneRuns.findIndex(row => row.engine === scene.engine && row.mobile === scene.mobile);
    if (index >= 0) results.sceneRuns[index] = scene; else results.sceneRuns.push(scene);
    delete result.workshop;
  }
  console.log(`${type} ${mobile ? 'mobile' : 'desktop'}: ${result.loadMS} ms / ${result.meanFPS} fps / ${result.jsHeapMB} MB JS heap; errors=${result.errors.length}`);
  await writeFile(resolve(here, '../public/benchmark/results.json'), JSON.stringify(results, null, 2));
  await writeFile(resolve(workspace, 'output/playwright/engine-results.json'), JSON.stringify(results, null, 2));
}
run(['close']);
console.log(filter ? `${filter} 复测结果及截图已更新。` : '6 个出生点测量、4 个车间测量及截图已保存。');
