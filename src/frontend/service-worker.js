const CACHE='metodequ-3e7f9c14';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=3e7f9c14','./assets/css/base.css?v=3e7f9c14','./assets/css/layout.css?v=3e7f9c14',
  './assets/css/components.css?v=3e7f9c14','./assets/css/responsive.css?v=3e7f9c14',
  './assets/images/icon.svg?v=3e7f9c14',
  './js/app.js?v=3e7f9c14','./js/router.js?v=3e7f9c14','./js/store.js?v=3e7f9c14',
  './js/data/dummy-data.js?v=3e7f9c14','./js/components/app-shell.js?v=3e7f9c14',
  './js/components/context-switcher.js?v=3e7f9c14','./js/layouts/app-layout.js?v=3e7f9c14',
  './js/utils/helpers.js?v=3e7f9c14','./js/utils/progress-context.js?v=3e7f9c14',
 './js/utils/progress-sync.js?v=3e7f9c14','./js/utils/student-progress.js?v=3e7f9c14',
 './js/utils/program-context.js?v=3e7f9c14',
  './js/pages/login.js?v=3e7f9c14','./js/pages/member-progress.js?v=3e7f9c14','./js/pages/member-dashboard.js?v=3e7f9c14','./js/pages/program.js?v=3e7f9c14',
  './js/pages/activity.js?v=3e7f9c14','./js/pages/submission.js?v=3e7f9c14','./js/pages/murajaah.js?v=3e7f9c14',
  './js/pages/notifications.js?v=3e7f9c14','./js/pages/musyrif-dashboard.js?v=3e7f9c14',
  './js/pages/review.js?v=3e7f9c14','./js/pages/admin-dashboard.js?v=3e7f9c14','./js/pages/halaqah.js?v=3e7f9c14','./js/pages/santri-progress.js?v=3e7f9c14','./js/pages/tabel-progress.js?v=3e7f9c14',
  './js/pages/whatsapp.js?v=3e7f9c14','./js/pages/super-admin.js?v=3e7f9c14'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});