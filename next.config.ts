import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Portadas de eventos subidas a Vercel Blob (store público).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
