const CACHE='metodequ-a2664119';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=a2664119','./assets/css/base.css?v=a2664119','./assets/css/layout.css?v=a2664119',
  './assets/css/components.css?v=a2664119','./assets/css/responsive.css?v=a2664119',
  './assets/images/icon.svg?v=a2664119',
  './js/app.js?v=a2664119','./js/router.js?v=a2664119','./js/store.js?v=a2664119',
  './js/data/dummy-data.js?v=a2664119','./js/components/app-shell.js?v=a2664119',
  './js/components/context-switcher.js?v=a2664119','./js/layouts/app-layout.js?v=a2664119',
  './js/utils/helpers.js?v=a2664119','./js/utils/progress-context.js?v=a2664119',
  './js/pages/login.js?v=a2664119','./js/pages/member-progress.js?v=a2664119','./js/pages/member-dashboard.js?v=a2664119','./js/pages/program.js?v=a2664119',
  './js/pages/activity.js?v=a2664119','./js/pages/submission.js?v=a2664119','./js/pages/murajaah.js?v=a2664119',
  './js/pages/notifications.js?v=a2664119','./js/pages/musyrif-dashboard.js?v=a2664119',
  './js/pages/review.js?v=a2664119','./js/pages/admin-dashboard.js?v=a2664119','./js/pages/halaqah.js?v=a2664119','./js/pages/santri-progress.js?v=a2664119','./js/pages/tabel-progress.js?v=a2664119',
  './js/pages/whatsapp.js?v=a2664119','./js/pages/super-admin.js?v=a2664119'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});