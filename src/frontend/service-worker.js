const CACHE='metodequ-43bcc1b9';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=43bcc1b9','./assets/css/base.css?v=43bcc1b9','./assets/css/layout.css?v=43bcc1b9',
  './assets/css/components.css?v=43bcc1b9','./assets/css/responsive.css?v=43bcc1b9',
  './assets/images/icon.svg?v=43bcc1b9',
  './js/app.js?v=43bcc1b9','./js/router.js?v=43bcc1b9','./js/store.js?v=43bcc1b9',
  './js/data/dummy-data.js?v=43bcc1b9','./js/components/app-shell.js?v=43bcc1b9',
  './js/components/context-switcher.js?v=43bcc1b9','./js/layouts/app-layout.js?v=43bcc1b9',
  './js/utils/helpers.js?v=43bcc1b9','./js/utils/progress-context.js?v=43bcc1b9',
  './js/pages/login.js?v=43bcc1b9','./js/pages/member-progress.js?v=43bcc1b9','./js/pages/member-dashboard.js?v=43bcc1b9','./js/pages/program.js?v=43bcc1b9',
  './js/pages/activity.js?v=43bcc1b9','./js/pages/submission.js?v=43bcc1b9','./js/pages/murajaah.js?v=43bcc1b9',
  './js/pages/notifications.js?v=43bcc1b9','./js/pages/musyrif-dashboard.js?v=43bcc1b9',
  './js/pages/review.js?v=43bcc1b9','./js/pages/admin-dashboard.js?v=43bcc1b9','./js/pages/halaqah.js?v=43bcc1b9','./js/pages/santri-progress.js?v=43bcc1b9','./js/pages/tabel-progress.js?v=43bcc1b9',
  './js/pages/whatsapp.js?v=43bcc1b9','./js/pages/super-admin.js?v=43bcc1b9'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});