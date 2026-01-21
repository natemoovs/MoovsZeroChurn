import { defineConfig } from "prisma/config";

// Load dotenv only in development
if (process.env.NODE_ENV !== "production") {
  try {
    require("dotenv/config");
  } catch {
    // dotenv not available, that's fine in production
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Vercel Postgres / Neon uses POSTGRES_PRISMA_URL
    url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "",
  },
});
