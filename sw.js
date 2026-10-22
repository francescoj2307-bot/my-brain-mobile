const NAME='my-brain-root-original-v2-20261022';
const ASSETS=['./','./index.html','./styles.css','./app.js','./theme-init.js','./local-api.js','./manifest.webmanifest','./icon.svg','./icon-180.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('my-brain-mobile-v1-')||k.startsWith('my-brain-root-original-'))&&k!==NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
e.respondWith(e.request.mode==='navigate'?fetch(e.request).catch(()=>caches.match('./index.html')):caches.match(e.request).then(hit=>hit||fetch(e.request)))});
