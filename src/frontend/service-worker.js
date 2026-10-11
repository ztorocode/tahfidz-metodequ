const CACHE='metodequ-ffe6b2ae';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=ffe6b2ae','./assets/css/base.css?v=ffe6b2ae','./assets/css/layout.css?v=ffe6b2ae',
  './assets/css/components.css?v=ffe6b2ae','./assets/css/responsive.css?v=ffe6b2ae',
  './assets/images/icon.svg?v=ffe6b2ae',
  './js/app.js?v=ffe6b2ae','./js/router.js?v=ffe6b2ae','./js/store.js?v=ffe6b2ae',
  './js/data/dummy-data.js?v=ffe6b2ae','./js/components/app-shell.js?v=ffe6b2ae',
  './js/components/context-switcher.js?v=ffe6b2ae','./js/layouts/app-layout.js?v=ffe6b2ae',
  './js/utils/helpers.js?v=ffe6b2ae','./js/utils/progress-context.js?v=ffe6b2ae',
  './js/pages/login.js?v=ffe6b2ae','./js/pages/member-progress.js?v=ffe6b2ae','./js/pages/member-dashboard.js?v=ffe6b2ae','./js/pages/program.js?v=ffe6b2ae',
  './js/pages/activity.js?v=ffe6b2ae','./js/pages/submission.js?v=ffe6b2ae','./js/pages/murajaah.js?v=ffe6b2ae',
  './js/pages/notifications.js?v=ffe6b2ae','./js/pages/musyrif-dashboard.js?v=ffe6b2ae',
  './js/pages/review.js?v=ffe6b2ae','./js/pages/admin-dashboard.js?v=ffe6b2ae','./js/pages/halaqah.js?v=ffe6b2ae','./js/pages/santri-progress.js?v=ffe6b2ae','./js/pages/tabel-progress.js?v=ffe6b2ae',
  './js/pages/whatsapp.js?v=ffe6b2ae','./js/pages/super-admin.js?v=ffe6b2ae'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});