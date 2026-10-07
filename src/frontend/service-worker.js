const CACHE='metodequ-prototype-dev-719a61bf';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css','./assets/css/base.css','./assets/css/layout.css',
  './assets/css/components.css','./assets/css/responsive.css',
  './assets/images/icon.svg?v=7f3a91c2',
  './js/app.js?v=dev-719a61bf','./js/router.js?v=dev-719a61bf','./js/store.js?v=dev-719a61bf',
  './js/data/dummy-data.js?v=dev-719a61bf','./js/components/app-shell.js?v=dev-719a61bf',
  './js/components/context-switcher.js?v=dev-719a61bf','./js/layouts/app-layout.js?v=dev-719a61bf',
  './js/utils/helpers.js?v=dev-719a61bf',
  './js/pages/login.js?v=dev-719a61bf','./js/pages/member-dashboard.js?v=dev-719a61bf','./js/pages/program.js?v=dev-719a61bf',
  './js/pages/activity.js?v=dev-719a61bf','./js/pages/submission.js?v=dev-719a61bf','./js/pages/murajaah.js?v=dev-719a61bf',
  './js/pages/notifications.js?v=dev-719a61bf','./js/pages/musyrif-dashboard.js?v=dev-719a61bf',
  './js/pages/review.js?v=dev-719a61bf','./js/pages/admin-dashboard.js?v=dev-719a61bf','./js/pages/halaqah.js?v=dev-719a61bf',
  './js/pages/whatsapp.js?v=dev-719a61bf'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});