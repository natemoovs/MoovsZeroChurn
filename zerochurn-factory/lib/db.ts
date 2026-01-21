import { neon } from "@neondatabase/serverless"
import { PrismaNeonHTTP } from "@prisma/adapter-neon"
import { PrismaClient } from "@prisma/client"

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL

  if (!connectionString) {
    // Return a PrismaClient that will fail on first query (for build time)
    return new PrismaClient()
  }

  const sql = neon(connectionString)
  const adapter = new PrismaNeonHTTP(sql)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
