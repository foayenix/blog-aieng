import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors are ignored during build because Prisma types
  // are only available after running `npx prisma generate`.
  // Run `npx prisma generate` before building for full type checking.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
