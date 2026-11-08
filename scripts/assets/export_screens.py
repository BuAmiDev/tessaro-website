import sys, os, json, pathlib, asyncio
from playwright.async_api import async_playwright
SRC = pathlib.Path(os.environ.get('SRC', '.fixtures'))
OUT = pathlib.Path(sys.argv[1]).resolve(); OUT.mkdir(parents=True, exist_ok=True)
REPL = json.load(open(sys.argv[2])) if len(sys.argv) > 2 and os.path.exists(sys.argv[2]) else {}
keys = sys.argv[3].split(',')
FD = os.environ.get('PRODUCT_FONTS', os.path.abspath('node_modules'))
FONTS = f"""@font-face{{font-family:'Plus Jakarta Sans';src:url(file://{FD}/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2) format('woff2');font-weight:200 800}}
@font-face{{font-family:'IBM Plex Mono';src:url(file://{FD}/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2);font-weight:400}}
@font-face{{font-family:'IBM Plex Mono';src:url(file://{FD}/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2);font-weight:500}}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for k in keys:
            frag = (SRC / f'{k}.html').read_text()
            # generic-data replacements: global then per-screen
            for a, z in REPL.get('*', []) + REPL.get(k, []): frag = frag.replace(a, z)
            phone = 'class="ph"' in frag
            html = f"<!doctype html><meta charset=utf-8><style>{FONTS}body{{margin:0;background:#EEEFEC}}</style><div id=h></div><script>window.F={json.dumps(frag)};const r=document.getElementById('h').attachShadow({{mode:'open'}});r.innerHTML=F;</script>"
            tmp = OUT / f'_{k}.html'; tmp.write_text(html)
            pg = await b.new_page(viewport={'width': 1440 if not phone else 520, 'height': 1000}, device_scale_factor=2)
            await pg.goto(f'file://{tmp}'); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(300)
            el = pg.locator('#h').locator('.ph' if phone else '.app').first
            await el.screenshot(path=str(OUT / f'{k}.png'), omit_background=False)
            # report any leftover text for review
            txt = await el.inner_text()
            (OUT / f'{k}.txt').write_text(txt)
            await pg.close(); tmp.unlink()
            print(k, 'phone' if phone else 'desktop')
        await b.close()
asyncio.run(main())
