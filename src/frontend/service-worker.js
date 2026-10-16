const CACHE='metodequ-a0c5dd17';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=a0c5dd17','./assets/css/base.css?v=a0c5dd17','./assets/css/layout.css?v=a0c5dd17',
  './assets/css/components.css?v=a0c5dd17','./assets/css/responsive.css?v=a0c5dd17',
  './assets/images/icon.svg?v=a0c5dd17',
  './js/app.js?v=a0c5dd17','./js/router.js?v=a0c5dd17','./js/store.js?v=a0c5dd17',
  './js/data/dummy-data.js?v=a0c5dd17','./js/components/app-shell.js?v=a0c5dd17',
  './js/components/context-switcher.js?v=a0c5dd17','./js/layouts/app-layout.js?v=a0c5dd17',
  './js/utils/helpers.js?v=a0c5dd17','./js/utils/progress-context.js?v=a0c5dd17',
  './js/pages/login.js?v=a0c5dd17','./js/pages/member-progress.js?v=a0c5dd17','./js/pages/member-dashboard.js?v=a0c5dd17','./js/pages/program.js?v=a0c5dd17',
  './js/pages/activity.js?v=a0c5dd17','./js/pages/submission.js?v=a0c5dd17','./js/pages/murajaah.js?v=a0c5dd17',
  './js/pages/notifications.js?v=a0c5dd17','./js/pages/musyrif-dashboard.js?v=a0c5dd17',
  './js/pages/review.js?v=a0c5dd17','./js/pages/admin-dashboard.js?v=a0c5dd17','./js/pages/halaqah.js?v=a0c5dd17','./js/pages/santri-progress.js?v=a0c5dd17','./js/pages/tabel-progress.js?v=a0c5dd17',
  './js/pages/whatsapp.js?v=a0c5dd17','./js/pages/super-admin.js?v=a0c5dd17'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});