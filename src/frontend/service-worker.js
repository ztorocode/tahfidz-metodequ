const CACHE='metodequ-0fd13399';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css?v=0fd13399','./assets/css/base.css?v=0fd13399','./assets/css/layout.css?v=0fd13399',
  './assets/css/components.css?v=0fd13399','./assets/css/responsive.css?v=0fd13399',
  './assets/images/icon.svg?v=0fd13399',
  './js/app.js?v=0fd13399','./js/router.js?v=0fd13399','./js/store.js?v=0fd13399',
  './js/data/dummy-data.js?v=0fd13399','./js/components/app-shell.js?v=0fd13399',
  './js/components/context-switcher.js?v=0fd13399','./js/layouts/app-layout.js?v=0fd13399',
  './js/utils/helpers.js?v=0fd13399','./js/utils/progress-context.js?v=0fd13399',
  './js/pages/login.js?v=0fd13399','./js/pages/member-progress.js?v=0fd13399','./js/pages/member-dashboard.js?v=0fd13399','./js/pages/program.js?v=0fd13399',
  './js/pages/activity.js?v=0fd13399','./js/pages/submission.js?v=0fd13399','./js/pages/murajaah.js?v=0fd13399',
  './js/pages/notifications.js?v=0fd13399','./js/pages/musyrif-dashboard.js?v=0fd13399',
  './js/pages/review.js?v=0fd13399','./js/pages/admin-dashboard.js?v=0fd13399','./js/pages/halaqah.js?v=0fd13399','./js/pages/santri-progress.js?v=0fd13399','./js/pages/tabel-progress.js?v=0fd13399',
  './js/pages/whatsapp.js?v=0fd13399','./js/pages/super-admin.js?v=0fd13399'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});