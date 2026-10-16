const CACHE='metodequ-58854a7a';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=58854a7a','./assets/css/base.css?v=58854a7a','./assets/css/layout.css?v=58854a7a',
  './assets/css/components.css?v=58854a7a','./assets/css/responsive.css?v=58854a7a',
  './assets/images/icon.svg?v=58854a7a',
  './js/app.js?v=58854a7a','./js/router.js?v=58854a7a','./js/store.js?v=58854a7a',
  './js/data/dummy-data.js?v=58854a7a','./js/components/app-shell.js?v=58854a7a',
  './js/components/context-switcher.js?v=58854a7a','./js/layouts/app-layout.js?v=58854a7a',
  './js/utils/helpers.js?v=58854a7a','./js/utils/progress-context.js?v=58854a7a',
  './js/pages/login.js?v=58854a7a','./js/pages/member-progress.js?v=58854a7a','./js/pages/member-dashboard.js?v=58854a7a','./js/pages/program.js?v=58854a7a',
  './js/pages/activity.js?v=58854a7a','./js/pages/submission.js?v=58854a7a','./js/pages/murajaah.js?v=58854a7a',
  './js/pages/notifications.js?v=58854a7a','./js/pages/musyrif-dashboard.js?v=58854a7a',
  './js/pages/review.js?v=58854a7a','./js/pages/admin-dashboard.js?v=58854a7a','./js/pages/halaqah.js?v=58854a7a','./js/pages/santri-progress.js?v=58854a7a','./js/pages/tabel-progress.js?v=58854a7a',
  './js/pages/whatsapp.js?v=58854a7a','./js/pages/super-admin.js?v=58854a7a'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});