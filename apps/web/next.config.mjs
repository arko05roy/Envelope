/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: { typedRoutes: false },
  // Encrypt SDK ships raw .ts files — transpile through Next's pipeline.
  transpilePackages: ["@encrypt.xyz/pre-alpha-solana-client"],
  webpack: (cfg) => {
    // grpc-js uses optional native deps that don't exist on macOS arm64 builds.
    cfg.externals = cfg.externals ?? [];
    cfg.resolve.fallback = { ...cfg.resolve.fallback, fs: false };
    return cfg;
  },
};
export default config;
