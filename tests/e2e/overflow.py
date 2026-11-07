import sys, os, asyncio, http.server, threading, functools
from playwright.async_api import async_playwright
dist=sys.argv[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        p=self.path.split('?')[0]
        if not os.path.splitext(p)[1] and p!='/' and os.path.exists(os.path.join(dist,p.lstrip('/')+'.html')): self.path=p+'.html'+self.path[len(p):]
        return super().do_GET()
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Q,directory=dist)); port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
pages=[]
for root,_,fs in os.walk(dist):
    for f in fs:
        if f.endswith('.html'):
            r=os.path.relpath(os.path.join(root,f),dist)[:-5]; pages.append('/' if r=='index' else '/'+r)
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}),args=['--no-sandbox'])
        for w in (320,390,768,1440):
            ctx=await br.new_context(viewport={'width':w,'height':800}); pg=await ctx.new_page()
            bad=[]
            for u in sorted(pages):
                await pg.goto(f'http://127.0.0.1:{port}{u}'); await pg.wait_for_timeout(150)
                r=await pg.evaluate('''()=>{const W=document.documentElement.clientWidth;const o=[];document.querySelectorAll('body *').forEach(e=>{const b=e.getBoundingClientRect();if(b.width>0&&b.right>W+1&&getComputedStyle(e).position!=='fixed'){let p=e.parentElement,clip=false;while(p){const s=getComputedStyle(p);if(['auto','scroll','hidden','clip'].includes(s.overflowX)){clip=true;break}p=p.parentElement}if(!clip)o.push(e.tagName.toLowerCase()+'.'+[...e.classList].join('.')+':'+Math.round(b.right))}});return {sw:document.documentElement.scrollWidth,W,o:o.slice(0,4)}}''')
                if r['sw']>r['W'] or r['o']: bad.append((u,r))
            print(w,'ok' if not bad else bad)
            await ctx.close()
        await br.close()
asyncio.run(main())
