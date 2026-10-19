const CACHE='metodequ-2d8fa471';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=2d8fa471','./assets/css/base.css?v=2d8fa471','./assets/css/layout.css?v=2d8fa471',
  './assets/css/components.css?v=2d8fa471','./assets/css/responsive.css?v=2d8fa471',
  './assets/images/icon.svg?v=2d8fa471',
  './js/app.js?v=2d8fa471','./js/router.js?v=2d8fa471','./js/store.js?v=2d8fa471',
  './js/data/dummy-data.js?v=2d8fa471','./js/components/app-shell.js?v=2d8fa471',
  './js/components/context-switcher.js?v=2d8fa471','./js/layouts/app-layout.js?v=2d8fa471',
  './js/utils/helpers.js?v=2d8fa471','./js/utils/progress-context.js?v=2d8fa471',
 './js/utils/progress-sync.js?v=2d8fa471','./js/utils/student-progress.js?v=2d8fa471',
 './js/utils/program-context.js?v=2d8fa471',
  './js/pages/login.js?v=2d8fa471','./js/pages/member-progress.js?v=2d8fa471','./js/pages/member-dashboard.js?v=2d8fa471','./js/pages/program.js?v=2d8fa471',
  './js/pages/activity.js?v=2d8fa471','./js/pages/submission.js?v=2d8fa471','./js/pages/murajaah.js?v=2d8fa471',
  './js/pages/notifications.js?v=2d8fa471','./js/pages/musyrif-dashboard.js?v=2d8fa471',
  './js/pages/review.js?v=2d8fa471','./js/pages/admin-dashboard.js?v=2d8fa471','./js/pages/halaqah.js?v=2d8fa471','./js/pages/santri-progress.js?v=2d8fa471','./js/pages/tabel-progress.js?v=2d8fa471',
  './js/pages/whatsapp.js?v=2d8fa471','./js/pages/super-admin.js?v=2d8fa471'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});