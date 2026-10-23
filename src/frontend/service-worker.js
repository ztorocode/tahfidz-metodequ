const CACHE='metodequ-f52d1a07';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=f52d1a07','./assets/css/base.css?v=f52d1a07','./assets/css/layout.css?v=f52d1a07',
  './assets/css/components.css?v=f52d1a07','./assets/css/responsive.css?v=f52d1a07',
  './assets/images/icon.svg?v=f52d1a07',
  './js/app.js?v=f52d1a07','./js/router.js?v=f52d1a07','./js/store.js?v=f52d1a07',
  './js/data/dummy-data.js?v=f52d1a07','./js/components/app-shell.js?v=f52d1a07',
  './js/components/context-switcher.js?v=f52d1a07','./js/layouts/app-layout.js?v=f52d1a07',
  './js/utils/helpers.js?v=f52d1a07','./js/utils/progress-context.js?v=f52d1a07',
 './js/utils/progress-sync.js?v=f52d1a07','./js/utils/student-progress.js?v=f52d1a07',
 './js/utils/setoran.js?v=f52d1a07',
 './js/utils/program-context.js?v=f52d1a07',
  './js/pages/login.js?v=f52d1a07','./js/pages/member-progress.js?v=f52d1a07','./js/pages/member-dashboard.js?v=f52d1a07','./js/pages/program.js?v=f52d1a07',
  './js/pages/activity.js?v=f52d1a07','./js/pages/submission.js?v=f52d1a07','./js/pages/murajaah.js?v=f52d1a07',
  './js/pages/notifications.js?v=f52d1a07','./js/pages/musyrif-dashboard.js?v=f52d1a07',
  './js/pages/review.js?v=f52d1a07','./js/pages/admin-dashboard.js?v=f52d1a07','./js/pages/halaqah.js?v=f52d1a07','./js/pages/santri-progress.js?v=f52d1a07','./js/pages/tabel-progress.js?v=f52d1a07',
  './js/pages/whatsapp.js?v=f52d1a07','./js/pages/super-admin.js?v=f52d1a07'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});