#!/usr/bin/env python3
"""Headless smoke test: load the page, wait for the world, take screenshots, open a sign overlay."""
import asyncio, sys, os, json, time
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787/'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'shots')
os.makedirs(OUT, exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'])
        if os.environ.get('XR_MOBILE'):
            ctx = await b.new_context(**p.devices['Pixel 7'])
            ctx_landscape = os.environ.get('XR_MOBILE') == 'landscape'
            if ctx_landscape:
                await ctx.close()
                d = dict(p.devices['Pixel 7']); d['viewport'] = {'width': 915, 'height': 412}; d['screen'] = {'width': 915, 'height': 412}
                ctx = await b.new_context(**d)
            pg = await ctx.new_page()
        else:
            pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        logs = []
        pg.on('console', lambda m: logs.append(m.text))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
        await pg.goto(URL)
        pre = os.environ.get('XR_PREFIX', '')
        await pg.screenshot(path=f'{OUT}/{pre}00_loading.png')
        try:
            await pg.wait_for_function('window.xrReady === true', timeout=60000)
        except Exception as e:
            logs.append('TIMEOUT waiting for xrReady')
        await pg.wait_for_timeout(5000)
        await pg.screenshot(path=f'{OUT}/{pre}01_spawn.png')
        steps = json.loads(os.environ.get('XR_STEPS', '[]'))
        for i, st in enumerate(steps):
            if st.get('js'): await pg.evaluate(st['js'])
            if st.get('click'):
                await pg.mouse.click(640, 360)
            if st.get('tap'):
                vp = pg.viewport_size
                await pg.touchscreen.tap(vp['width'] // 2, vp['height'] // 2)
            if st.get('key'):
                await pg.keyboard.press(st['key'])
            await pg.wait_for_timeout(st.get('wait', 2500))
            await pg.screenshot(path=f"{OUT}/{pre}{st['name']}.png")
        open(f'{OUT}/console.log', 'w').write('\n'.join(logs))
        print('\n'.join(l for l in logs if 'Fetching' not in l)[-3000:])
        await b.close()
asyncio.run(main())
