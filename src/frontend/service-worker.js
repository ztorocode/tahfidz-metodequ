const CACHE='metodequ-b2f7d510';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=b2f7d510','./assets/css/base.css?v=b2f7d510','./assets/css/layout.css?v=b2f7d510',
  './assets/css/components.css?v=b2f7d510','./assets/css/responsive.css?v=b2f7d510',
  './assets/images/icon.svg?v=b2f7d510',
  './js/app.js?v=b2f7d510','./js/router.js?v=b2f7d510','./js/store.js?v=b2f7d510',
  './js/data/dummy-data.js?v=b2f7d510','./js/data/quran-juz.js?v=b2f7d510','./js/components/app-shell.js?v=b2f7d510',
  './js/components/context-switcher.js?v=b2f7d510','./js/layouts/app-layout.js?v=b2f7d510',
  './js/utils/helpers.js?v=b2f7d510','./js/utils/progress-context.js?v=b2f7d510',
 './js/utils/progress-sync.js?v=b2f7d510','./js/utils/student-progress.js?v=b2f7d510',
 './js/utils/setoran.js?v=b2f7d510',
 './js/utils/quran-text.js?v=b2f7d510',
 './js/utils/program-context.js?v=b2f7d510',
  './js/pages/login.js?v=b2f7d510','./js/pages/member-progress.js?v=b2f7d510','./js/pages/member-dashboard.js?v=b2f7d510','./js/pages/program.js?v=b2f7d510',
  './js/pages/activity.js?v=b2f7d510','./js/pages/submission.js?v=b2f7d510','./js/pages/murajaah.js?v=b2f7d510',
  './js/pages/notifications.js?v=b2f7d510','./js/pages/musyrif-dashboard.js?v=b2f7d510',
  './js/pages/review.js?v=b2f7d510','./js/pages/admin-dashboard.js?v=b2f7d510','./js/pages/halaqah.js?v=b2f7d510','./js/pages/santri-progress.js?v=b2f7d510','./js/pages/tabel-progress.js?v=b2f7d510',
  './js/pages/rabth-ayat.js?v=b2f7d510',
 './js/pages/whatsapp.js?v=b2f7d510','./js/pages/super-admin.js?v=b2f7d510'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  // Hanya skema http(s): request chrome-extension:// dsb. ditolak Cache API
  // ("Request scheme 'chrome-extension' is unsupported") — biarkan lewat tanpa di-cache.
  if(!e.request.url.startsWith('http')) return;
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
    return r;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});