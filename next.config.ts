import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: [
    "exceljs",
    "pdf-parse",
    "tesseract.js",
    "@napi-rs/canvas",
  ],
  poweredByHeader: false,
};
export default config;
