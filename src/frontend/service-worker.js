const CACHE='metodequ-e5f81c2a';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=e5f81c2a','./assets/css/base.css?v=e5f81c2a','./assets/css/layout.css?v=e5f81c2a',
  './assets/css/components.css?v=e5f81c2a','./assets/css/responsive.css?v=e5f81c2a',
  './assets/images/icon.svg?v=e5f81c2a',
  './js/app.js?v=e5f81c2a','./js/router.js?v=e5f81c2a','./js/store.js?v=e5f81c2a',
  './js/data/dummy-data.js?v=e5f81c2a','./js/components/app-shell.js?v=e5f81c2a',
  './js/components/context-switcher.js?v=e5f81c2a','./js/layouts/app-layout.js?v=e5f81c2a',
  './js/utils/helpers.js?v=e5f81c2a','./js/utils/progress-context.js?v=e5f81c2a',
 './js/utils/progress-sync.js?v=e5f81c2a','./js/utils/student-progress.js?v=e5f81c2a',
 './js/utils/program-context.js?v=e5f81c2a',
  './js/pages/login.js?v=e5f81c2a','./js/pages/member-progress.js?v=e5f81c2a','./js/pages/member-dashboard.js?v=e5f81c2a','./js/pages/program.js?v=e5f81c2a',
  './js/pages/activity.js?v=e5f81c2a','./js/pages/submission.js?v=e5f81c2a','./js/pages/murajaah.js?v=e5f81c2a',
  './js/pages/notifications.js?v=e5f81c2a','./js/pages/musyrif-dashboard.js?v=e5f81c2a',
  './js/pages/review.js?v=e5f81c2a','./js/pages/admin-dashboard.js?v=e5f81c2a','./js/pages/halaqah.js?v=e5f81c2a','./js/pages/santri-progress.js?v=e5f81c2a','./js/pages/tabel-progress.js?v=e5f81c2a',
  './js/pages/whatsapp.js?v=e5f81c2a','./js/pages/super-admin.js?v=e5f81c2a'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});