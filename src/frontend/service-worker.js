const CACHE='metodequ-91f0394e';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=91f0394e','./assets/css/base.css?v=91f0394e','./assets/css/layout.css?v=91f0394e',
  './assets/css/components.css?v=91f0394e','./assets/css/responsive.css?v=91f0394e',
  './assets/images/icon.svg?v=91f0394e',
  './js/app.js?v=91f0394e','./js/router.js?v=91f0394e','./js/store.js?v=91f0394e',
  './js/data/dummy-data.js?v=91f0394e','./js/components/app-shell.js?v=91f0394e',
  './js/components/context-switcher.js?v=91f0394e','./js/layouts/app-layout.js?v=91f0394e',
  './js/utils/helpers.js?v=91f0394e','./js/utils/progress-context.js?v=91f0394e',
  './js/pages/login.js?v=91f0394e','./js/pages/member-progress.js?v=91f0394e','./js/pages/member-dashboard.js?v=91f0394e','./js/pages/program.js?v=91f0394e',
  './js/pages/activity.js?v=91f0394e','./js/pages/submission.js?v=91f0394e','./js/pages/murajaah.js?v=91f0394e',
  './js/pages/notifications.js?v=91f0394e','./js/pages/musyrif-dashboard.js?v=91f0394e',
  './js/pages/review.js?v=91f0394e','./js/pages/admin-dashboard.js?v=91f0394e','./js/pages/halaqah.js?v=91f0394e','./js/pages/santri-progress.js?v=91f0394e','./js/pages/tabel-progress.js?v=91f0394e',
  './js/pages/whatsapp.js?v=91f0394e','./js/pages/super-admin.js?v=91f0394e'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});