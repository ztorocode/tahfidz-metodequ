const CACHE='mutqeen-firstact1106';
const PUBLIC_SHELL=[
 './','./index.html','./manifest.webmanifest',
 './assets/css/variables.css?v=81bed469','./assets/css/base.css?v=81bed469','./assets/css/layout.css?v=81bed469',
 './assets/css/components.css?v=modeform1106','./assets/css/responsive.css?v=f28a6c10','./assets/css/halaqah-camera.css?v=camfixb4d2','./assets/css/landing.css?v=b8c14e72',
 './assets/images/icon.svg?v=81bed469','./assets/css/donasi.css?v=thanksdon31','./assets/css/platform-user-edit.css?v=usereditb27','./assets/css/student-halaqah-search.css?v=halasearch7c2',
 './js/app.js?v=firstact1106','./js/store.js?v=81bed469',
 './js/pages/login.js?v=demofill1106',
 './js/pages/landing.js?v=d2f91a63','./js/pages/donasi.js?v=donorlogout62','./js/pages/donatur-auth.js?v=donorlocal72','./js/pages/donation-confirmation.js?v=proofauthfix31',
 './js/pages/terima-undangan.js?v=b8c14e72',
 './js/utils/helpers.js?v=81bed469','./js/utils/donatur-demo.js?v=donorlocal72'
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
 // API data must always come from the network; do not cache donor totals or private data.
 if(new URL(event.request.url).pathname.startsWith('/api/'))return;
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
