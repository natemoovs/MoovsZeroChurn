import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include factory directory in serverless function output
  outputFileTracingIncludes: {
    '/*': ['./factory/**/*'],
  },
  // Enable instrumentation hook for neonConfig setup
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
