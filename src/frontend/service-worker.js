const CACHE='metodequ-47e2e145';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=47e2e145','./assets/css/base.css?v=47e2e145','./assets/css/layout.css?v=47e2e145',
  './assets/css/components.css?v=47e2e145','./assets/css/responsive.css?v=47e2e145',
  './assets/images/icon.svg?v=47e2e145',
  './js/app.js?v=47e2e145','./js/router.js?v=47e2e145','./js/store.js?v=47e2e145',
  './js/data/dummy-data.js?v=47e2e145','./js/components/app-shell.js?v=47e2e145',
  './js/components/context-switcher.js?v=47e2e145','./js/layouts/app-layout.js?v=47e2e145',
  './js/utils/helpers.js?v=47e2e145','./js/utils/progress-context.js?v=47e2e145',
  './js/pages/login.js?v=47e2e145','./js/pages/member-progress.js?v=47e2e145','./js/pages/member-dashboard.js?v=47e2e145','./js/pages/program.js?v=47e2e145',
  './js/pages/activity.js?v=47e2e145','./js/pages/submission.js?v=47e2e145','./js/pages/murajaah.js?v=47e2e145',
  './js/pages/notifications.js?v=47e2e145','./js/pages/musyrif-dashboard.js?v=47e2e145',
  './js/pages/review.js?v=47e2e145','./js/pages/admin-dashboard.js?v=47e2e145','./js/pages/halaqah.js?v=47e2e145','./js/pages/santri-progress.js?v=47e2e145','./js/pages/tabel-progress.js?v=47e2e145',
  './js/pages/whatsapp.js?v=47e2e145','./js/pages/super-admin.js?v=47e2e145'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});