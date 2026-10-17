import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* This app reads cookies and the database throughout its pages; classic
     dynamic rendering is used instead of Cache Components. */
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
