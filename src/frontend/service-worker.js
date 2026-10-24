const CACHE='metodequ-f4a7c1d9';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=f4a7c1d9','./assets/css/base.css?v=f4a7c1d9','./assets/css/layout.css?v=f4a7c1d9',
  './assets/css/components.css?v=f4a7c1d9','./assets/css/responsive.css?v=f4a7c1d9',
  './assets/images/icon.svg?v=f4a7c1d9',
  './js/app.js?v=f4a7c1d9','./js/router.js?v=f4a7c1d9','./js/store.js?v=f4a7c1d9',
  './js/data/dummy-data.js?v=f4a7c1d9','./js/components/app-shell.js?v=f4a7c1d9',
  './js/components/context-switcher.js?v=f4a7c1d9','./js/layouts/app-layout.js?v=f4a7c1d9',
  './js/utils/helpers.js?v=f4a7c1d9','./js/utils/progress-context.js?v=f4a7c1d9',
 './js/utils/progress-sync.js?v=f4a7c1d9','./js/utils/student-progress.js?v=f4a7c1d9',
 './js/utils/setoran.js?v=f4a7c1d9',
 './js/utils/program-context.js?v=f4a7c1d9',
  './js/pages/login.js?v=f4a7c1d9','./js/pages/member-progress.js?v=f4a7c1d9','./js/pages/member-dashboard.js?v=f4a7c1d9','./js/pages/program.js?v=f4a7c1d9',
  './js/pages/activity.js?v=f4a7c1d9','./js/pages/submission.js?v=f4a7c1d9','./js/pages/murajaah.js?v=f4a7c1d9',
  './js/pages/notifications.js?v=f4a7c1d9','./js/pages/musyrif-dashboard.js?v=f4a7c1d9',
  './js/pages/review.js?v=f4a7c1d9','./js/pages/admin-dashboard.js?v=f4a7c1d9','./js/pages/halaqah.js?v=f4a7c1d9','./js/pages/santri-progress.js?v=f4a7c1d9','./js/pages/tabel-progress.js?v=f4a7c1d9',
  './js/pages/whatsapp.js?v=f4a7c1d9','./js/pages/super-admin.js?v=f4a7c1d9'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});