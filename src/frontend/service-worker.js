const CACHE='metodequ-578e63ba';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=578e63ba','./assets/css/base.css?v=578e63ba','./assets/css/layout.css?v=578e63ba',
  './assets/css/components.css?v=578e63ba','./assets/css/responsive.css?v=578e63ba',
  './assets/images/icon.svg?v=578e63ba',
  './js/app.js?v=578e63ba','./js/router.js?v=578e63ba','./js/store.js?v=578e63ba',
  './js/data/dummy-data.js?v=578e63ba','./js/components/app-shell.js?v=578e63ba',
  './js/components/context-switcher.js?v=578e63ba','./js/layouts/app-layout.js?v=578e63ba',
  './js/utils/helpers.js?v=578e63ba','./js/utils/progress-context.js?v=578e63ba',
  './js/pages/login.js?v=578e63ba','./js/pages/member-progress.js?v=578e63ba','./js/pages/member-dashboard.js?v=578e63ba','./js/pages/program.js?v=578e63ba',
  './js/pages/activity.js?v=578e63ba','./js/pages/submission.js?v=578e63ba','./js/pages/murajaah.js?v=578e63ba',
  './js/pages/notifications.js?v=578e63ba','./js/pages/musyrif-dashboard.js?v=578e63ba',
  './js/pages/review.js?v=578e63ba','./js/pages/admin-dashboard.js?v=578e63ba','./js/pages/halaqah.js?v=578e63ba','./js/pages/santri-progress.js?v=578e63ba','./js/pages/tabel-progress.js?v=578e63ba',
  './js/pages/whatsapp.js?v=578e63ba','./js/pages/super-admin.js?v=578e63ba'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});