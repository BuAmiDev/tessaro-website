import sys, os, asyncio, http.server, threading, functools, json
from playwright.async_api import async_playwright
dist, axe = sys.argv[1], sys.argv[2]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        p=self.path.split('?')[0]
        if not os.path.splitext(p)[1] and p!='/' and os.path.exists(os.path.join(dist,p.lstrip('/')+'.html')): self.path=p+'.html'+self.path[len(p):]
        return super().do_GET()
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Q,directory=dist)); port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
pages=sorted(('/' if r=='index' else '/'+r) for r in [os.path.relpath(os.path.join(a,f),dist)[:-5] for a,_,fs in os.walk(dist) for f in fs if f.endswith('.html')])
src=open(axe).read(); total={}
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}),args=['--no-sandbox'])
        for w in (1440,390):
            pg=await br.new_page(viewport={'width':w,'height':900})
            for u in pages:
                await pg.goto(f'http://127.0.0.1:{port}{u}'); await pg.wait_for_timeout(250); await pg.add_script_tag(content=src)
                r=await pg.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,3).map(n=>n.target.join(' ')+' | '+(n.failureSummary||'').split('\\n')[1])}))}")
                for v in r:
                    k=v['id']; total.setdefault(k,[]).append((w,u,v['n'],v['impact'],v['t']))
        await br.close()
asyncio.run(main())
for k,v in total.items():
    print(f"== {k} ({v[0][3]}) on {len(v)} page-widths"); 
    for x in v[:4]: print('  ',x[0],x[1],x[2],x[4][:2])
