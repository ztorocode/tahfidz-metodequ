const CACHE='metodequ-5869f044';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=5869f044','./assets/css/base.css?v=5869f044','./assets/css/layout.css?v=5869f044',
  './assets/css/components.css?v=5869f044','./assets/css/responsive.css?v=5869f044',
  './assets/images/icon.svg?v=5869f044',
  './js/app.js?v=5869f044','./js/router.js?v=5869f044','./js/store.js?v=5869f044',
  './js/data/dummy-data.js?v=5869f044','./js/components/app-shell.js?v=5869f044',
  './js/components/context-switcher.js?v=5869f044','./js/layouts/app-layout.js?v=5869f044',
  './js/utils/helpers.js?v=5869f044','./js/utils/progress-context.js?v=5869f044',
  './js/pages/login.js?v=5869f044','./js/pages/member-progress.js?v=5869f044','./js/pages/member-dashboard.js?v=5869f044','./js/pages/program.js?v=5869f044',
  './js/pages/activity.js?v=5869f044','./js/pages/submission.js?v=5869f044','./js/pages/murajaah.js?v=5869f044',
  './js/pages/notifications.js?v=5869f044','./js/pages/musyrif-dashboard.js?v=5869f044',
  './js/pages/review.js?v=5869f044','./js/pages/admin-dashboard.js?v=5869f044','./js/pages/halaqah.js?v=5869f044','./js/pages/santri-progress.js?v=5869f044','./js/pages/tabel-progress.js?v=5869f044',
  './js/pages/whatsapp.js?v=5869f044','./js/pages/super-admin.js?v=5869f044'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});