const CACHE='metodequ-91c5d7ea';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=91c5d7ea','./assets/css/base.css?v=91c5d7ea','./assets/css/layout.css?v=91c5d7ea',
  './assets/css/components.css?v=91c5d7ea','./assets/css/responsive.css?v=91c5d7ea',
  './assets/images/icon.svg?v=91c5d7ea',
  './js/app.js?v=91c5d7ea','./js/router.js?v=91c5d7ea','./js/store.js?v=91c5d7ea',
  './js/data/dummy-data.js?v=91c5d7ea','./js/components/app-shell.js?v=91c5d7ea',
  './js/components/context-switcher.js?v=91c5d7ea','./js/layouts/app-layout.js?v=91c5d7ea',
  './js/utils/helpers.js?v=91c5d7ea','./js/utils/progress-context.js?v=91c5d7ea',
 './js/utils/progress-sync.js?v=91c5d7ea','./js/utils/student-progress.js?v=91c5d7ea',
 './js/utils/program-context.js?v=91c5d7ea',
  './js/pages/login.js?v=91c5d7ea','./js/pages/member-progress.js?v=91c5d7ea','./js/pages/member-dashboard.js?v=91c5d7ea','./js/pages/program.js?v=91c5d7ea',
  './js/pages/activity.js?v=91c5d7ea','./js/pages/submission.js?v=91c5d7ea','./js/pages/murajaah.js?v=91c5d7ea',
  './js/pages/notifications.js?v=91c5d7ea','./js/pages/musyrif-dashboard.js?v=91c5d7ea',
  './js/pages/review.js?v=91c5d7ea','./js/pages/admin-dashboard.js?v=91c5d7ea','./js/pages/halaqah.js?v=91c5d7ea','./js/pages/santri-progress.js?v=91c5d7ea','./js/pages/tabel-progress.js?v=91c5d7ea',
  './js/pages/whatsapp.js?v=91c5d7ea','./js/pages/super-admin.js?v=91c5d7ea'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});