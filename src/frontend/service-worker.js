const CACHE='metodequ-0ae8419e';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=0ae8419e','./assets/css/base.css?v=0ae8419e','./assets/css/layout.css?v=0ae8419e',
  './assets/css/components.css?v=0ae8419e','./assets/css/responsive.css?v=0ae8419e',
  './assets/images/icon.svg?v=0ae8419e',
  './js/app.js?v=0ae8419e','./js/router.js?v=0ae8419e','./js/store.js?v=0ae8419e',
  './js/data/dummy-data.js?v=0ae8419e','./js/components/app-shell.js?v=0ae8419e',
  './js/components/context-switcher.js?v=0ae8419e','./js/layouts/app-layout.js?v=0ae8419e',
  './js/utils/helpers.js?v=0ae8419e','./js/utils/progress-context.js?v=0ae8419e',
  './js/pages/login.js?v=0ae8419e','./js/pages/member-progress.js?v=0ae8419e','./js/pages/member-dashboard.js?v=0ae8419e','./js/pages/program.js?v=0ae8419e',
  './js/pages/activity.js?v=0ae8419e','./js/pages/submission.js?v=0ae8419e','./js/pages/murajaah.js?v=0ae8419e',
  './js/pages/notifications.js?v=0ae8419e','./js/pages/musyrif-dashboard.js?v=0ae8419e',
  './js/pages/review.js?v=0ae8419e','./js/pages/admin-dashboard.js?v=0ae8419e','./js/pages/halaqah.js?v=0ae8419e','./js/pages/santri-progress.js?v=0ae8419e','./js/pages/tabel-progress.js?v=0ae8419e',
  './js/pages/whatsapp.js?v=0ae8419e','./js/pages/super-admin.js?v=0ae8419e'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});