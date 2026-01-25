import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Include factory directory in serverless function output
  outputFileTracingIncludes: {
    "/*": ["./factory/**/*"],
  },
}

export default nextConfig
