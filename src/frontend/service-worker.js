const CACHE='metodequ-a69611fb';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=a69611fb','./assets/css/base.css?v=a69611fb','./assets/css/layout.css?v=a69611fb',
  './assets/css/components.css?v=a69611fb','./assets/css/responsive.css?v=a69611fb',
  './assets/images/icon.svg?v=a69611fb',
  './js/app.js?v=a69611fb','./js/router.js?v=a69611fb','./js/store.js?v=a69611fb',
  './js/data/dummy-data.js?v=a69611fb','./js/components/app-shell.js?v=a69611fb',
  './js/components/context-switcher.js?v=a69611fb','./js/layouts/app-layout.js?v=a69611fb',
  './js/utils/helpers.js?v=a69611fb','./js/utils/progress-context.js?v=a69611fb',
  './js/pages/login.js?v=a69611fb','./js/pages/member-progress.js?v=a69611fb','./js/pages/member-dashboard.js?v=a69611fb','./js/pages/program.js?v=a69611fb',
  './js/pages/activity.js?v=a69611fb','./js/pages/submission.js?v=a69611fb','./js/pages/murajaah.js?v=a69611fb',
  './js/pages/notifications.js?v=a69611fb','./js/pages/musyrif-dashboard.js?v=a69611fb',
  './js/pages/review.js?v=a69611fb','./js/pages/admin-dashboard.js?v=a69611fb','./js/pages/halaqah.js?v=a69611fb','./js/pages/santri-progress.js?v=a69611fb','./js/pages/tabel-progress.js?v=a69611fb',
  './js/pages/whatsapp.js?v=a69611fb','./js/pages/super-admin.js?v=a69611fb'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});