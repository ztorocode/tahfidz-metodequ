const CACHE='metodequ-ec26735e';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=ec26735e','./assets/css/base.css?v=ec26735e','./assets/css/layout.css?v=ec26735e',
  './assets/css/components.css?v=ec26735e','./assets/css/responsive.css?v=ec26735e',
  './assets/images/icon.svg?v=ec26735e',
  './js/app.js?v=ec26735e','./js/router.js?v=ec26735e','./js/store.js?v=ec26735e',
  './js/data/dummy-data.js?v=ec26735e','./js/components/app-shell.js?v=ec26735e',
  './js/components/context-switcher.js?v=ec26735e','./js/layouts/app-layout.js?v=ec26735e',
  './js/utils/helpers.js?v=ec26735e','./js/utils/progress-context.js?v=ec26735e',
  './js/pages/login.js?v=ec26735e','./js/pages/member-progress.js?v=ec26735e','./js/pages/member-dashboard.js?v=ec26735e','./js/pages/program.js?v=ec26735e',
  './js/pages/activity.js?v=ec26735e','./js/pages/submission.js?v=ec26735e','./js/pages/murajaah.js?v=ec26735e',
  './js/pages/notifications.js?v=ec26735e','./js/pages/musyrif-dashboard.js?v=ec26735e',
  './js/pages/review.js?v=ec26735e','./js/pages/admin-dashboard.js?v=ec26735e','./js/pages/halaqah.js?v=ec26735e','./js/pages/santri-progress.js?v=ec26735e','./js/pages/tabel-progress.js?v=ec26735e',
  './js/pages/whatsapp.js?v=ec26735e','./js/pages/super-admin.js?v=ec26735e'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});