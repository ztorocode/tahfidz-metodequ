const CACHE='metodequ-bc1e4f7d';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=bc1e4f7d','./assets/css/base.css?v=bc1e4f7d','./assets/css/layout.css?v=bc1e4f7d',
  './assets/css/components.css?v=bc1e4f7d','./assets/css/responsive.css?v=bc1e4f7d',
  './assets/images/icon.svg?v=bc1e4f7d',
  './js/app.js?v=bc1e4f7d','./js/router.js?v=bc1e4f7d','./js/store.js?v=bc1e4f7d',
  './js/data/dummy-data.js?v=bc1e4f7d','./js/components/app-shell.js?v=bc1e4f7d',
  './js/components/context-switcher.js?v=bc1e4f7d','./js/layouts/app-layout.js?v=bc1e4f7d',
  './js/utils/helpers.js?v=bc1e4f7d','./js/utils/progress-context.js?v=bc1e4f7d',
  './js/pages/login.js?v=bc1e4f7d','./js/pages/member-progress.js?v=bc1e4f7d','./js/pages/member-dashboard.js?v=bc1e4f7d','./js/pages/program.js?v=bc1e4f7d',
  './js/pages/activity.js?v=bc1e4f7d','./js/pages/submission.js?v=bc1e4f7d','./js/pages/murajaah.js?v=bc1e4f7d',
  './js/pages/notifications.js?v=bc1e4f7d','./js/pages/musyrif-dashboard.js?v=bc1e4f7d',
  './js/pages/review.js?v=bc1e4f7d','./js/pages/admin-dashboard.js?v=bc1e4f7d','./js/pages/halaqah.js?v=bc1e4f7d','./js/pages/santri-progress.js?v=bc1e4f7d','./js/pages/tabel-progress.js?v=bc1e4f7d',
  './js/pages/whatsapp.js?v=bc1e4f7d','./js/pages/super-admin.js?v=bc1e4f7d'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});