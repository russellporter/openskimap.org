const BUILD_ID = "__BUILD_ID__";
const PRECACHE_URLS = __PRECACHE_URLS__;
const APP_CACHE_PREFIX = "openskimap-app-";
const APP_CACHE = `${APP_CACHE_PREFIX}${BUILD_ID}`;
const TILE_CACHE = "tiles-cache-v2";
const TILE_METADATA_CACHE = "tiles-cache-metadata-v1";
const TILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const TILE_MAX_ENTRIES = 50000;
const TILE_NETWORK_TIMEOUT_MS = 3000;
const TILE_ORIGINS = new Set([
  "https://tiles.openskimap.org",
  "https://tiles.openfreemap.org",
  "https://services.arcgisonline.com",
]);

let tileEntryCount;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                (cacheName.startsWith(APP_CACHE_PREFIX) &&
                  cacheName !== APP_CACHE) ||
                cacheName.startsWith("workbox-precache"),
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (TILE_ORIGINS.has(url.origin)) {
    event.respondWith(networkFirstTile(request, event));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached ?? fetch(request);
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match("/")) ?? Response.error();
  }
}

async function networkFirstTile(request, event) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TILE_NETWORK_TIMEOUT_MS);

  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.ok || response.type === "opaque") {
      event.waitUntil(storeTile(request, response.clone()));
    }
    return response;
  } catch {
    const cached = await getFreshTile(request);
    return cached ?? Response.error();
  } finally {
    clearTimeout(timeout);
  }
}

async function getFreshTile(request) {
  const tileCache = await caches.open(TILE_CACHE);
  const cached = await tileCache.match(request);
  if (!cached) return undefined;

  const metadataCache = await caches.open(TILE_METADATA_CACHE);
  const metadata = await metadataCache.match(request);
  if (!metadata) {
    await metadataCache.put(request, timestampResponse());
    return cached;
  }

  const cachedAt = Number(await metadata.text());
  if (Number.isFinite(cachedAt) && Date.now() - cachedAt <= TILE_MAX_AGE_MS) {
    return cached;
  }

  await Promise.all([tileCache.delete(request), metadataCache.delete(request)]);
  if (typeof tileEntryCount === "number") tileEntryCount -= 1;
  return undefined;
}

async function storeTile(request, response) {
  try {
    const [tileCache, metadataCache] = await Promise.all([
      caches.open(TILE_CACHE),
      caches.open(TILE_METADATA_CACHE),
    ]);
    const alreadyCached = Boolean(await tileCache.match(request));

    await Promise.all([
      tileCache.put(request, response),
      metadataCache
        .delete(request)
        .then(() => metadataCache.put(request, timestampResponse())),
    ]);

    if (!alreadyCached) {
      tileEntryCount =
        typeof tileEntryCount === "number"
          ? tileEntryCount + 1
          : (await tileCache.keys()).length;
      await enforceTileEntryLimit(tileCache, metadataCache);
    }
  } catch (error) {
    if (isQuotaError(error)) {
      await purgeOldestTiles(100);
      return;
    }
    console.warn("Unable to cache tile:", error);
  }
}

async function enforceTileEntryLimit(tileCache, metadataCache) {
  if (tileEntryCount <= TILE_MAX_ENTRIES) return;

  const excess = tileEntryCount - TILE_MAX_ENTRIES;
  const metadataKeys = await metadataCache.keys();
  const keysToDelete = metadataKeys.slice(0, excess);
  await Promise.all(
    keysToDelete.flatMap((key) => [
      tileCache.delete(key),
      metadataCache.delete(key),
    ]),
  );
  tileEntryCount -= keysToDelete.length;
}

async function purgeOldestTiles(count) {
  const [tileCache, metadataCache] = await Promise.all([
    caches.open(TILE_CACHE),
    caches.open(TILE_METADATA_CACHE),
  ]);
  const metadataKeys = await metadataCache.keys();
  const keysToDelete = metadataKeys.slice(0, count);
  await Promise.all(
    keysToDelete.flatMap((key) => [
      tileCache.delete(key),
      metadataCache.delete(key),
    ]),
  );
  tileEntryCount = Math.max(
    0,
    (tileEntryCount ?? TILE_MAX_ENTRIES) - keysToDelete.length,
  );
}

function timestampResponse() {
  return new Response(Date.now().toString(), {
    headers: { "content-type": "text/plain" },
  });
}

function isQuotaError(error) {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}
