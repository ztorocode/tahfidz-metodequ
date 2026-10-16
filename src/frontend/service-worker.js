const CACHE='metodequ-71fc254a';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=71fc254a','./assets/css/base.css?v=71fc254a','./assets/css/layout.css?v=71fc254a',
  './assets/css/components.css?v=71fc254a','./assets/css/responsive.css?v=71fc254a',
  './assets/images/icon.svg?v=71fc254a',
  './js/app.js?v=71fc254a','./js/router.js?v=71fc254a','./js/store.js?v=71fc254a',
  './js/data/dummy-data.js?v=71fc254a','./js/components/app-shell.js?v=71fc254a',
  './js/components/context-switcher.js?v=71fc254a','./js/layouts/app-layout.js?v=71fc254a',
  './js/utils/helpers.js?v=71fc254a','./js/utils/progress-context.js?v=71fc254a',
  './js/pages/login.js?v=71fc254a','./js/pages/member-progress.js?v=71fc254a','./js/pages/member-dashboard.js?v=71fc254a','./js/pages/program.js?v=71fc254a',
  './js/pages/activity.js?v=71fc254a','./js/pages/submission.js?v=71fc254a','./js/pages/murajaah.js?v=71fc254a',
  './js/pages/notifications.js?v=71fc254a','./js/pages/musyrif-dashboard.js?v=71fc254a',
  './js/pages/review.js?v=71fc254a','./js/pages/admin-dashboard.js?v=71fc254a','./js/pages/halaqah.js?v=71fc254a','./js/pages/santri-progress.js?v=71fc254a','./js/pages/tabel-progress.js?v=71fc254a',
  './js/pages/whatsapp.js?v=71fc254a','./js/pages/super-admin.js?v=71fc254a'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});