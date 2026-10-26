const CACHE='metodequ-b1d7cf8b';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=b1d7cf8b','./assets/css/base.css?v=b1d7cf8b','./assets/css/layout.css?v=b1d7cf8b',
  './assets/css/components.css?v=b1d7cf8b','./assets/css/responsive.css?v=b1d7cf8b',
  './assets/images/icon.svg?v=b1d7cf8b',
  './js/app.js?v=b1d7cf8b','./js/router.js?v=b1d7cf8b','./js/store.js?v=b1d7cf8b',
  './js/data/dummy-data.js?v=b1d7cf8b','./js/data/quran-juz.js?v=b1d7cf8b','./js/components/app-shell.js?v=b1d7cf8b',
  './js/components/context-switcher.js?v=b1d7cf8b','./js/layouts/app-layout.js?v=b1d7cf8b',
  './js/utils/helpers.js?v=b1d7cf8b','./js/utils/progress-context.js?v=b1d7cf8b',
 './js/utils/progress-sync.js?v=b1d7cf8b','./js/utils/student-progress.js?v=b1d7cf8b',
 './js/utils/setoran.js?v=b1d7cf8b',
 './js/utils/quran-text.js?v=b1d7cf8b',
 './js/utils/program-context.js?v=b1d7cf8b',
  './js/pages/login.js?v=b1d7cf8b','./js/pages/member-progress.js?v=b1d7cf8b','./js/pages/member-dashboard.js?v=b1d7cf8b','./js/pages/program.js?v=b1d7cf8b',
  './js/pages/activity.js?v=b1d7cf8b','./js/pages/submission.js?v=b1d7cf8b','./js/pages/murajaah.js?v=b1d7cf8b',
  './js/pages/notifications.js?v=b1d7cf8b','./js/pages/musyrif-dashboard.js?v=b1d7cf8b',
  './js/pages/review.js?v=b1d7cf8b','./js/pages/admin-dashboard.js?v=b1d7cf8b','./js/pages/halaqah.js?v=b1d7cf8b','./js/pages/santri-progress.js?v=b1d7cf8b','./js/pages/tabel-progress.js?v=b1d7cf8b',
  './js/pages/rabth-ayat.js?v=b1d7cf8b',
 './js/pages/whatsapp.js?v=b1d7cf8b','./js/pages/super-admin.js?v=b1d7cf8b'
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