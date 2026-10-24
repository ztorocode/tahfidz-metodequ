const CACHE='metodequ-e5c9b7a4';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=e5c9b7a4','./assets/css/base.css?v=e5c9b7a4','./assets/css/layout.css?v=e5c9b7a4',
  './assets/css/components.css?v=e5c9b7a4','./assets/css/responsive.css?v=e5c9b7a4',
  './assets/images/icon.svg?v=e5c9b7a4',
  './js/app.js?v=e5c9b7a4','./js/router.js?v=e5c9b7a4','./js/store.js?v=e5c9b7a4',
  './js/data/dummy-data.js?v=e5c9b7a4','./js/data/quran-juz.js?v=e5c9b7a4','./js/components/app-shell.js?v=e5c9b7a4',
  './js/components/context-switcher.js?v=e5c9b7a4','./js/layouts/app-layout.js?v=e5c9b7a4',
  './js/utils/helpers.js?v=e5c9b7a4','./js/utils/progress-context.js?v=e5c9b7a4',
 './js/utils/progress-sync.js?v=e5c9b7a4','./js/utils/student-progress.js?v=e5c9b7a4',
 './js/utils/setoran.js?v=e5c9b7a4',
 './js/utils/program-context.js?v=e5c9b7a4',
  './js/pages/login.js?v=e5c9b7a4','./js/pages/member-progress.js?v=e5c9b7a4','./js/pages/member-dashboard.js?v=e5c9b7a4','./js/pages/program.js?v=e5c9b7a4',
  './js/pages/activity.js?v=e5c9b7a4','./js/pages/submission.js?v=e5c9b7a4','./js/pages/murajaah.js?v=e5c9b7a4',
  './js/pages/notifications.js?v=e5c9b7a4','./js/pages/musyrif-dashboard.js?v=e5c9b7a4',
  './js/pages/review.js?v=e5c9b7a4','./js/pages/admin-dashboard.js?v=e5c9b7a4','./js/pages/halaqah.js?v=e5c9b7a4','./js/pages/santri-progress.js?v=e5c9b7a4','./js/pages/tabel-progress.js?v=e5c9b7a4',
  './js/pages/whatsapp.js?v=e5c9b7a4','./js/pages/super-admin.js?v=e5c9b7a4'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});