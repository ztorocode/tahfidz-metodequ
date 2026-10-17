const CACHE='metodequ-4e246321';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=4e246321','./assets/css/base.css?v=4e246321','./assets/css/layout.css?v=4e246321',
  './assets/css/components.css?v=4e246321','./assets/css/responsive.css?v=4e246321',
  './assets/images/icon.svg?v=4e246321',
  './js/app.js?v=4e246321','./js/router.js?v=4e246321','./js/store.js?v=4e246321',
  './js/data/dummy-data.js?v=4e246321','./js/components/app-shell.js?v=4e246321',
  './js/components/context-switcher.js?v=4e246321','./js/layouts/app-layout.js?v=4e246321',
  './js/utils/helpers.js?v=4e246321','./js/utils/progress-context.js?v=4e246321',
  './js/pages/login.js?v=4e246321','./js/pages/member-progress.js?v=4e246321','./js/pages/member-dashboard.js?v=4e246321','./js/pages/program.js?v=4e246321',
  './js/pages/activity.js?v=4e246321','./js/pages/submission.js?v=4e246321','./js/pages/murajaah.js?v=4e246321',
  './js/pages/notifications.js?v=4e246321','./js/pages/musyrif-dashboard.js?v=4e246321',
  './js/pages/review.js?v=4e246321','./js/pages/admin-dashboard.js?v=4e246321','./js/pages/halaqah.js?v=4e246321','./js/pages/santri-progress.js?v=4e246321','./js/pages/tabel-progress.js?v=4e246321',
  './js/pages/whatsapp.js?v=4e246321','./js/pages/super-admin.js?v=4e246321'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});