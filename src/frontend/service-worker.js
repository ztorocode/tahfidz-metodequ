const CACHE='metodequ-b9f2d6e1';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=b9f2d6e1','./assets/css/base.css?v=b9f2d6e1','./assets/css/layout.css?v=b9f2d6e1',
  './assets/css/components.css?v=b9f2d6e1','./assets/css/responsive.css?v=b9f2d6e1',
  './assets/images/icon.svg?v=b9f2d6e1',
  './js/app.js?v=b9f2d6e1','./js/router.js?v=b9f2d6e1','./js/store.js?v=b9f2d6e1',
  './js/data/dummy-data.js?v=b9f2d6e1','./js/data/quran-juz.js?v=b9f2d6e1','./js/components/app-shell.js?v=b9f2d6e1',
  './js/components/context-switcher.js?v=b9f2d6e1','./js/layouts/app-layout.js?v=b9f2d6e1',
  './js/utils/helpers.js?v=b9f2d6e1','./js/utils/progress-context.js?v=b9f2d6e1',
 './js/utils/progress-sync.js?v=b9f2d6e1','./js/utils/student-progress.js?v=b9f2d6e1',
 './js/utils/setoran.js?v=b9f2d6e1',
 './js/utils/program-context.js?v=b9f2d6e1',
  './js/pages/login.js?v=b9f2d6e1','./js/pages/member-progress.js?v=b9f2d6e1','./js/pages/member-dashboard.js?v=b9f2d6e1','./js/pages/program.js?v=b9f2d6e1',
  './js/pages/activity.js?v=b9f2d6e1','./js/pages/submission.js?v=b9f2d6e1','./js/pages/murajaah.js?v=b9f2d6e1',
  './js/pages/notifications.js?v=b9f2d6e1','./js/pages/musyrif-dashboard.js?v=b9f2d6e1',
  './js/pages/review.js?v=b9f2d6e1','./js/pages/admin-dashboard.js?v=b9f2d6e1','./js/pages/halaqah.js?v=b9f2d6e1','./js/pages/santri-progress.js?v=b9f2d6e1','./js/pages/tabel-progress.js?v=b9f2d6e1',
  './js/pages/whatsapp.js?v=b9f2d6e1','./js/pages/super-admin.js?v=b9f2d6e1'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});