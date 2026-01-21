import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * Handle Neon Auth callback
 * GET /api/auth/callback?token=...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=no_token", request.url))
  }

  // Verify the token
  const user = await verifyToken(token)
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url))
  }

  // Create or update user in database
  try {
    await prisma.userPreference.upsert({
      where: { neonUserId: user.id },
      update: {
        email: user.email,
        name: user.name,
      },
      create: {
        neonUserId: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error("Failed to upsert user:", error)
  }

  // Set auth cookie and redirect to dashboard
  const response = NextResponse.redirect(new URL("/", request.url))
  response.cookies.set("neon-auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return response
}
