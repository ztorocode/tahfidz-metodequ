const CACHE='metodequ-c8f4a2e6';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=c8f4a2e6','./assets/css/base.css?v=c8f4a2e6','./assets/css/layout.css?v=c8f4a2e6',
  './assets/css/components.css?v=c8f4a2e6','./assets/css/responsive.css?v=c8f4a2e6',
  './assets/images/icon.svg?v=c8f4a2e6',
  './js/app.js?v=c8f4a2e6','./js/router.js?v=c8f4a2e6','./js/store.js?v=c8f4a2e6',
  './js/data/dummy-data.js?v=c8f4a2e6','./js/data/quran-juz.js?v=c8f4a2e6','./js/components/app-shell.js?v=c8f4a2e6',
  './js/components/context-switcher.js?v=c8f4a2e6','./js/layouts/app-layout.js?v=c8f4a2e6',
  './js/utils/helpers.js?v=c8f4a2e6','./js/utils/progress-context.js?v=c8f4a2e6',
 './js/utils/progress-sync.js?v=c8f4a2e6','./js/utils/student-progress.js?v=c8f4a2e6',
 './js/utils/setoran.js?v=c8f4a2e6',
 './js/utils/quran-text.js?v=c8f4a2e6',
 './js/utils/program-context.js?v=c8f4a2e6',
  './js/pages/login.js?v=c8f4a2e6','./js/pages/member-progress.js?v=c8f4a2e6','./js/pages/member-dashboard.js?v=c8f4a2e6','./js/pages/program.js?v=c8f4a2e6',
  './js/pages/activity.js?v=c8f4a2e6','./js/pages/submission.js?v=c8f4a2e6','./js/pages/murajaah.js?v=c8f4a2e6',
  './js/pages/notifications.js?v=c8f4a2e6','./js/pages/musyrif-dashboard.js?v=c8f4a2e6',
  './js/pages/review.js?v=c8f4a2e6','./js/pages/admin-dashboard.js?v=c8f4a2e6','./js/pages/halaqah.js?v=c8f4a2e6','./js/pages/santri-progress.js?v=c8f4a2e6','./js/pages/tabel-progress.js?v=c8f4a2e6',
  './js/pages/rabth-ayat.js?v=c8f4a2e6',
 './js/pages/whatsapp.js?v=c8f4a2e6','./js/pages/super-admin.js?v=c8f4a2e6'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});