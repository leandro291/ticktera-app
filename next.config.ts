import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen Docker mínima para el deploy en AWS (ver Dockerfile).
  output: "standalone",
  images: {
    // Portadas de eventos subidas a Vercel Blob (store público).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
