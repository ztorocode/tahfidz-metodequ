const CACHE='metodequ-b7e3f1d5';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=b7e3f1d5','./assets/css/base.css?v=b7e3f1d5','./assets/css/layout.css?v=b7e3f1d5',
  './assets/css/components.css?v=b7e3f1d5','./assets/css/responsive.css?v=b7e3f1d5',
  './assets/images/icon.svg?v=b7e3f1d5',
  './js/app.js?v=b7e3f1d5','./js/router.js?v=b7e3f1d5','./js/store.js?v=b7e3f1d5',
  './js/data/dummy-data.js?v=b7e3f1d5','./js/data/quran-juz.js?v=b7e3f1d5','./js/components/app-shell.js?v=b7e3f1d5',
  './js/components/context-switcher.js?v=b7e3f1d5','./js/layouts/app-layout.js?v=b7e3f1d5',
  './js/utils/helpers.js?v=b7e3f1d5','./js/utils/progress-context.js?v=b7e3f1d5',
 './js/utils/progress-sync.js?v=b7e3f1d5','./js/utils/student-progress.js?v=b7e3f1d5',
 './js/utils/setoran.js?v=b7e3f1d5',
 './js/utils/quran-text.js?v=b7e3f1d5',
 './js/utils/program-context.js?v=b7e3f1d5',
  './js/pages/login.js?v=b7e3f1d5','./js/pages/member-progress.js?v=b7e3f1d5','./js/pages/member-dashboard.js?v=b7e3f1d5','./js/pages/program.js?v=b7e3f1d5',
  './js/pages/activity.js?v=b7e3f1d5','./js/pages/submission.js?v=b7e3f1d5','./js/pages/murajaah.js?v=b7e3f1d5',
  './js/pages/notifications.js?v=b7e3f1d5','./js/pages/musyrif-dashboard.js?v=b7e3f1d5',
  './js/pages/review.js?v=b7e3f1d5','./js/pages/admin-dashboard.js?v=b7e3f1d5','./js/pages/halaqah.js?v=b7e3f1d5','./js/pages/santri-progress.js?v=b7e3f1d5','./js/pages/tabel-progress.js?v=b7e3f1d5',
  './js/pages/rabth-ayat.js?v=b7e3f1d5',
 './js/pages/whatsapp.js?v=b7e3f1d5','./js/pages/super-admin.js?v=b7e3f1d5'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});