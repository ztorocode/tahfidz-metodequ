const CACHE='metodequ-6b9531ee';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=6b9531ee','./assets/css/base.css?v=6b9531ee','./assets/css/layout.css?v=6b9531ee',
  './assets/css/components.css?v=6b9531ee','./assets/css/responsive.css?v=6b9531ee',
  './assets/images/icon.svg?v=6b9531ee',
  './js/app.js?v=6b9531ee','./js/router.js?v=6b9531ee','./js/store.js?v=6b9531ee',
  './js/data/dummy-data.js?v=6b9531ee','./js/components/app-shell.js?v=6b9531ee',
  './js/components/context-switcher.js?v=6b9531ee','./js/layouts/app-layout.js?v=6b9531ee',
  './js/utils/helpers.js?v=6b9531ee','./js/utils/progress-context.js?v=6b9531ee',
  './js/pages/login.js?v=6b9531ee','./js/pages/member-progress.js?v=6b9531ee','./js/pages/member-dashboard.js?v=6b9531ee','./js/pages/program.js?v=6b9531ee',
  './js/pages/activity.js?v=6b9531ee','./js/pages/submission.js?v=6b9531ee','./js/pages/murajaah.js?v=6b9531ee',
  './js/pages/notifications.js?v=6b9531ee','./js/pages/musyrif-dashboard.js?v=6b9531ee',
  './js/pages/review.js?v=6b9531ee','./js/pages/admin-dashboard.js?v=6b9531ee','./js/pages/halaqah.js?v=6b9531ee','./js/pages/santri-progress.js?v=6b9531ee','./js/pages/tabel-progress.js?v=6b9531ee',
  './js/pages/whatsapp.js?v=6b9531ee','./js/pages/super-admin.js?v=6b9531ee'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});