# Story and app-showcase checks against the built site.
# usage: python3 tests/e2e/story.py <dist>
import sys, os, asyncio, http.server, threading, functools, json
from playwright.async_api import async_playwright
dist = sys.argv[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        p = self.path.split('?')[0].split('#')[0]
        if not os.path.splitext(p)[1] and p != '/' and os.path.exists(os.path.join(dist, p.lstrip('/') + '.html')): self.path = p + '.html' + self.path[len(p):]
        return super().do_GET()
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=dist)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{port}'
results = []
def ok(name, cond, info=''):
    results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + (f' — {info}' if info else ''))

PROG = "(()=>{const r=document.querySelector('[data-story]');const h=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h'));const span=r.offsetHeight-(innerHeight-h);return Math.max(0,Math.min(1,-(r.getBoundingClientRect().top-h)/span))})()"
GO = "p=>{const r=document.querySelector('[data-story]');const h=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h'));const top=r.getBoundingClientRect().top+scrollY-h;const span=r.offsetHeight-(innerHeight-h);scrollTo(0,top+p*span+2)}"

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}), args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='no-preference')
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(B + '/?story-quality=low'); await pg.wait_for_function('document.documentElement.dataset.storyReady === "1"', timeout=120000); await pg.wait_for_timeout(600)
        ok('opens in live 3D mode', await pg.get_attribute('[data-story]', 'data-mode') == 'live')
        ok('3D canvas replaces the poster', await pg.evaluate("document.querySelector('[data-story]').classList.contains('live') && getComputedStyle(document.querySelector('[data-canvas]')).opacity === '1'"))
        ok('floor polygons projected from the 3D floors', await pg.evaluate("[...document.querySelectorAll('[data-floor]')].filter(p=>p.getAttribute('points')).length") == 6)
        # floor picker: keyboard focus highlights, non-story floor stays, story floor continues
        await pg.focus('[data-pick=L2]'); await pg.wait_for_timeout(150)
        ok('focus highlights a floor', await pg.evaluate("document.querySelector('polygon[data-floor=L2]').classList.contains('hover')"))
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(600)
        ok('choosing another floor keeps the exterior', await pg.evaluate(PROG) < .05 and await pg.get_attribute('[data-pick=L2]', 'aria-pressed') == 'true')
        ok('offers to follow Level 4', await pg.locator('[data-follow]').count() == 1)
        await pg.click('[data-pick=L4]'); await pg.wait_for_timeout(2600)
        pr = await pg.evaluate(PROG)
        ok('choosing Level 4 travels into the bay', .17 < pr < .26, f'p={pr:.3f}')
        # chapter navigation travels along the path: sample progress during the move
        samples = []
        await pg.click('[data-ch="4"]')
        for _ in range(12): await pg.wait_for_timeout(150); samples.append(round(await pg.evaluate(PROG), 3))
        await pg.wait_for_timeout(1500)
        inc = all(b >= a - .002 for a, b in zip(samples, samples[1:])); mids = len({x for x in samples if .26 < x < .52})
        ok('chapter jump passes through intermediate positions', inc and mids >= 3, str(samples))
        ok('chapter button arrives at Office', await pg.get_attribute('[data-ch="4"]', 'aria-current') == 'step')
        # interruption: a wheel during travel stops it where it is
        await pg.click('[data-ch="7"]'); await pg.wait_for_timeout(500); await pg.mouse.wheel(0, 1); a = await pg.evaluate(PROG); await pg.wait_for_timeout(900); b = await pg.evaluate(PROG)
        ok('wheel interrupts travel at the current position', abs(b - a) < .02 and a < .9, f'{a:.3f} → {b:.3f}')
        # app reveals follow the record; requester completion never before evidence
        bad = []
        for i in range(56, 101):
            await pg.evaluate(GO, i / 100); await pg.wait_for_timeout(60)
            st = await pg.evaluate("""(()=>({app: document.querySelector('[data-story]').classList.contains('app-on') ? (document.querySelector('[data-app-img]').getAttribute('src') || 'EMPTY') : '',
              repair: document.querySelector('[data-rec-row=repair]').classList.contains('done'), verify: document.querySelector('[data-rec-row=verify]').classList.contains('done')}))()""")
            if 'story-res-confirm' in st['app'] and not (st['repair'] and st['verify']): bad.append(i)
            if 'story-tech-complete' in st['app'] and not st['repair']: bad.append(i)
            if st['app'] == 'EMPTY': bad.append(f'empty@{i}')
        ok('completion shown only after evidence and verification', not bad, str(bad))
        await pg.evaluate(GO, .62); await pg.wait_for_timeout(700)
        ok('office shows the requester update', 'story-res-booked' in (await pg.get_attribute('[data-app-img]', 'src') or ''))
        await pg.click('[data-app-open]'); await pg.wait_for_timeout(300)
        ok('screen enlarges in a dialog', await pg.evaluate("document.querySelector('[data-zoom]').open"))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        await pg.evaluate(GO, .725); await pg.wait_for_timeout(900)
        ok('technician job detail at arrival', 'story-tech-job' in (await pg.get_attribute('[data-app-img]', 'src') or ''))
        labels = await pg.evaluate("[...document.querySelectorAll('.an.on')].map(e=>e.textContent)")
        ok('annotation attached at arrival', any('Rami' in l for l in labels), str(labels))
        # replay and skip
        await pg.click('[data-replay]'); await pg.wait_for_timeout(4800)
        ok('replay returns to the start', await pg.evaluate(PROG) < .02)
        await pg.click('a[href="#after-story"]'); await pg.wait_for_timeout(1200)
        ok('skip story moves past the story', await pg.evaluate("document.querySelector('#after-story').getBoundingClientRect().top < innerHeight"))
        # homepage showcase
        await pg.locator('#apps').scroll_into_view_if_needed(); await pg.wait_for_timeout(300)
        await pg.click('#home-apps-technician [data-step="1"]'); await pg.wait_for_timeout(400)
        ok('showcase step changes screen', await pg.evaluate("document.querySelector('#home-apps-technician .ax-imgs img.on').src.includes('tech-checklist')"))
        ok('timeline follows the step', await pg.evaluate("[...document.querySelectorAll('[data-tl].on')].some(b=>b.textContent.includes('Checks'))"))
        await pg.click('[data-tl="5"]'); await pg.wait_for_timeout(300)
        ok('timeline drives the requester app', await pg.evaluate("document.querySelector('#home-apps-requester .ax-imgs img.on').src.includes('res-confirm')"))
        ok('no page errors', not errs, str(errs[:2]))
        await ctx.close()

        # reduced motion: static chapters, no sticky scroll
        ctx = await br.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='reduce'); pg = await ctx.new_page()
        await pg.goto(B + '/'); await pg.wait_for_timeout(600)
        ok('reduced motion uses static mode', await pg.get_attribute('[data-story]', 'data-mode') == 'static')
        await pg.click('[data-next]'); await pg.wait_for_timeout(300)
        ok('next chapter control works', await pg.get_attribute('[data-ch="1"]', 'aria-current') == 'step')
        await ctx.close()

        # mobile: one experience at a time with role buttons
        ctx = await br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); pg = await ctx.new_page()
        await pg.goto(B + '/#apps'); await pg.wait_for_timeout(600)
        vis = await pg.evaluate("[...document.querySelectorAll('#apps [data-role]')].filter(e=>getComputedStyle(e).display!=='none').length")
        ok('mobile shows one app at a time', vis == 1, str(vis))
        await pg.tap('[data-ax-role=portal]'); await pg.wait_for_timeout(300)
        ok('role button switches to the portal', await pg.evaluate("getComputedStyle(document.querySelector('#home-apps-portal')).display") != 'none')
        await pg.goto(B + '/?story-quality=low'); await pg.wait_for_function('document.documentElement.dataset.storyReady === "1"', timeout=120000)
        await pg.tap('[data-pick=L4]'); await pg.wait_for_timeout(2800)
        ok('touch floor pick travels on mobile', await pg.evaluate(PROG) > .1)
        await ctx.close()
        # explicitly separate fallback when WebGL is unavailable
        ctx = await br.new_context(viewport={'width': 1280, 'height': 860}); pg = await ctx.new_page()
        await pg.goto(B + '/?story-mode=stills'); await pg.wait_for_timeout(800)
        ok('no-WebGL fallback shows rendered stills', await pg.evaluate("document.querySelectorAll('[data-stills] img').length") == 8)
        await ctx.close(); await br.close()
    n = sum(results); print(f'\n{n}/{len(results)} passed'); sys.exit(0 if n == len(results) else 1)
asyncio.run(main())
