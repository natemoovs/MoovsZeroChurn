import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Include factory directory in serverless function output
  outputFileTracingIncludes: {
    "/*": ["./factory/**/*"],
  },
  // External packages that should not be bundled (for Turbopack compatibility)
  serverExternalPackages: ["snowflake-sdk"],
}

export default nextConfig
