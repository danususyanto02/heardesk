import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  distDir: process.env.HEARDESK_BUILD_DIR ?? ".next",
  poweredByHeader: false,
  serverExternalPackages: ["pg", "sharp"],
};
export default config;
