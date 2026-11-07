# End-to-end journey checks against the built site (test adapters).
# usage: python3 journeys.py <dist> <outdir>
import sys, os, asyncio, http.server, threading, functools, json
from playwright.async_api import async_playwright, expect
dist, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        p = self.path.split('?')[0]
        if not os.path.splitext(p)[1] and p != '/' and os.path.exists(os.path.join(dist, p.lstrip('/') + '.html')): self.path = p + '.html' + self.path[len(p):]
        return super().do_GET()
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=dist)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{port}'
results = []
def ok(name, cond, info=''):
    results.append((name, bool(cond), info)); print(('PASS ' if cond else 'FAIL ') + name + (f' — {info}' if info else ''))

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}), args=['--no-sandbox'])
        ctx = await br.new_context(viewport={'width': 1280, 'height': 900})
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        # 1 Simulator: change inputs, save, add capability via features
        await pg.goto(B + '/simulator?scenario=owner-expense&industry=property-management'); await pg.wait_for_timeout(800)
        await pg.select_option('select[name="threshold"]', index=0); await pg.wait_for_timeout(300)
        await pg.click('[data-save]'); await pg.wait_for_timeout(300)
        s = json.loads(await pg.evaluate("localStorage.getItem('tessaro.setup')"))
        ok('simulator saves scenario on device', len(s['scenarios']) == 1 and s['storage'] == 'device', s['scenarios'][0]['inputs']['scenario'] if s['scenarios'] else '')
        await pg.goto(B + '/features?q=approval'); await pg.wait_for_timeout(500)
        cnt = await pg.text_content('[data-count]'); ok('feature search filters', cnt and not cnt.startswith(cnt.split(' of ')[1].split(' ')[0] + ' of'), cnt)
        btn = pg.locator('.fc:not([hidden]) [data-add]').first; await btn.click(); await pg.wait_for_timeout(200)
        ok('add to setup toggles', await btn.get_attribute('aria-pressed') == 'true')
        # 2 My setup lists items and handoff has no personal data
        await pg.goto(B + '/my-setup'); await pg.wait_for_timeout(500)
        ok('my setup lists scenario', await pg.locator('[data-sc-list] li').count() == 1)
        ok('my setup lists capability', await pg.locator('[data-cap-list] li').count() == 1)
        await pg.fill('#notes', 'Three AMC contracts'); await pg.wait_for_timeout(800)
        # 3 Sign in carries device draft into account
        await pg.goto(B + '/sign-in?next=/my-setup'); await pg.fill('#si-email', 'test.user@example.com'); await pg.click('[data-si-email] button[type=submit]'); await pg.wait_for_timeout(800)
        code = await pg.text_content('[data-si-shown]'); await pg.fill('#si-code', '000000'); await pg.click('[data-si-code] button[type=submit]'); await pg.wait_for_timeout(600)
        ok('wrong code shows error', await pg.is_visible('[data-si-err-code]'))
        await pg.fill('#si-code', code); await pg.fill('#si-name', 'Test User'); await pg.click('[data-si-code] button[type=submit]'); await pg.wait_for_timeout(700)
        ok('sign-in carries draft', 'moves' in (await pg.text_content('[data-carried]') or '') or 'now in your account' in (await pg.text_content('[data-carried]') or ''), await pg.text_content('[data-carried]'))
        s = json.loads(await pg.evaluate("localStorage.getItem('tessaro.setup')"))
        ok('setup now account-backed', s['storage'] == 'account' and len(s['scenarios']) == 1 and s['notes'] == 'Three AMC contracts')
        h = await pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('tessaro.setup')))")
        # 4 Configurator: blocker stops, warnings allowed, resume
        await pg.goto(B + '/configurator'); await pg.wait_for_timeout(500)
        ok('configurator opens on three starting choices', await pg.is_visible('[data-start]') and not await pg.is_visible('#industry'))
        await pg.click('[data-start-detail]'); await pg.wait_for_timeout(400)
        ok('configurator prefilled industry from setup', await pg.input_value('#industry') == 'property-management')
        await pg.fill('#countries', ''); await pg.click('[data-next]'); await pg.wait_for_timeout(300)
        ok('blocker prevents continuing', await pg.is_visible('[data-err="countries"]'))
        await pg.fill('#countries', '2'); await pg.click('[data-next]'); await pg.wait_for_timeout(400)
        await pg.fill('#sites', '12'); await pg.click('[data-next]'); await pg.wait_for_timeout(400)
        await pg.fill('#technicians', '45'); await pg.click('[data-next]'); await pg.wait_for_timeout(400)
        await pg.fill('#p1Hours', '30'); await pg.fill('#p2Hours', '24'); await pg.click('[data-next]'); await pg.wait_for_timeout(300)
        ok('critical > normal is a blocker', await pg.is_visible('[data-err="p1Hours"]'))
        await pg.fill('#p1Hours', '4'); await pg.click('[data-next]'); await pg.wait_for_timeout(400)
        await pg.click('[data-next]'); await pg.wait_for_timeout(400)
        await pg.check('input[name="channels"][value="whatsapp"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-next]'); await pg.wait_for_timeout(300)
        ok('WhatsApp consent blocker', await pg.is_visible('[data-err="whatsappConsent"]'))
        await pg.check('input[name="whatsappConsent"]'); await pg.click('[data-next]'); await pg.wait_for_timeout(500)
        txt = await pg.text_content('[data-checks]'); ok('review: ready with warnings', 'Ready for setup' in txt and 'Worth checking' in txt, txt[:120])
        plan = await pg.text_content('[data-plan]'); ok('plan suggests Scale + extras for 45 techs', 'Scale' in plan and '5 extra' in plan, plan[:90])
        await pg.screenshot(path=os.path.join(out, 'j-config-review.png'), full_page=True)
        await pg.reload(); await pg.wait_for_timeout(500)
        ok('configurator resumes at review', not await pg.locator('fieldset[data-step="6"]').is_hidden())
        # 5 Demo prefill + submit
        await pg.goto(B + '/demo?scenario=owner-expense'); await pg.wait_for_timeout(400)
        ok('demo prefilled from account', await pg.input_value('#email') == 'test.user@example.com')
        ok('demo shows carried setup', await pg.is_visible('[data-carry]'))
        await pg.fill('#company', 'Example Co'); await pg.click('[data-submit]'); await pg.wait_for_timeout(300)
        ok('demo consent required', await pg.is_visible('[data-err="consent"]'))
        await pg.check('input[name="consent"]'); await pg.click('[data-submit]'); await pg.wait_for_timeout(1200)
        ok('demo confirmation', await pg.is_visible('[data-done]'))
        hand = await pg.text_content('[data-done-handoff]'); ok('handoff has no personal data', 'test.user' not in hand and 'Example Co' not in hand and 'Test User' not in hand)
        # 6 Trial: decline -> recover -> success -> provisioning failure -> retry -> welcome
        await pg.goto(B + '/trial?plan=scale'); await pg.wait_for_timeout(500)
        ok('trial skips account when signed in', not await pg.locator('[data-panel="1"]').is_hidden())
        await pg.fill('#co', 'Example Facilities'); await pg.click('[data-company] button[type=submit]'); await pg.wait_for_timeout(300)
        ok('industry required', await pg.is_visible('[data-err="ind"]') or await pg.locator('[data-panel="2"]').is_visible())
        if await pg.is_visible('[data-err="ind"]'): await pg.select_option('#ind', 'property-management'); await pg.click('[data-company] button[type=submit]'); await pg.wait_for_timeout(300)
        ok('plan preselected from URL', await pg.is_checked('input[name="plan"][value="scale"]'))
        await pg.click('[data-plan] button[type=submit]'); await pg.wait_for_timeout(300)
        key1 = await pg.text_content('[data-idem]')
        await pg.check('input[name="outcome"][value="decline"]'); await pg.click('[data-pay]'); await pg.wait_for_timeout(1600)
        ok('decline explained, nothing charged', 'Nothing was charged' in (await pg.text_content('[data-payres]')))
        ok('new checkout reference after decline', (await pg.text_content('[data-idem]')) != key1)
        await pg.evaluate("document.querySelector('[data-failtest]').checked = true")
        await pg.check('input[name="outcome"][value="success"]'); await pg.click('[data-pay]'); await pg.wait_for_timeout(5000)
        failed = await pg.locator('[data-provres] [data-retry]').count()
        if failed: await pg.click('[data-retry]'); await pg.wait_for_timeout(5500)
        ok('welcome reached', await pg.locator('[data-panel="5"]').is_visible(), f'provision interrupted first: {bool(failed)}')
        mail = await pg.text_content('[data-mail]'); ok('welcome names workspace', 'example-facilities.tessaropro.com' in mail)
        await pg.screenshot(path=os.path.join(out, 'j-trial-welcome.png'), full_page=True)
        # idempotency: paying again with same key returns same reference
        t = json.loads(await pg.evaluate("localStorage.getItem('tessaro.trial')")); pays = json.loads(await pg.evaluate("localStorage.getItem('tessaro.payments')"))
        ok('one successful payment recorded', sum(1 for v in pays.values() if v['status'] == 'paid') == 1 and t['paymentRef'])
        # 7 Onboarding
        await pg.goto(B + '/onboarding'); await pg.wait_for_timeout(300)
        boxes = pg.locator('.tk input'); n = await boxes.count()
        for i in range(n): await boxes.nth(i).check()
        await pg.reload(); await pg.wait_for_timeout(300)
        ok('onboarding progress persists', await pg.is_visible('[data-done]'))
        # 8 Help search + escalation
        await pg.goto(B + '/help'); await pg.fill('#hq', 'zzqx nothing'); await pg.wait_for_timeout(300)
        ok('help empty state offers a person', await pg.is_visible('[data-hempty]'))
        await pg.fill('#hq', 'payment'); await pg.wait_for_timeout(300)
        ok('help search finds payment guide', await pg.locator('#payment-failed').is_visible())
        await pg.goto(B + '/support?topic=trial'); await pg.fill('#msg', 'My payment was declined during the trial'); await pg.click('[data-form] button[type=submit]'); await pg.wait_for_timeout(400)
        ok('support confirmation', await pg.is_visible('[data-done]'))
        # 9 Sign out leaves account copy, clears device
        await pg.goto(B + '/sign-in'); await pg.click('[data-out]'); await pg.wait_for_timeout(500)
        s = json.loads(await pg.evaluate("localStorage.getItem('tessaro.setup')")); ok('sign out clears device copy', s['storage'] == 'device' and not s['scenarios'])
        ok('no page errors', not errs, '; '.join(errs[:3]))
        await br.close()
asyncio.run(main())
fails = [r for r in results if not r[1]]
print(f'\n{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
