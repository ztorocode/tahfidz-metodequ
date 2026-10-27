const CACHE='metodequ-c1d8e4a7';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=c1d8e4a7','./assets/css/base.css?v=c1d8e4a7','./assets/css/layout.css?v=c1d8e4a7',
  './assets/css/components.css?v=c1d8e4a7','./assets/css/responsive.css?v=c1d8e4a7',
  './assets/images/icon.svg?v=c1d8e4a7',
  './js/app.js?v=c1d8e4a7','./js/router.js?v=c1d8e4a7','./js/store.js?v=c1d8e4a7',
  './js/data/dummy-data.js?v=c1d8e4a7','./js/data/quran-juz.js?v=c1d8e4a7','./js/components/app-shell.js?v=c1d8e4a7',
  './js/components/context-switcher.js?v=c1d8e4a7','./js/layouts/app-layout.js?v=c1d8e4a7',
  './js/utils/helpers.js?v=c1d8e4a7','./js/utils/progress-context.js?v=c1d8e4a7',
 './js/utils/progress-sync.js?v=c1d8e4a7','./js/utils/student-progress.js?v=c1d8e4a7',
 './js/utils/setoran.js?v=c1d8e4a7',
 './js/utils/quran-text.js?v=c1d8e4a7',
 './js/utils/program-context.js?v=c1d8e4a7',
  './js/pages/login.js?v=c1d8e4a7','./js/pages/member-progress.js?v=c1d8e4a7','./js/pages/member-dashboard.js?v=c1d8e4a7','./js/pages/program.js?v=c1d8e4a7',
  './js/pages/activity.js?v=c1d8e4a7','./js/pages/submission.js?v=c1d8e4a7','./js/pages/murajaah.js?v=c1d8e4a7',
  './js/pages/notifications.js?v=c1d8e4a7','./js/pages/musyrif-dashboard.js?v=c1d8e4a7',
  './js/pages/review.js?v=c1d8e4a7','./js/pages/admin-dashboard.js?v=c1d8e4a7','./js/pages/halaqah.js?v=c1d8e4a7','./js/pages/santri-progress.js?v=c1d8e4a7','./js/pages/tabel-progress.js?v=c1d8e4a7',
  './js/pages/rabth-ayat.js?v=c1d8e4a7',
 './js/pages/whatsapp.js?v=c1d8e4a7','./js/pages/super-admin.js?v=c1d8e4a7'
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