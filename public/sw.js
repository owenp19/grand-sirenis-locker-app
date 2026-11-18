/* La PWA conserva los archivos visuales; nunca almacena respuestas de la API ni datos personales. */
const CACHE='lockerflow-shell-v2';
const ASSETS=['./offline.html','./assets/css/app.css','./assets/css/auth.css','./assets/js/app.js','./assets/js/auth.js','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/api.php')||url.pathname.endsWith('/login.php')||url.pathname.endsWith('/setup.php')||url.pathname.endsWith('/register.php')||url.pathname.endsWith('/logout.php'))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match('./offline.html')));
    return;
  }
  if(ASSETS.some(a=>url.pathname.endsWith(a.replace('./','/')))){
    event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
  }
});
