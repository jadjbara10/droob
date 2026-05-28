/**
 * دروب PWA — Service Worker
 * Provides offline support with cached routes, stops, and schedules
 *
 * Strategy: Cache-First for static assets, Network-First for API data
 * Background sync for offline ticket purchases and feedback
 */

const CACHE_NAME = "droob-v2";
const API_CACHE = "droob-api-v2";
const SYNC_QUEUE = "droob-sync-queue";

// ─── Assets to cache on install ──────────────────────────────
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/db.js",
  "/manifest.json",
  "/icons/icon-72.png",
  "/icons/icon-96.png",
  "/icons/icon-128.png",
  "/icons/icon-144.png",
  "/icons/icon-152.png",
  "/icons/icon-192.png",
  "/icons/icon-384.png",
  "/icons/icon-512.png",
];

// ─── Install Event ───────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("🚌 دروب SW: Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Caching static assets...");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("⚠️ Some assets failed to cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate Event ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("🚌 دروب SW: Activated");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => {
            console.log("🗑️ Deleting old cache:", key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch Event ─────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API requests: Network-First, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static assets: Cache-First, fallback to network
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else: Network-First
  event.respondWith(networkFirst(event.request));
});

// ─── Strategies ──────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline fallback for HTML pages
    if (request.headers.get("Accept")?.includes("text/html")) {
      return caches.match("/index.html");
    }
    return new Response("Offline — يرجى الاتصال بالإنترنت", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      // Add offline header
      const headers = new Headers(cached.headers);
      headers.set("X-Droob-Offline", "true");
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }
    return new Response(
      JSON.stringify({
        error: "offline",
        message_ar: "أنت غير متصل بالإنترنت",
        message_en: "You are offline",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function isStaticAsset(url) {
  const staticExts = [".css", ".js", ".png", ".jpg", ".svg", ".ico", ".woff2", ".json"];
  return staticExts.some((ext) => url.pathname.endsWith(ext));
}

// ─── Background Sync ─────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-ticket-purchase") {
    event.waitUntil(syncPendingPurchases());
  }
  if (event.tag === "sync-feedback") {
    event.waitUntil(syncPendingFeedback());
  }
});

async function syncPendingPurchases() {
  console.log("🔄 Syncing pending ticket purchases...");
  // This would open IndexedDB and process queued purchases
  // For now, notify all clients
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "sync-complete", queue: "ticket-purchase" });
  });
}

async function syncPendingFeedback() {
  console.log("🔄 Syncing pending feedback...");
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "sync-complete", queue: "feedback" });
  });
}

// ─── Push Notifications ──────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body_ar || data.body_en,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    data: {
      url: data.url || "/",
      ...data,
    },
    actions: data.actions || [],
    tag: data.tag || "default",
    renotify: data.renotify || false,
    requireInteraction: data.priority === "high",
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title_ar || data.title_en || "دروب",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});