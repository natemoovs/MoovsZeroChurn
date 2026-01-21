// This file is loaded before any other module
// Configure Neon serverless driver to use HTTP instead of WebSocket
export async function register() {
  // Configure for both nodejs and edge runtimes
  try {
    const { neonConfig } = await import("@neondatabase/serverless")

    // Use HTTP fetch instead of WebSocket for serverless compatibility
    // This is crucial for Vercel serverless functions
    neonConfig.poolQueryViaFetch = true
    neonConfig.fetchConnectionCache = true

    console.log("[instrumentation] Neon configured for HTTP fetch mode")
  } catch (e) {
    // neonConfig not available in this runtime, that's OK
    console.log("[instrumentation] Skipping Neon config:", e)
  }
}
