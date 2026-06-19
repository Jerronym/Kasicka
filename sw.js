// Kasička — service worker (PWA offline shell)
// POZOR: při každém deployi změň CACHE verzi (např. v2, v3 …), jinak prohlížeč
// servíruje starou cache se starým kódem. Bez bundleru není automatický hash.
const CACHE = 'kasicka-v1';

// App shell — předcache při instalaci. Cesty relativní ke scope (root).
const SHELL = [
  './kasicka.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/ui.js',
  './js/categories.js',
  './js/sharing.js',
  './js/transactions.js',
  './js/accounts.js',
  './js/investments.js',
  './js/import-broker.js',
  './js/budget.js',
  './js/goals.js',
  './js/dashboard.js',
  './js/storage.js',
  './js/auth.js',
  './icons/icon-180.png',
  './icons/icon.svg',
];

// Endpointy, které se NIKDY necachují (živá data / auth) — vždy ze sítě.
function isNetworkOnly(url){
  return /supabase\.co|frankfurter|twelvedata|stooq|coingecko|finance\.yahoo|cnb\.cz/i.test(url);
}

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method!=='GET') return; // POST/PUT (Supabase zápis) nech projít na síť

  const url = req.url;

  // Živá data a auth — network-only, necachovat. Offline prostě selže
  // a appka spadne do lokálního režimu (localStorage + pending sync).
  if(isNetworkOnly(url)){
    return; // necháme default síťové chování
  }

  // Navigace (HTML) — network-first s fallbackem na cachovaný shell,
  // aby šla appka otevřít i bez signálu.
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
        return resp;
      }).catch(()=>caches.match(req).then(r=>r||caches.match('./kasicka.html')))
    );
    return;
  }

  // App shell + CDN (Chart.js, supabase-js, xlsx) — cache-first,
  // se síťovým fallbackem a runtime cachováním (stale-while-revalidate styl).
  e.respondWith(
    caches.match(req).then(cached=>{
      const network = fetch(req).then(resp=>{
        if(resp && resp.status===200){
          const copy=resp.clone();
          caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
        }
        return resp;
      }).catch(()=>cached);
      return cached || network;
    })
  );
});
