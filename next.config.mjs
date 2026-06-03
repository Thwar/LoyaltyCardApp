/** @type {import('next').NextConfig} */
const nextConfig = {
  // We run our own type-checking in CI/locally; don't let lint block prototype builds.
  eslint: { ignoreDuringBuilds: true },
  // passkit-generator is a Node lib; don't let Next try to bundle it.
  serverExternalPackages: ["passkit-generator", "sharp"],
  // Ensure the pass images are available to the serverless functions at runtime.
  outputFileTracingIncludes: {
    "/api/wallet/apple/pass/[customerCardId]": ["./public/icon.png", "./public/logo.png"],
    "/api/wallet/apple/v1/passes/[passTypeIdentifier]/[serialNumber]": ["./public/icon.png", "./public/logo.png"],
  },
  // Canonical domain: send caseroapp.com traffic to soycasero.com (don't split SEO/shares).
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(www\\.)?caseroapp\\.com" }],
        destination: "https://www.soycasero.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
