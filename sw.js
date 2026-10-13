// Offline application shell cache. Increment version when deploying changes.
const CACHE_NAME='fr-printmargin-v1.1.0';
const APP_SHELL=['./','./index.html','./styles.css?v=1.1.0','./app.js?v=1.1.0','./math.js','./manifest.webmanifest','./icons/app-icon-v11-192.png','./icons/app-icon-v11-512.png','./icons/app-icon-v11-180.png','./icons/app-icon-v11-32.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('fr-printmargin-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
      return response;
    }).catch(async()=>await caches.match(request)||await caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
    return response;
  })));
});
