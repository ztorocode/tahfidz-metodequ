const CACHE='metodequ-a41d7b05';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=a41d7b05','./assets/css/base.css?v=a41d7b05','./assets/css/layout.css?v=a41d7b05',
  './assets/css/components.css?v=a41d7b05','./assets/css/responsive.css?v=a41d7b05',
  './assets/images/icon.svg?v=a41d7b05',
  './js/app.js?v=a41d7b05','./js/router.js?v=a41d7b05','./js/store.js?v=a41d7b05',
  './js/data/dummy-data.js?v=a41d7b05','./js/components/app-shell.js?v=a41d7b05',
  './js/components/context-switcher.js?v=a41d7b05','./js/layouts/app-layout.js?v=a41d7b05',
  './js/utils/helpers.js?v=a41d7b05','./js/utils/progress-context.js?v=a41d7b05',
 './js/utils/progress-sync.js?v=a41d7b05','./js/utils/student-progress.js?v=a41d7b05',
 './js/utils/program-context.js?v=a41d7b05',
  './js/pages/login.js?v=a41d7b05','./js/pages/member-progress.js?v=a41d7b05','./js/pages/member-dashboard.js?v=a41d7b05','./js/pages/program.js?v=a41d7b05',
  './js/pages/activity.js?v=a41d7b05','./js/pages/submission.js?v=a41d7b05','./js/pages/murajaah.js?v=a41d7b05',
  './js/pages/notifications.js?v=a41d7b05','./js/pages/musyrif-dashboard.js?v=a41d7b05',
  './js/pages/review.js?v=a41d7b05','./js/pages/admin-dashboard.js?v=a41d7b05','./js/pages/halaqah.js?v=a41d7b05','./js/pages/santri-progress.js?v=a41d7b05','./js/pages/tabel-progress.js?v=a41d7b05',
  './js/pages/whatsapp.js?v=a41d7b05','./js/pages/super-admin.js?v=a41d7b05'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});