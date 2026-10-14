const CACHE='metodequ-e22d4bc0';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=e22d4bc0','./assets/css/base.css?v=e22d4bc0','./assets/css/layout.css?v=e22d4bc0',
  './assets/css/components.css?v=e22d4bc0','./assets/css/responsive.css?v=e22d4bc0',
  './assets/images/icon.svg?v=e22d4bc0',
  './js/app.js?v=e22d4bc0','./js/router.js?v=e22d4bc0','./js/store.js?v=e22d4bc0',
  './js/data/dummy-data.js?v=e22d4bc0','./js/components/app-shell.js?v=e22d4bc0',
  './js/components/context-switcher.js?v=e22d4bc0','./js/layouts/app-layout.js?v=e22d4bc0',
  './js/utils/helpers.js?v=e22d4bc0','./js/utils/progress-context.js?v=e22d4bc0',
  './js/pages/login.js?v=e22d4bc0','./js/pages/member-progress.js?v=e22d4bc0','./js/pages/member-dashboard.js?v=e22d4bc0','./js/pages/program.js?v=e22d4bc0',
  './js/pages/activity.js?v=e22d4bc0','./js/pages/submission.js?v=e22d4bc0','./js/pages/murajaah.js?v=e22d4bc0',
  './js/pages/notifications.js?v=e22d4bc0','./js/pages/musyrif-dashboard.js?v=e22d4bc0',
  './js/pages/review.js?v=e22d4bc0','./js/pages/admin-dashboard.js?v=e22d4bc0','./js/pages/halaqah.js?v=e22d4bc0','./js/pages/santri-progress.js?v=e22d4bc0','./js/pages/tabel-progress.js?v=e22d4bc0',
  './js/pages/whatsapp.js?v=e22d4bc0','./js/pages/super-admin.js?v=e22d4bc0'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});