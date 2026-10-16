const CACHE='metodequ-f83cd011';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=f83cd011','./assets/css/base.css?v=f83cd011','./assets/css/layout.css?v=f83cd011',
  './assets/css/components.css?v=f83cd011','./assets/css/responsive.css?v=f83cd011',
  './assets/images/icon.svg?v=f83cd011',
  './js/app.js?v=f83cd011','./js/router.js?v=f83cd011','./js/store.js?v=f83cd011',
  './js/data/dummy-data.js?v=f83cd011','./js/components/app-shell.js?v=f83cd011',
  './js/components/context-switcher.js?v=f83cd011','./js/layouts/app-layout.js?v=f83cd011',
  './js/utils/helpers.js?v=f83cd011','./js/utils/progress-context.js?v=f83cd011',
  './js/pages/login.js?v=f83cd011','./js/pages/member-progress.js?v=f83cd011','./js/pages/member-dashboard.js?v=f83cd011','./js/pages/program.js?v=f83cd011',
  './js/pages/activity.js?v=f83cd011','./js/pages/submission.js?v=f83cd011','./js/pages/murajaah.js?v=f83cd011',
  './js/pages/notifications.js?v=f83cd011','./js/pages/musyrif-dashboard.js?v=f83cd011',
  './js/pages/review.js?v=f83cd011','./js/pages/admin-dashboard.js?v=f83cd011','./js/pages/halaqah.js?v=f83cd011','./js/pages/santri-progress.js?v=f83cd011','./js/pages/tabel-progress.js?v=f83cd011',
  './js/pages/whatsapp.js?v=f83cd011','./js/pages/super-admin.js?v=f83cd011'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});