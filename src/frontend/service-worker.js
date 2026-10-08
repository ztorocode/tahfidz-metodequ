const CACHE='metodequ-prototype-dev-4c8e1a72';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=dev-2f08f073','./assets/css/base.css?v=dev-2f08f073','./assets/css/layout.css?v=dev-2f08f073',
  './assets/css/components.css?v=dev-43a8d2c1','./assets/css/responsive.css?v=dev-14f0c9a2',
  './assets/images/icon.svg?v=7f3a91c2',
  './js/app.js?v=dev-4c8e1a72','./js/router.js?v=dev-4c8e1a72','./js/store.js?v=dev-b3f742d1',
  './js/data/dummy-data.js?v=dev-2f08f073','./js/components/app-shell.js?v=dev-b3f742d1',
  './js/components/context-switcher.js?v=dev-b3f742d1','./js/layouts/app-layout.js?v=dev-b3f742d1',
  './js/utils/helpers.js?v=dev-2f08f073','./js/utils/progress-context.js?v=dev-b3f742d1',
  './js/pages/login.js?v=dev-b3f742d1','./js/pages/member-progress.js?v=dev-b3f742d1','./js/pages/member-dashboard.js?v=dev-4c8e1a72','./js/pages/program.js?v=dev-2f08f073',
  './js/pages/activity.js?v=dev-2f08f073','./js/pages/submission.js?v=dev-2f08f073','./js/pages/murajaah.js?v=dev-2f08f073',
  './js/pages/notifications.js?v=dev-2f08f073','./js/pages/musyrif-dashboard.js?v=dev-b3f742d1',
  './js/pages/review.js?v=dev-2f08f073','./js/pages/admin-dashboard.js?v=dev-2f08f073','./js/pages/halaqah.js?v=dev-b3f742d1','./js/pages/santri-progress.js?v=dev-b3f742d1','./js/pages/tabel-progress.js?v=dev-b3f742d1',
  './js/pages/whatsapp.js?v=dev-2f08f073'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});