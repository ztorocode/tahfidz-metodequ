const CACHE='metodequ-3f9d7c21';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=3f9d7c21','./assets/css/base.css?v=3f9d7c21','./assets/css/layout.css?v=3f9d7c21',
  './assets/css/components.css?v=3f9d7c21','./assets/css/responsive.css?v=3f9d7c21',
  './assets/images/icon.svg?v=3f9d7c21',
  './js/app.js?v=3f9d7c21','./js/router.js?v=3f9d7c21','./js/store.js?v=3f9d7c21',
  './js/data/dummy-data.js?v=3f9d7c21','./js/data/quran-juz.js?v=3f9d7c21','./js/components/app-shell.js?v=3f9d7c21',
  './js/components/context-switcher.js?v=3f9d7c21','./js/layouts/app-layout.js?v=3f9d7c21',
  './js/utils/helpers.js?v=3f9d7c21','./js/utils/progress-context.js?v=3f9d7c21',
 './js/utils/progress-sync.js?v=3f9d7c21','./js/utils/student-progress.js?v=3f9d7c21',
 './js/utils/setoran.js?v=3f9d7c21',
 './js/utils/quran-text.js?v=3f9d7c21',
 './js/utils/program-context.js?v=3f9d7c21',
  './js/pages/login.js?v=3f9d7c21','./js/pages/member-progress.js?v=3f9d7c21','./js/pages/member-dashboard.js?v=3f9d7c21','./js/pages/program.js?v=3f9d7c21',
  './js/pages/activity.js?v=3f9d7c21','./js/pages/submission.js?v=3f9d7c21','./js/pages/murajaah.js?v=3f9d7c21',
  './js/pages/notifications.js?v=3f9d7c21','./js/pages/musyrif-dashboard.js?v=3f9d7c21',
  './js/pages/review.js?v=3f9d7c21','./js/pages/admin-dashboard.js?v=3f9d7c21','./js/pages/halaqah.js?v=3f9d7c21','./js/pages/santri-progress.js?v=3f9d7c21','./js/pages/tabel-progress.js?v=3f9d7c21',
  './js/pages/rabth-ayat.js?v=3f9d7c21',
 './js/pages/whatsapp.js?v=3f9d7c21','./js/pages/super-admin.js?v=3f9d7c21'
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