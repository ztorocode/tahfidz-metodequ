const CACHE='metodequ-e456ddf9';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=e456ddf9','./assets/css/base.css?v=e456ddf9','./assets/css/layout.css?v=e456ddf9',
  './assets/css/components.css?v=e456ddf9','./assets/css/responsive.css?v=e456ddf9',
  './assets/images/icon.svg?v=e456ddf9',
  './js/app.js?v=e456ddf9','./js/router.js?v=e456ddf9','./js/store.js?v=e456ddf9',
  './js/data/dummy-data.js?v=e456ddf9','./js/components/app-shell.js?v=e456ddf9',
  './js/components/context-switcher.js?v=e456ddf9','./js/layouts/app-layout.js?v=e456ddf9',
  './js/utils/helpers.js?v=e456ddf9','./js/utils/progress-context.js?v=e456ddf9',
  './js/pages/login.js?v=e456ddf9','./js/pages/member-progress.js?v=e456ddf9','./js/pages/member-dashboard.js?v=e456ddf9','./js/pages/program.js?v=e456ddf9',
  './js/pages/activity.js?v=e456ddf9','./js/pages/submission.js?v=e456ddf9','./js/pages/murajaah.js?v=e456ddf9',
  './js/pages/notifications.js?v=e456ddf9','./js/pages/musyrif-dashboard.js?v=e456ddf9',
  './js/pages/review.js?v=e456ddf9','./js/pages/admin-dashboard.js?v=e456ddf9','./js/pages/halaqah.js?v=e456ddf9','./js/pages/santri-progress.js?v=e456ddf9','./js/pages/tabel-progress.js?v=e456ddf9',
  './js/pages/whatsapp.js?v=e456ddf9','./js/pages/super-admin.js?v=e456ddf9'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});