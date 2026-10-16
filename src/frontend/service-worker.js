const CACHE='metodequ-24a0eced';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=24a0eced','./assets/css/base.css?v=24a0eced','./assets/css/layout.css?v=24a0eced',
  './assets/css/components.css?v=24a0eced','./assets/css/responsive.css?v=24a0eced',
  './assets/images/icon.svg?v=24a0eced',
  './js/app.js?v=24a0eced','./js/router.js?v=24a0eced','./js/store.js?v=24a0eced',
  './js/data/dummy-data.js?v=24a0eced','./js/components/app-shell.js?v=24a0eced',
  './js/components/context-switcher.js?v=24a0eced','./js/layouts/app-layout.js?v=24a0eced',
  './js/utils/helpers.js?v=24a0eced','./js/utils/progress-context.js?v=24a0eced',
  './js/pages/login.js?v=24a0eced','./js/pages/member-progress.js?v=24a0eced','./js/pages/member-dashboard.js?v=24a0eced','./js/pages/program.js?v=24a0eced',
  './js/pages/activity.js?v=24a0eced','./js/pages/submission.js?v=24a0eced','./js/pages/murajaah.js?v=24a0eced',
  './js/pages/notifications.js?v=24a0eced','./js/pages/musyrif-dashboard.js?v=24a0eced',
  './js/pages/review.js?v=24a0eced','./js/pages/admin-dashboard.js?v=24a0eced','./js/pages/halaqah.js?v=24a0eced','./js/pages/santri-progress.js?v=24a0eced','./js/pages/tabel-progress.js?v=24a0eced',
  './js/pages/whatsapp.js?v=24a0eced','./js/pages/super-admin.js?v=24a0eced'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});