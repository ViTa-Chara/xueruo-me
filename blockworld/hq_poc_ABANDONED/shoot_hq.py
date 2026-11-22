import asyncio, sys, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'])
        for view in sys.argv[1:]:
            pg = await b.new_page(viewport={'width': 1280, 'height': 720})
            logs = []; pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
            t = time.time()
            await pg.goto(f'http://127.0.0.1:18797/index.html?{view}')
            try: await pg.wait_for_function('window.hqReady === true', timeout=240000)
            except Exception as e: print('timeout', e)
            name = view.split('&')[0].split('=')[1]
            await pg.screenshot(path=f'/workspace/blockworld/shots/hq_poc_{name}.png')
            print(view, round(time.time() - t, 1), 's', logs[-3:])
            await pg.close()
        await b.close()
asyncio.run(main())
