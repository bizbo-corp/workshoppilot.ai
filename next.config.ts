import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Worktree-fleet serves each branch via a vanity host (e.g. wt2.test.localhost).
  // Next.js 16 blocks cross-origin dev traffic (HMR/server actions) from hosts
  // that aren't whitelisted here, which surfaces as a server-error overlay and a
  // refresh loop. Wildcard covers every current and future worktree host.
  allowedDevOrigins: ['*.test.localhost'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
