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
  async fetch(request) {
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

    // Manual, so a redirect from the app can't strand visitors on the origin.
    const response = await fetch(originRequest, { redirect: "manual" });

    const location = response.headers.get("Location");
    if (!location) return response;

    const rewritten = new Response(response.body, response);
    rewritten.headers.set("Location", location.split(ORIGIN).join(PUBLIC));
    return rewritten;
  },
};
