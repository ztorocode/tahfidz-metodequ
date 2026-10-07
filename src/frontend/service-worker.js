const CACHE='metodequ-prototype-v1';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './assets/css/variables.css','./assets/css/base.css','./assets/css/layout.css',
  './assets/css/components.css','./assets/css/responsive.css',
  './assets/images/icon.svg',
  './js/app.js','./js/router.js','./js/store.js',
  './js/data/dummy-data.js','./js/components/app-shell.js',
  './js/components/context-switcher.js','./js/layouts/app-layout.js',
  './js/utils/helpers.js',
  './js/pages/login.js','./js/pages/member-dashboard.js','./js/pages/program.js',
  './js/pages/activity.js','./js/pages/submission.js','./js/pages/murajaah.js',
  './js/pages/notifications.js','./js/pages/musyrif-dashboard.js',
  './js/pages/review.js','./js/pages/admin-dashboard.js','./js/pages/halaqah.js',
  './js/pages/whatsapp.js'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});