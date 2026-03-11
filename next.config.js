/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    outputFileTracingIncludes: {
      "/api/**": [
        "./node_modules/.prisma/**/*",
        "./node_modules/@prisma/client/**/*",
      ],
    },
  },
};

module.exports = nextConfig;

