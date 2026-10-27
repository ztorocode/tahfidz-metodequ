const CACHE='metodequ-dae8efdc';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=dae8efdc','./assets/css/base.css?v=dae8efdc','./assets/css/layout.css?v=dae8efdc',
  './assets/css/components.css?v=dae8efdc','./assets/css/responsive.css?v=dae8efdc',
  './assets/images/icon.svg?v=dae8efdc',
  './js/app.js?v=dae8efdc','./js/router.js?v=dae8efdc','./js/store.js?v=dae8efdc',
  './js/data/dummy-data.js?v=dae8efdc','./js/data/quran-juz.js?v=dae8efdc','./js/components/app-shell.js?v=dae8efdc',
  './js/components/context-switcher.js?v=dae8efdc','./js/layouts/app-layout.js?v=dae8efdc',
  './js/utils/helpers.js?v=dae8efdc','./js/utils/progress-context.js?v=dae8efdc',
 './js/utils/progress-sync.js?v=dae8efdc','./js/utils/student-progress.js?v=dae8efdc',
 './js/utils/setoran.js?v=dae8efdc',
 './js/utils/quran-text.js?v=dae8efdc',
 './js/utils/program-context.js?v=dae8efdc',
  './js/pages/login.js?v=dae8efdc','./js/pages/member-progress.js?v=dae8efdc','./js/pages/member-dashboard.js?v=dae8efdc','./js/pages/program.js?v=dae8efdc',
  './js/pages/activity.js?v=dae8efdc','./js/pages/submission.js?v=dae8efdc','./js/pages/murajaah.js?v=dae8efdc',
  './js/pages/notifications.js?v=dae8efdc','./js/pages/musyrif-dashboard.js?v=dae8efdc',
  './js/pages/review.js?v=dae8efdc','./js/pages/admin-dashboard.js?v=dae8efdc','./js/pages/halaqah.js?v=dae8efdc','./js/pages/santri-progress.js?v=dae8efdc','./js/pages/tabel-progress.js?v=dae8efdc',
  './js/pages/rabth-ayat.js?v=dae8efdc',
 './js/pages/whatsapp.js?v=dae8efdc','./js/pages/super-admin.js?v=dae8efdc'
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