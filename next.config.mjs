/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@xenova/transformers', 'pica']
  }
};

export default nextConfig;
