/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  compress: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ["lucide-react"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
    outputFileTracingIncludes: {
      "/api/**": [
        "./node_modules/.prisma/**/*",
        "./node_modules/@prisma/client/**/*",
      ],
    },
  },
};

module.exports = nextConfig;
