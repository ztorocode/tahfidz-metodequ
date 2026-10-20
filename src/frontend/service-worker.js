const CACHE='metodequ-7b2e4d51';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=7b2e4d51','./assets/css/base.css?v=7b2e4d51','./assets/css/layout.css?v=7b2e4d51',
  './assets/css/components.css?v=7b2e4d51','./assets/css/responsive.css?v=7b2e4d51',
  './assets/images/icon.svg?v=7b2e4d51',
  './js/app.js?v=7b2e4d51','./js/router.js?v=7b2e4d51','./js/store.js?v=7b2e4d51',
  './js/data/dummy-data.js?v=7b2e4d51','./js/components/app-shell.js?v=7b2e4d51',
  './js/components/context-switcher.js?v=7b2e4d51','./js/layouts/app-layout.js?v=7b2e4d51',
  './js/utils/helpers.js?v=7b2e4d51','./js/utils/progress-context.js?v=7b2e4d51',
 './js/utils/progress-sync.js?v=7b2e4d51','./js/utils/student-progress.js?v=7b2e4d51',
 './js/utils/program-context.js?v=7b2e4d51',
  './js/pages/login.js?v=7b2e4d51','./js/pages/member-progress.js?v=7b2e4d51','./js/pages/member-dashboard.js?v=7b2e4d51','./js/pages/program.js?v=7b2e4d51',
  './js/pages/activity.js?v=7b2e4d51','./js/pages/submission.js?v=7b2e4d51','./js/pages/murajaah.js?v=7b2e4d51',
  './js/pages/notifications.js?v=7b2e4d51','./js/pages/musyrif-dashboard.js?v=7b2e4d51',
  './js/pages/review.js?v=7b2e4d51','./js/pages/admin-dashboard.js?v=7b2e4d51','./js/pages/halaqah.js?v=7b2e4d51','./js/pages/santri-progress.js?v=7b2e4d51','./js/pages/tabel-progress.js?v=7b2e4d51',
  './js/pages/whatsapp.js?v=7b2e4d51','./js/pages/super-admin.js?v=7b2e4d51'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});