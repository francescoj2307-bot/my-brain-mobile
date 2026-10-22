const CACHE='my-brain-mobile-v2-20261022';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-180.png','./official-mac-import.js?v=1'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('my-brain-mobile-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));
  } else {
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  }
});