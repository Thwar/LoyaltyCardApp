// Serves soycasero.com from Cloudflare. Vercel's edge keeps dropping the
// certificate binding for this domain's SNI, so Cloudflare terminates TLS with
// its own cert and we fetch from the project's *.vercel.app hostname, which has
// a stable certificate and always tracks the latest production deployment.
//
// Route this Worker at:  www.soycasero.com/*  and  soycasero.com/*
// Requires those DNS records to be PROXIED (orange cloud) or routes never fire.
//
// The origin is deliberately NOT caseroapp.com: that domain is being retired,
// and next.config.mjs redirects it back here, which would loop.

const ORIGIN = "caseroapp.vercel.app";
const PUBLIC = "www.soycasero.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Keep the apex behaving as it did on Vercel.
    if (url.hostname !== PUBLIC) {
      url.hostname = PUBLIC;
      return Response.redirect(url.toString(), 308);
    }

    const originUrl = new URL(url.pathname + url.search, `https://${ORIGIN}`);
    const originRequest = new Request(originUrl, request);
    originRequest.headers.set("X-Forwarded-Host", PUBLIC);
    originRequest.headers.set("X-Forwarded-Proto", "https");

    // Vercel overwrites X-Forwarded-For with whoever connected to it — this Worker,
    // i.e. a Cloudflare address — so every visitor looked like the same few IPs to
    // the app's per-IP rate limits. Pass the visitor's IP separately, vouched for by
    // a secret only this Worker and the app hold (the origin is publicly reachable,
    // so the IP header alone would be spoofable). Always strip client-sent copies.
    // Secret: `wrangler secret put PROXY_SHARED_SECRET` (same value in Vercel).
    originRequest.headers.delete("X-SoyCasero-Client-IP");
    originRequest.headers.delete("X-SoyCasero-Proxy-Secret");
    const visitorIp = request.headers.get("CF-Connecting-IP");
    if (env.PROXY_SHARED_SECRET && visitorIp) {
      originRequest.headers.set("X-SoyCasero-Client-IP", visitorIp);
      originRequest.headers.set("X-SoyCasero-Proxy-Secret", env.PROXY_SHARED_SECRET);
    }

    // Manual, so a redirect from the app can't strand visitors on the origin.
    const response = await fetch(originRequest, { redirect: "manual" });

    const location = response.headers.get("Location");
    if (!location) return response;

    const rewritten = new Response(response.body, response);
    rewritten.headers.set("Location", location.split(ORIGIN).join(PUBLIC));
    return rewritten;
  },
};
