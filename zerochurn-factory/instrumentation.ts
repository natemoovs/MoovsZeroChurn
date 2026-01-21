// This file is loaded before any other module
// Configure Neon serverless driver to use HTTP instead of WebSocket
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { neonConfig } = await import("@neondatabase/serverless")

    // Use HTTP fetch instead of WebSocket for serverless compatibility
    neonConfig.poolQueryViaFetch = true
    neonConfig.fetchConnectionCache = true
  }
}
