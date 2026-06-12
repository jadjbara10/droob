// droob-api-proxy: Cloudflare Worker that proxies api.droob-jo.com -> droob-api.fly.dev
// This ensures the API works 24/7 without needing a local machine running
// Includes rate limiting: max 100 requests per minute per IP

const UPSTREAM = "https://droob-api.fly.dev";
const RATE_LIMIT_MAX = 100;    // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

// ──── In-Memory Rate Limiter ──────────────────────────────────────────────
// WARNING: Resets on each worker cold-start. For persistent limits, use KV.
const rateStore = new Map(); // IP → { count: number, resetAt: number }

function isRateLimited(clientIP) {
  const now = Date.now();
  let entry = rateStore.get(clientIP);

  if (!entry || now > entry.resetAt) {
    // Start a new window
    entry = { count: 1, resetAt: now + RATE_WINDOW_MS };
    rateStore.set(clientIP, entry);
    return { limited: false };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return {
      limited: true,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { limited: false };
}

// Lazy garbage collection: clean expired entries when the map gets too large
function lazyGC() {
  if (rateStore.size > 5000) {
    const now = Date.now();
    for (const [ip, entry] of rateStore) {
      if (now > entry.resetAt) rateStore.delete(ip);
    }
  }
}

// ──── Main Handler ────────────────────────────────────────────────────────

export default {
  async fetch(request) {
    // ── Rate Limit Check ──
    lazyGC();
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const { limited, retryAfter } = isRateLimited(clientIP);

    if (limited) {
      return new Response(JSON.stringify({
        error: "RateLimitExceeded",
        message: "طلبات كثيرة جداً. حاول مرة أخرى بعد دقيقة.",
        message_en: "Too many requests. Please try again in one minute.",
        retryAfter,
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Retry-After": String(retryAfter),
        },
      });
    }

    const url = new URL(request.url);
    const upstreamURL = UPSTREAM + url.pathname + url.search;

    // Clone the request with the upstream URL
    const upstreamRequest = new Request(upstreamURL, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "follow",
    });

    // Remove host header to avoid conflicts
    const headers = new Headers(upstreamRequest.headers);
    headers.delete("host");
    headers.set("Host", "droob-api.fly.dev");

    try {
      const response = await fetch(upstreamURL, {
        method: request.method,
        headers: headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        redirect: "follow",
      });

      // Clone response and add CORS headers
      // Restrict to known Droob domains only — no wildcard
      const ALLOWED_ORIGINS = [
        "https://droob-jo.com",
        "https://admin.droob-jo.com",
        "https://app.droob-jo.com",
      ];
      const origin = request.headers.get("Origin") || "";
      const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
      newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      newHeaders.set("Access-Control-Allow-Credentials", "true");
      newHeaders.set("Access-Control-Max-Age", "86400");

      // Handle preflight requests
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: newHeaders,
        });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({
        error: "ProxyError",
        message: "تعذر الوصول لخادم دروب. حاول مرة أخرى.",
        message_en: "Could not reach Droob API server. Please try again.",
      }), {
        status: 502,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  },
};
