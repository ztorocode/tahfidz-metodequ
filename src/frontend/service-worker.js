const CACHE='metodequ-d4b8e2f6';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=d4b8e2f6','./assets/css/base.css?v=d4b8e2f6','./assets/css/layout.css?v=d4b8e2f6',
  './assets/css/components.css?v=d4b8e2f6','./assets/css/responsive.css?v=d4b8e2f6',
  './assets/images/icon.svg?v=d4b8e2f6',
  './js/app.js?v=d4b8e2f6','./js/router.js?v=d4b8e2f6','./js/store.js?v=d4b8e2f6',
  './js/data/dummy-data.js?v=d4b8e2f6','./js/data/quran-juz.js?v=d4b8e2f6','./js/components/app-shell.js?v=d4b8e2f6',
  './js/components/context-switcher.js?v=d4b8e2f6','./js/layouts/app-layout.js?v=d4b8e2f6',
  './js/utils/helpers.js?v=d4b8e2f6','./js/utils/progress-context.js?v=d4b8e2f6',
 './js/utils/progress-sync.js?v=d4b8e2f6','./js/utils/student-progress.js?v=d4b8e2f6',
 './js/utils/setoran.js?v=d4b8e2f6',
 './js/utils/quran-text.js?v=d4b8e2f6',
 './js/utils/program-context.js?v=d4b8e2f6',
  './js/pages/login.js?v=d4b8e2f6','./js/pages/member-progress.js?v=d4b8e2f6','./js/pages/member-dashboard.js?v=d4b8e2f6','./js/pages/program.js?v=d4b8e2f6',
  './js/pages/activity.js?v=d4b8e2f6','./js/pages/submission.js?v=d4b8e2f6','./js/pages/murajaah.js?v=d4b8e2f6',
  './js/pages/notifications.js?v=d4b8e2f6','./js/pages/musyrif-dashboard.js?v=d4b8e2f6',
  './js/pages/review.js?v=d4b8e2f6','./js/pages/admin-dashboard.js?v=d4b8e2f6','./js/pages/halaqah.js?v=d4b8e2f6','./js/pages/santri-progress.js?v=d4b8e2f6','./js/pages/tabel-progress.js?v=d4b8e2f6',
  './js/pages/rabth-ayat.js?v=d4b8e2f6',
 './js/pages/whatsapp.js?v=d4b8e2f6','./js/pages/super-admin.js?v=d4b8e2f6'
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