const CACHE='metodequ-0e6404ce';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=0e6404ce','./assets/css/base.css?v=0e6404ce','./assets/css/layout.css?v=0e6404ce',
  './assets/css/components.css?v=0e6404ce','./assets/css/responsive.css?v=0e6404ce',
  './assets/images/icon.svg?v=0e6404ce',
  './js/app.js?v=0e6404ce','./js/router.js?v=0e6404ce','./js/store.js?v=0e6404ce',
  './js/data/dummy-data.js?v=0e6404ce','./js/components/app-shell.js?v=0e6404ce',
  './js/components/context-switcher.js?v=0e6404ce','./js/layouts/app-layout.js?v=0e6404ce',
  './js/utils/helpers.js?v=0e6404ce','./js/utils/progress-context.js?v=0e6404ce',
  './js/pages/login.js?v=0e6404ce','./js/pages/member-progress.js?v=0e6404ce','./js/pages/member-dashboard.js?v=0e6404ce','./js/pages/program.js?v=0e6404ce',
  './js/pages/activity.js?v=0e6404ce','./js/pages/submission.js?v=0e6404ce','./js/pages/murajaah.js?v=0e6404ce',
  './js/pages/notifications.js?v=0e6404ce','./js/pages/musyrif-dashboard.js?v=0e6404ce',
  './js/pages/review.js?v=0e6404ce','./js/pages/admin-dashboard.js?v=0e6404ce','./js/pages/halaqah.js?v=0e6404ce','./js/pages/santri-progress.js?v=0e6404ce','./js/pages/tabel-progress.js?v=0e6404ce',
  './js/pages/whatsapp.js?v=0e6404ce','./js/pages/super-admin.js?v=0e6404ce'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});