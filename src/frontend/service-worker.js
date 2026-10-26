const CACHE='metodequ-fcee076c';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=fcee076c','./assets/css/base.css?v=fcee076c','./assets/css/layout.css?v=fcee076c',
  './assets/css/components.css?v=fcee076c','./assets/css/responsive.css?v=fcee076c',
  './assets/images/icon.svg?v=fcee076c',
  './js/app.js?v=fcee076c','./js/router.js?v=fcee076c','./js/store.js?v=fcee076c',
  './js/data/dummy-data.js?v=fcee076c','./js/data/quran-juz.js?v=fcee076c','./js/components/app-shell.js?v=fcee076c',
  './js/components/context-switcher.js?v=fcee076c','./js/layouts/app-layout.js?v=fcee076c',
  './js/utils/helpers.js?v=fcee076c','./js/utils/progress-context.js?v=fcee076c',
 './js/utils/progress-sync.js?v=fcee076c','./js/utils/student-progress.js?v=fcee076c',
 './js/utils/setoran.js?v=fcee076c',
 './js/utils/quran-text.js?v=fcee076c',
 './js/utils/program-context.js?v=fcee076c',
  './js/pages/login.js?v=fcee076c','./js/pages/member-progress.js?v=fcee076c','./js/pages/member-dashboard.js?v=fcee076c','./js/pages/program.js?v=fcee076c',
  './js/pages/activity.js?v=fcee076c','./js/pages/submission.js?v=fcee076c','./js/pages/murajaah.js?v=fcee076c',
  './js/pages/notifications.js?v=fcee076c','./js/pages/musyrif-dashboard.js?v=fcee076c',
  './js/pages/review.js?v=fcee076c','./js/pages/admin-dashboard.js?v=fcee076c','./js/pages/halaqah.js?v=fcee076c','./js/pages/santri-progress.js?v=fcee076c','./js/pages/tabel-progress.js?v=fcee076c',
  './js/pages/rabth-ayat.js?v=fcee076c',
 './js/pages/whatsapp.js?v=fcee076c','./js/pages/super-admin.js?v=fcee076c'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});