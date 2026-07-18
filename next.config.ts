import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Logo/image uploads run through Server Actions; the default cap is 1MB.
      // Storage allows images up to 5MB, so raise it with multipart headroom.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
