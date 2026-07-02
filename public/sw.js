const CACHE = "rolecall-v2";
const OFFLINE_URL = "/offline.html";
const QUEUE_DB = "rolecall-sync";
const QUEUE_STORE = "outbox";

// ── IndexedDB outbox for offline writes ─────────────────────────────────────

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(QUEUE_STORE, {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueRequest(entry) {
  const db = await openQueueDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).add(entry);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function readQueue() {
  const db = await openQueueDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(QUEUE_STORE).objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeFromQueue(id) {
  const db = await openQueueDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function queueSize() {
  const db = await openQueueDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(QUEUE_STORE).objectStore(QUEUE_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) client.postMessage(message);
}

// Replay queued writes in order. Stops at the first network failure so
// ordering is preserved; server errors (4xx/5xx) drop the entry rather than
// blocking the rest of the queue forever.
let replaying = false;
async function replayQueue() {
  if (replaying) return;
  replaying = true;
  try {
    const entries = await readQueue();
    let synced = 0;
    for (const entry of entries) {
      try {
        const res = await fetch(entry.url, {
          method: entry.method,
          headers: entry.headers,
          body: entry.body || undefined,
          credentials: "include",
        });
        await removeFromQueue(entry.id);
        if (res.ok) synced++;
      } catch {
        break; // still offline — try again on the next online/sync event
      }
    }
    const pending = await queueSize();
    await broadcast({ type: "sync-status", pending, synced });
  } finally {
    replaying = false;
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("sync", (event) => {
  if (event.tag === "rolecall-sync") event.waitUntil(replayQueue());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "replay-queue") replayQueue();
  if (event.data?.type === "queue-size") {
    queueSize().then((pending) =>
      event.source?.postMessage({ type: "sync-status", pending, synced: 0 })
    );
  }
});

// ── Fetch strategies ─────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Offline writes: queue API mutations and confirm optimistically.
  if (request.method !== "GET") {
    if (!url.pathname.startsWith("/api/")) return;
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        const body = await request.clone().text();
        const headers = {};
        request.headers.forEach((v, k) => (headers[k] = v));
        await queueRequest({
          url: request.url,
          method: request.method,
          headers,
          body,
          queuedAt: Date.now(),
        });
        if ("sync" in self.registration) {
          try {
            await self.registration.sync.register("rolecall-sync");
          } catch {}
        }
        const pending = await queueSize();
        await broadcast({ type: "sync-status", pending, synced: 0 });
        // 200 so optimistic UI updates stick; body flags the queued state.
        return new Response(JSON.stringify({ queued: true, offline: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // Static build assets: cache-first (immutable, hashed filenames).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  // API reads: network-first, cached copy when offline.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(request);
          return (
            hit ||
            new Response(JSON.stringify({ error: "offline" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            })
          );
        })
    );
    return;
  }

  // Navigations: network-first, cached page, then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(request);
          return hit || caches.match(OFFLINE_URL);
        })
    );
  }
});
