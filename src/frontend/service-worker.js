const CACHE='metodequ-b8c14e72';
const PUBLIC_SHELL=[
 './','./index.html','./manifest.webmanifest',
 './assets/css/variables.css?v=81bed469','./assets/css/base.css?v=81bed469','./assets/css/layout.css?v=81bed469',
 './assets/css/components.css?v=b9f2d4e1','./assets/css/responsive.css?v=f28a6c10','./assets/css/landing.css?v=b8c14e72',
 './assets/images/icon.svg?v=81bed469',
 './js/app.js?v=b8c14e72','./js/store.js?v=81bed469',
 './js/pages/login.js?v=b8c14e72',
 './js/pages/landing.js?v=b8c14e72',
 './js/pages/terima-undangan.js?v=b8c14e72',
 './js/utils/helpers.js?v=81bed469'
];

self.addEventListener('install',event=>{
 event.waitUntil(
  caches.open(CACHE)
   .then(cache=>cache.addAll(PUBLIC_SHELL))
   .then(()=>self.skipWaiting())
 );
});

self.addEventListener('activate',event=>{
 event.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
   .then(()=>self.clients.claim())
 );
});

self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!event.request.url.startsWith('http'))return;
 event.respondWith(
  fetch(event.request)
   .then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    return response;
   })
   .catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html')))
 );
});
