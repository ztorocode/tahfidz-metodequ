const CACHE='metodequ-fa7eb85d';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=fa7eb85d','./assets/css/base.css?v=fa7eb85d','./assets/css/layout.css?v=fa7eb85d',
  './assets/css/components.css?v=fa7eb85d','./assets/css/responsive.css?v=fa7eb85d',
  './assets/images/icon.svg?v=fa7eb85d',
  './js/app.js?v=fa7eb85d','./js/router.js?v=fa7eb85d','./js/store.js?v=fa7eb85d',
  './js/data/dummy-data.js?v=fa7eb85d','./js/components/app-shell.js?v=fa7eb85d',
  './js/components/context-switcher.js?v=fa7eb85d','./js/layouts/app-layout.js?v=fa7eb85d',
  './js/utils/helpers.js?v=fa7eb85d','./js/utils/progress-context.js?v=fa7eb85d',
  './js/pages/login.js?v=fa7eb85d','./js/pages/member-progress.js?v=fa7eb85d','./js/pages/member-dashboard.js?v=fa7eb85d','./js/pages/program.js?v=fa7eb85d',
  './js/pages/activity.js?v=fa7eb85d','./js/pages/submission.js?v=fa7eb85d','./js/pages/murajaah.js?v=fa7eb85d',
  './js/pages/notifications.js?v=fa7eb85d','./js/pages/musyrif-dashboard.js?v=fa7eb85d',
  './js/pages/review.js?v=fa7eb85d','./js/pages/admin-dashboard.js?v=fa7eb85d','./js/pages/halaqah.js?v=fa7eb85d','./js/pages/santri-progress.js?v=fa7eb85d','./js/pages/tabel-progress.js?v=fa7eb85d',
  './js/pages/whatsapp.js?v=fa7eb85d','./js/pages/super-admin.js?v=fa7eb85d'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});