const CACHE='metodequ-0a85dd0d';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=0a85dd0d','./assets/css/base.css?v=0a85dd0d','./assets/css/layout.css?v=0a85dd0d',
  './assets/css/components.css?v=0a85dd0d','./assets/css/responsive.css?v=0a85dd0d',
  './assets/images/icon.svg?v=0a85dd0d',
  './js/app.js?v=0a85dd0d','./js/router.js?v=0a85dd0d','./js/store.js?v=0a85dd0d',
  './js/data/dummy-data.js?v=0a85dd0d','./js/components/app-shell.js?v=0a85dd0d',
  './js/components/context-switcher.js?v=0a85dd0d','./js/layouts/app-layout.js?v=0a85dd0d',
  './js/utils/helpers.js?v=0a85dd0d','./js/utils/progress-context.js?v=0a85dd0d',
  './js/pages/login.js?v=0a85dd0d','./js/pages/member-progress.js?v=0a85dd0d','./js/pages/member-dashboard.js?v=0a85dd0d','./js/pages/program.js?v=0a85dd0d',
  './js/pages/activity.js?v=0a85dd0d','./js/pages/submission.js?v=0a85dd0d','./js/pages/murajaah.js?v=0a85dd0d',
  './js/pages/notifications.js?v=0a85dd0d','./js/pages/musyrif-dashboard.js?v=0a85dd0d',
  './js/pages/review.js?v=0a85dd0d','./js/pages/admin-dashboard.js?v=0a85dd0d','./js/pages/halaqah.js?v=0a85dd0d','./js/pages/santri-progress.js?v=0a85dd0d','./js/pages/tabel-progress.js?v=0a85dd0d',
  './js/pages/whatsapp.js?v=0a85dd0d','./js/pages/super-admin.js?v=0a85dd0d'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});