const CACHE='metodequ-c8f14a2e';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=7a5d9b42','./assets/css/base.css?v=7a5d9b42','./assets/css/layout.css?v=7a5d9b42',
  './assets/css/components.css?v=7a5d9b42','./assets/css/responsive.css?v=c8f14a2e',
  './assets/images/icon.svg?v=7a5d9b42',
  './js/app.js?v=c8f14a2e','./js/router.js?v=7a5d9b42','./js/store.js?v=7a5d9b42',
  './js/data/dummy-data.js?v=7a5d9b42','./js/data/quran-juz.js?v=7a5d9b42','./js/components/app-shell.js?v=7a5d9b42',
  './js/components/context-switcher.js?v=7a5d9b42','./js/layouts/app-layout.js?v=7a5d9b42',
  './js/utils/helpers.js?v=7a5d9b42','./js/utils/progress-context.js?v=7a5d9b42',
 './js/utils/progress-sync.js?v=7a5d9b42','./js/utils/student-progress.js?v=7a5d9b42',
 './js/utils/setoran.js?v=7a5d9b42',
 './js/utils/quran-text.js?v=7a5d9b42',
 './js/utils/program-context.js?v=7a5d9b42',
  './js/pages/login.js?v=7a5d9b42','./js/pages/member-progress.js?v=7a5d9b42','./js/pages/member-dashboard.js?v=7a5d9b42','./js/pages/program.js?v=7a5d9b42',
  './js/pages/activity.js?v=7a5d9b42','./js/pages/submission.js?v=7a5d9b42','./js/pages/murajaah.js?v=7a5d9b42',
  './js/pages/notifications.js?v=7a5d9b42','./js/pages/musyrif-dashboard.js?v=7a5d9b42',
  './js/pages/review.js?v=7a5d9b42','./js/pages/admin-dashboard.js?v=7a5d9b42','./js/pages/halaqah.js?v=7a5d9b42','./js/pages/santri-progress.js?v=7a5d9b42','./js/pages/tabel-progress.js?v=7a5d9b42',
  './js/pages/rabth-ayat.js?v=7a5d9b42',
 './js/pages/whatsapp.js?v=7a5d9b42','./js/pages/super-admin.js?v=c8f14a2e'
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