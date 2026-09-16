import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Keep the development cache separate from production builds. Running
  // `next build` while the local preview is open must not invalidate the
  // preview's CSS and JavaScript chunks.
  //
  // Webpack and Turbopack must also not share a cache directory: their chunk
  // layouts differ, so switching between `npm run dev` and `npm run dev:turbo`
  // over the same folder makes the server load chunks the other bundler wrote
  // ("Cannot find module '../chunks/ssr/[turbopack]_runtime.js'"). `dev:turbo`
  // sets NEXT_DEV_DIR so each bundler keeps its own.
  distDir:
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_DEV_DIR || ".next-dev"
      : ".next",
};

export default nextConfig;
