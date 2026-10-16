const CACHE='metodequ-b3af9b05';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=f3ae0417','./assets/css/base.css?v=f3ae0417','./assets/css/layout.css?v=f3ae0417',
  './assets/css/components.css?v=f3ae0417','./assets/css/responsive.css?v=f3ae0417',
  './assets/images/icon.svg?v=f3ae0417',
  './js/app.js?v=f3ae0417','./js/router.js?v=f3ae0417','./js/store.js?v=f3ae0417',
  './js/data/dummy-data.js?v=f3ae0417','./js/components/app-shell.js?v=f3ae0417',
  './js/components/context-switcher.js?v=f3ae0417','./js/layouts/app-layout.js?v=f3ae0417',
  './js/utils/helpers.js?v=f3ae0417','./js/utils/progress-context.js?v=f3ae0417',
  './js/pages/login.js?v=f3ae0417','./js/pages/member-progress.js?v=f3ae0417','./js/pages/member-dashboard.js?v=f3ae0417','./js/pages/program.js?v=f3ae0417',
  './js/pages/activity.js?v=f3ae0417','./js/pages/submission.js?v=f3ae0417','./js/pages/murajaah.js?v=f3ae0417',
  './js/pages/notifications.js?v=f3ae0417','./js/pages/musyrif-dashboard.js?v=f3ae0417',
  './js/pages/review.js?v=f3ae0417','./js/pages/admin-dashboard.js?v=f3ae0417','./js/pages/halaqah.js?v=f3ae0417','./js/pages/santri-progress.js?v=f3ae0417','./js/pages/tabel-progress.js?v=f3ae0417',
  './js/pages/whatsapp.js?v=f3ae0417','./js/pages/super-admin.js?v=f3ae0417'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});