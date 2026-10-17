const CACHE='metodequ-af7f6bd3';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=af7f6bd3','./assets/css/base.css?v=af7f6bd3','./assets/css/layout.css?v=af7f6bd3',
  './assets/css/components.css?v=af7f6bd3','./assets/css/responsive.css?v=af7f6bd3',
  './assets/images/icon.svg?v=af7f6bd3',
  './js/app.js?v=af7f6bd3','./js/router.js?v=af7f6bd3','./js/store.js?v=af7f6bd3',
  './js/data/dummy-data.js?v=af7f6bd3','./js/components/app-shell.js?v=af7f6bd3',
  './js/components/context-switcher.js?v=af7f6bd3','./js/layouts/app-layout.js?v=af7f6bd3',
  './js/utils/helpers.js?v=af7f6bd3','./js/utils/progress-context.js?v=af7f6bd3',
  './js/pages/login.js?v=af7f6bd3','./js/pages/member-progress.js?v=af7f6bd3','./js/pages/member-dashboard.js?v=af7f6bd3','./js/pages/program.js?v=af7f6bd3',
  './js/pages/activity.js?v=af7f6bd3','./js/pages/submission.js?v=af7f6bd3','./js/pages/murajaah.js?v=af7f6bd3',
  './js/pages/notifications.js?v=af7f6bd3','./js/pages/musyrif-dashboard.js?v=af7f6bd3',
  './js/pages/review.js?v=af7f6bd3','./js/pages/admin-dashboard.js?v=af7f6bd3','./js/pages/halaqah.js?v=af7f6bd3','./js/pages/santri-progress.js?v=af7f6bd3','./js/pages/tabel-progress.js?v=af7f6bd3',
  './js/pages/whatsapp.js?v=af7f6bd3','./js/pages/super-admin.js?v=af7f6bd3'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});