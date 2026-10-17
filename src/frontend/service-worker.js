const CACHE='metodequ-6f85b9bf';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=6f85b9bf','./assets/css/base.css?v=6f85b9bf','./assets/css/layout.css?v=6f85b9bf',
  './assets/css/components.css?v=6f85b9bf','./assets/css/responsive.css?v=6f85b9bf',
  './assets/images/icon.svg?v=6f85b9bf',
  './js/app.js?v=6f85b9bf','./js/router.js?v=6f85b9bf','./js/store.js?v=6f85b9bf',
  './js/data/dummy-data.js?v=6f85b9bf','./js/components/app-shell.js?v=6f85b9bf',
  './js/components/context-switcher.js?v=6f85b9bf','./js/layouts/app-layout.js?v=6f85b9bf',
  './js/utils/helpers.js?v=6f85b9bf','./js/utils/progress-context.js?v=6f85b9bf',
  './js/pages/login.js?v=6f85b9bf','./js/pages/member-progress.js?v=6f85b9bf','./js/pages/member-dashboard.js?v=6f85b9bf','./js/pages/program.js?v=6f85b9bf',
  './js/pages/activity.js?v=6f85b9bf','./js/pages/submission.js?v=6f85b9bf','./js/pages/murajaah.js?v=6f85b9bf',
  './js/pages/notifications.js?v=6f85b9bf','./js/pages/musyrif-dashboard.js?v=6f85b9bf',
  './js/pages/review.js?v=6f85b9bf','./js/pages/admin-dashboard.js?v=6f85b9bf','./js/pages/halaqah.js?v=6f85b9bf','./js/pages/santri-progress.js?v=6f85b9bf','./js/pages/tabel-progress.js?v=6f85b9bf',
  './js/pages/whatsapp.js?v=6f85b9bf','./js/pages/super-admin.js?v=6f85b9bf'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});