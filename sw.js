/* DÉRIVE — service worker : rend le jeu installable sur Android et jouable hors connexion.
   Stratégie : tout le jeu est mis en cache à l'installation ; ensuite cache d'abord, réseau en secours.
   À CHAQUE NOUVELLE VERSION DU JEU, changez le numéro ci-dessous : les téléphones téléchargeront la mise à jour. */
const CACHE = 'derive-v1.2.1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/fonts.css', 'css/style.css',
  'js/config.js', 'js/rng.js', 'js/i18n.js',
  'js/lang/en.js', 'js/lang/fr.js', 'js/lang/zh.js', 'js/lang/ru.js', 'js/lang/es.js', 'js/lang/pt.js', 'js/lang/de.js',
  'js/audio.js', 'js/gfx.js', 'js/data.js', 'js/stats.js', 'js/game.js', 'js/ui.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'
];

self.addEventListener('install', function (e) {
  // Fichier par fichier : un fichier manquant ne doit pas empêcher l'installation hors connexion des autres.
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () { return null; }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
        return res;
      });
    })
  );
});
