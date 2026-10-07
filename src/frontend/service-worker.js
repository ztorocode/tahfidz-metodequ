const CACHE='metodequ-prototype-dev-d613201b';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css','./assets/css/base.css','./assets/css/layout.css',
  './assets/css/components.css','./assets/css/responsive.css',
  './assets/images/icon.svg?v=7f3a91c2',
  './js/app.js?v=dev-d613201b','./js/router.js?v=dev-d613201b','./js/store.js?v=dev-d613201b',
  './js/data/dummy-data.js?v=dev-d613201b','./js/components/app-shell.js?v=dev-d613201b',
  './js/components/context-switcher.js?v=dev-d613201b','./js/layouts/app-layout.js?v=dev-d613201b',
  './js/utils/helpers.js?v=dev-d613201b',
  './js/pages/login.js?v=dev-d613201b','./js/pages/member-dashboard.js?v=dev-d613201b','./js/pages/program.js?v=dev-d613201b',
  './js/pages/activity.js?v=dev-d613201b','./js/pages/submission.js?v=dev-d613201b','./js/pages/murajaah.js?v=dev-d613201b',
  './js/pages/notifications.js?v=dev-d613201b','./js/pages/musyrif-dashboard.js?v=dev-d613201b',
  './js/pages/review.js?v=dev-d613201b','./js/pages/admin-dashboard.js?v=dev-d613201b','./js/pages/halaqah.js?v=dev-d613201b',
  './js/pages/whatsapp.js?v=dev-d613201b'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});