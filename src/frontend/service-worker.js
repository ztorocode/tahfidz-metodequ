const CACHE='metodequ-5003fb1c';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=5003fb1c','./assets/css/base.css?v=5003fb1c','./assets/css/layout.css?v=5003fb1c',
  './assets/css/components.css?v=5003fb1c','./assets/css/responsive.css?v=5003fb1c',
  './assets/images/icon.svg?v=5003fb1c',
  './js/app.js?v=5003fb1c','./js/router.js?v=5003fb1c','./js/store.js?v=5003fb1c',
  './js/data/dummy-data.js?v=5003fb1c','./js/components/app-shell.js?v=5003fb1c',
  './js/components/context-switcher.js?v=5003fb1c','./js/layouts/app-layout.js?v=5003fb1c',
  './js/utils/helpers.js?v=5003fb1c','./js/utils/progress-context.js?v=5003fb1c',
  './js/pages/login.js?v=5003fb1c','./js/pages/member-progress.js?v=5003fb1c','./js/pages/member-dashboard.js?v=5003fb1c','./js/pages/program.js?v=5003fb1c',
  './js/pages/activity.js?v=5003fb1c','./js/pages/submission.js?v=5003fb1c','./js/pages/murajaah.js?v=5003fb1c',
  './js/pages/notifications.js?v=5003fb1c','./js/pages/musyrif-dashboard.js?v=5003fb1c',
  './js/pages/review.js?v=5003fb1c','./js/pages/admin-dashboard.js?v=5003fb1c','./js/pages/halaqah.js?v=5003fb1c','./js/pages/santri-progress.js?v=5003fb1c','./js/pages/tabel-progress.js?v=5003fb1c',
  './js/pages/whatsapp.js?v=5003fb1c','./js/pages/super-admin.js?v=5003fb1c'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});