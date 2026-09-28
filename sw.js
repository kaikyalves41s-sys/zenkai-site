// Service worker do ZENKAI — permite instalar o site como app e
// cacheia os arquivos estáticos (HTML/CSS/JS) para abrir mais rápido.
// Não intercepta chamadas ao Firebase: a lista de jogos e favoritos
// sempre vem da nuvem quando há conexão.

var CACHE_NAME = 'zenkai-cache-v5';
var ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { return cache.addAll(ASSETS_TO_CACHE); })
      .then(function() { return self.skipWaiting(); })
      .catch(function(e) { console.warn('SW install: falha ao cachear', e); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  // Nunca cachear chamadas ao Firebase/Google — precisam ser sempre atuais.
  if (req.url.indexOf('firestore.googleapis.com') !== -1 ||
      req.url.indexOf('googleapis.com') !== -1 ||
      req.url.indexOf('google.com') !== -1 ||
      req.url.indexOf('gstatic.com/firebasejs') !== -1) {
    return;
  }

  // Rede primeiro: sempre tenta pegar a versão mais nova do arquivo.
  // Só usa o cache quando estiver sem internet.
  event.respondWith(
    fetch(req).then(function(res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, resClone); });
      }
      return res;
    }).catch(function() {
      return caches.match(req);
    })
  );
});