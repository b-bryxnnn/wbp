/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  swcMinify: true,
  compress: true,
  transpilePackages: ["lucide-react"],
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{ kebabCase member }}",
    },
  },
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
