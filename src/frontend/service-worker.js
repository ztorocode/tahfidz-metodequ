const CACHE='metodequ-b1b08be4';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=b1b08be4','./assets/css/base.css?v=b1b08be4','./assets/css/layout.css?v=b1b08be4',
  './assets/css/components.css?v=b1b08be4','./assets/css/responsive.css?v=b1b08be4',
  './assets/images/icon.svg?v=b1b08be4',
  './js/app.js?v=b1b08be4','./js/router.js?v=b1b08be4','./js/store.js?v=b1b08be4',
  './js/data/dummy-data.js?v=b1b08be4','./js/components/app-shell.js?v=b1b08be4',
  './js/components/context-switcher.js?v=b1b08be4','./js/layouts/app-layout.js?v=b1b08be4',
  './js/utils/helpers.js?v=b1b08be4','./js/utils/progress-context.js?v=b1b08be4',
  './js/pages/login.js?v=b1b08be4','./js/pages/member-progress.js?v=b1b08be4','./js/pages/member-dashboard.js?v=b1b08be4','./js/pages/program.js?v=b1b08be4',
  './js/pages/activity.js?v=b1b08be4','./js/pages/submission.js?v=b1b08be4','./js/pages/murajaah.js?v=b1b08be4',
  './js/pages/notifications.js?v=b1b08be4','./js/pages/musyrif-dashboard.js?v=b1b08be4',
  './js/pages/review.js?v=b1b08be4','./js/pages/admin-dashboard.js?v=b1b08be4','./js/pages/halaqah.js?v=b1b08be4','./js/pages/santri-progress.js?v=b1b08be4','./js/pages/tabel-progress.js?v=b1b08be4',
  './js/pages/whatsapp.js?v=b1b08be4','./js/pages/super-admin.js?v=b1b08be4'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});