import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@prisma/client"

// Configure Neon for serverless environments
// Use fetch for pooled queries (works in edge/serverless without WebSocket)
neonConfig.poolQueryViaFetch = true

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL

  if (!connectionString) {
    // Return a proxy that throws on actual use (for build-time safety)
    console.warn("No database connection string found, creating build-time stub")
    return new Proxy({} as PrismaClient, {
      get(target, prop) {
        if (prop === "then" || prop === "catch" || prop === "finally") {
          return undefined
        }
        return () => {
          throw new Error("Database not configured - set POSTGRES_PRISMA_URL or DATABASE_URL")
        }
      },
    })
  }

  // PrismaNeon takes connectionString directly (not a Pool)
  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
