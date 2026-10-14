const CACHE='metodequ-757b3b6b';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=757b3b6b','./assets/css/base.css?v=757b3b6b','./assets/css/layout.css?v=757b3b6b',
  './assets/css/components.css?v=757b3b6b','./assets/css/responsive.css?v=757b3b6b',
  './assets/images/icon.svg?v=757b3b6b',
  './js/app.js?v=757b3b6b','./js/router.js?v=757b3b6b','./js/store.js?v=757b3b6b',
  './js/data/dummy-data.js?v=757b3b6b','./js/components/app-shell.js?v=757b3b6b',
  './js/components/context-switcher.js?v=757b3b6b','./js/layouts/app-layout.js?v=757b3b6b',
  './js/utils/helpers.js?v=757b3b6b','./js/utils/progress-context.js?v=757b3b6b',
  './js/pages/login.js?v=757b3b6b','./js/pages/member-progress.js?v=757b3b6b','./js/pages/member-dashboard.js?v=757b3b6b','./js/pages/program.js?v=757b3b6b',
  './js/pages/activity.js?v=757b3b6b','./js/pages/submission.js?v=757b3b6b','./js/pages/murajaah.js?v=757b3b6b',
  './js/pages/notifications.js?v=757b3b6b','./js/pages/musyrif-dashboard.js?v=757b3b6b',
  './js/pages/review.js?v=757b3b6b','./js/pages/admin-dashboard.js?v=757b3b6b','./js/pages/halaqah.js?v=757b3b6b','./js/pages/santri-progress.js?v=757b3b6b','./js/pages/tabel-progress.js?v=757b3b6b',
  './js/pages/whatsapp.js?v=757b3b6b','./js/pages/super-admin.js?v=757b3b6b'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});