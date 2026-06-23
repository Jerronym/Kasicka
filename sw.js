// KILL-SWITCH service worker
// Aplikace uz PWA/service worker nepouziva. Drivejsi verze ale zaregistrovala
// "cache-first" worker, ktery v prohlizecich nadale servíroval starou
// nakesovanou verzi aplikace. Tento worker se pri aktivaci postara o uklid:
// smaze vsechny cache, sam sebe odregistruje a obnovi otevrene karty.
// Diky tomu se kazde zarizeni (vcetne mobilu) samo vyleci pri pristi navsteve.
// Soubor lze smazat, az budou vsechna zarizeni jednou nactena s touto verzi.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Smazat vsechny cache vytvorene starou verzi
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    // Odregistrovat sam sebe
    await self.registration.unregister();
    // Obnovit vsechny ovladane karty, aby nacetly cerstvou aplikaci ze site
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.navigate(client.url));
  })());
});

// Pro jistotu: behem zivota tohoto workeru nic nekesuj — vse pust na sit.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
