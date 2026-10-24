const CACHE='metodequ-a83f2c51';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=a83f2c51','./assets/css/base.css?v=a83f2c51','./assets/css/layout.css?v=a83f2c51',
  './assets/css/components.css?v=a83f2c51','./assets/css/responsive.css?v=a83f2c51',
  './assets/images/icon.svg?v=a83f2c51',
  './js/app.js?v=a83f2c51','./js/router.js?v=a83f2c51','./js/store.js?v=a83f2c51',
  './js/data/dummy-data.js?v=a83f2c51','./js/components/app-shell.js?v=a83f2c51',
  './js/components/context-switcher.js?v=a83f2c51','./js/layouts/app-layout.js?v=a83f2c51',
  './js/utils/helpers.js?v=a83f2c51','./js/utils/progress-context.js?v=a83f2c51',
 './js/utils/progress-sync.js?v=a83f2c51','./js/utils/student-progress.js?v=a83f2c51',
 './js/utils/setoran.js?v=a83f2c51',
 './js/utils/program-context.js?v=a83f2c51',
  './js/pages/login.js?v=a83f2c51','./js/pages/member-progress.js?v=a83f2c51','./js/pages/member-dashboard.js?v=a83f2c51','./js/pages/program.js?v=a83f2c51',
  './js/pages/activity.js?v=a83f2c51','./js/pages/submission.js?v=a83f2c51','./js/pages/murajaah.js?v=a83f2c51',
  './js/pages/notifications.js?v=a83f2c51','./js/pages/musyrif-dashboard.js?v=a83f2c51',
  './js/pages/review.js?v=a83f2c51','./js/pages/admin-dashboard.js?v=a83f2c51','./js/pages/halaqah.js?v=a83f2c51','./js/pages/santri-progress.js?v=a83f2c51','./js/pages/tabel-progress.js?v=a83f2c51',
  './js/pages/whatsapp.js?v=a83f2c51','./js/pages/super-admin.js?v=a83f2c51'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});