const CACHE='metodequ-hpfq5a1';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=hpfq5a1','./assets/css/base.css?v=hpfq5a1','./assets/css/layout.css?v=hpfq5a1',
  './assets/css/components.css?v=hpfq5a1','./assets/css/responsive.css?v=hpfq5a1',
  './assets/images/icon.svg?v=hpfq5a1',
  './js/app.js?v=hpfq5a1','./js/router.js?v=hpfq5a1','./js/store.js?v=hpfq5a1',
  './js/data/dummy-data.js?v=hpfq5a1','./js/data/quran-juz.js?v=hpfq5a1','./js/components/app-shell.js?v=hpfq5a1',
  './js/components/context-switcher.js?v=hpfq5a1','./js/layouts/app-layout.js?v=hpfq5a1',
  './js/utils/helpers.js?v=hpfq5a1','./js/utils/progress-context.js?v=hpfq5a1',
 './js/utils/progress-sync.js?v=hpfq5a1','./js/utils/student-progress.js?v=hpfq5a1',
 './js/utils/setoran.js?v=hpfq5a1',
 './js/utils/quran-text.js?v=hpfq5a1',
 './js/utils/program-context.js?v=hpfq5a1',
  './js/pages/login.js?v=hpfq5a1','./js/pages/member-progress.js?v=hpfq5a1','./js/pages/member-dashboard.js?v=hpfq5a1','./js/pages/program.js?v=hpfq5a1',
  './js/pages/activity.js?v=hpfq5a1','./js/pages/submission.js?v=hpfq5a1','./js/pages/murajaah.js?v=hpfq5a1',
  './js/pages/notifications.js?v=hpfq5a1','./js/pages/musyrif-dashboard.js?v=hpfq5a1',
  './js/pages/review.js?v=hpfq5a1','./js/pages/admin-dashboard.js?v=hpfq5a1','./js/pages/halaqah.js?v=hpfq5a1','./js/pages/santri-progress.js?v=hpfq5a1','./js/pages/tabel-progress.js?v=hpfq5a1',
  './js/pages/rabth-ayat.js?v=hpfq5a1',
 './js/pages/whatsapp.js?v=hpfq5a1','./js/pages/super-admin.js?v=hpfq5a1'
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