const CACHE='metodequ-10a66b8d';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=10a66b8d','./assets/css/base.css?v=10a66b8d','./assets/css/layout.css?v=10a66b8d',
  './assets/css/components.css?v=10a66b8d','./assets/css/responsive.css?v=10a66b8d',
  './assets/images/icon.svg?v=10a66b8d',
  './js/app.js?v=10a66b8d','./js/router.js?v=10a66b8d','./js/store.js?v=10a66b8d',
  './js/data/dummy-data.js?v=10a66b8d','./js/components/app-shell.js?v=10a66b8d',
  './js/components/context-switcher.js?v=10a66b8d','./js/layouts/app-layout.js?v=10a66b8d',
  './js/utils/helpers.js?v=10a66b8d','./js/utils/progress-context.js?v=10a66b8d',
  './js/pages/login.js?v=10a66b8d','./js/pages/member-progress.js?v=10a66b8d','./js/pages/member-dashboard.js?v=10a66b8d','./js/pages/program.js?v=10a66b8d',
  './js/pages/activity.js?v=10a66b8d','./js/pages/submission.js?v=10a66b8d','./js/pages/murajaah.js?v=10a66b8d',
  './js/pages/notifications.js?v=10a66b8d','./js/pages/musyrif-dashboard.js?v=10a66b8d',
  './js/pages/review.js?v=10a66b8d','./js/pages/admin-dashboard.js?v=10a66b8d','./js/pages/halaqah.js?v=10a66b8d','./js/pages/santri-progress.js?v=10a66b8d','./js/pages/tabel-progress.js?v=10a66b8d',
  './js/pages/whatsapp.js?v=10a66b8d','./js/pages/super-admin.js?v=10a66b8d'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});