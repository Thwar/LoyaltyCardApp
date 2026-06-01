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
};

export default nextConfig;
