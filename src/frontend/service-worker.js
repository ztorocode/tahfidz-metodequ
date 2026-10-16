const CACHE='metodequ-d116d033';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=d116d033','./assets/css/base.css?v=d116d033','./assets/css/layout.css?v=d116d033',
  './assets/css/components.css?v=d116d033','./assets/css/responsive.css?v=d116d033',
  './assets/images/icon.svg?v=d116d033',
  './js/app.js?v=d116d033','./js/router.js?v=d116d033','./js/store.js?v=d116d033',
  './js/data/dummy-data.js?v=d116d033','./js/components/app-shell.js?v=d116d033',
  './js/components/context-switcher.js?v=d116d033','./js/layouts/app-layout.js?v=d116d033',
  './js/utils/helpers.js?v=d116d033','./js/utils/progress-context.js?v=d116d033',
  './js/pages/login.js?v=d116d033','./js/pages/member-progress.js?v=d116d033','./js/pages/member-dashboard.js?v=d116d033','./js/pages/program.js?v=d116d033',
  './js/pages/activity.js?v=d116d033','./js/pages/submission.js?v=d116d033','./js/pages/murajaah.js?v=d116d033',
  './js/pages/notifications.js?v=d116d033','./js/pages/musyrif-dashboard.js?v=d116d033',
  './js/pages/review.js?v=d116d033','./js/pages/admin-dashboard.js?v=d116d033','./js/pages/halaqah.js?v=d116d033','./js/pages/santri-progress.js?v=d116d033','./js/pages/tabel-progress.js?v=d116d033',
  './js/pages/whatsapp.js?v=d116d033','./js/pages/super-admin.js?v=d116d033'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});