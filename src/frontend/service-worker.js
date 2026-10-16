const CACHE='metodequ-589a06fb';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=589a06fb','./assets/css/base.css?v=589a06fb','./assets/css/layout.css?v=589a06fb',
  './assets/css/components.css?v=589a06fb','./assets/css/responsive.css?v=589a06fb',
  './assets/images/icon.svg?v=589a06fb',
  './js/app.js?v=589a06fb','./js/router.js?v=589a06fb','./js/store.js?v=589a06fb',
  './js/data/dummy-data.js?v=589a06fb','./js/components/app-shell.js?v=589a06fb',
  './js/components/context-switcher.js?v=589a06fb','./js/layouts/app-layout.js?v=589a06fb',
  './js/utils/helpers.js?v=589a06fb','./js/utils/progress-context.js?v=589a06fb',
  './js/pages/login.js?v=589a06fb','./js/pages/member-progress.js?v=589a06fb','./js/pages/member-dashboard.js?v=589a06fb','./js/pages/program.js?v=589a06fb',
  './js/pages/activity.js?v=589a06fb','./js/pages/submission.js?v=589a06fb','./js/pages/murajaah.js?v=589a06fb',
  './js/pages/notifications.js?v=589a06fb','./js/pages/musyrif-dashboard.js?v=589a06fb',
  './js/pages/review.js?v=589a06fb','./js/pages/admin-dashboard.js?v=589a06fb','./js/pages/halaqah.js?v=589a06fb','./js/pages/santri-progress.js?v=589a06fb','./js/pages/tabel-progress.js?v=589a06fb',
  './js/pages/whatsapp.js?v=589a06fb','./js/pages/super-admin.js?v=589a06fb'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});