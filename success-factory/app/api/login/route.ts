import { NextRequest, NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"
import { rateLimiters, getClientIp } from "@/lib/rate-limit"
import { logInfo, logWarn } from "@/lib/logger"

// In-memory session store (for production, use Redis or database)
const sessions = new Map<string, { createdAt: number; ip: string }>()

// Session duration: 1 week
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now()
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_DURATION_MS) {
      sessions.delete(token)
    }
  }
}, 60000) // Every minute

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Hash the session token for storage
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request)

  // Rate limiting: 5 attempts per minute
  const rateLimit = rateLimiters.login.check(clientIp)
  if (!rateLimit.success) {
    logWarn("login", "Rate limit exceeded", { ip: clientIp })
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.reset),
        },
      }
    )
  }

  try {
    const { password } = await request.json()
    const sitePassword = process.env.SITE_PW

    // Validate password is set
    if (!sitePassword) {
      logWarn("login", "SITE_PW not configured")
      return NextResponse.json(
        { error: "Login not configured" },
        { status: 500 }
      )
    }

    // Validate password
    if (!password || password !== sitePassword) {
      logWarn("login", "Invalid password attempt", { ip: clientIp })
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      )
    }

    // Generate session token
    const sessionToken = generateSessionToken()
    const hashedToken = hashToken(sessionToken)

    // Store session (hashed)
    sessions.set(hashedToken, {
      createdAt: Date.now(),
      ip: clientIp,
    })

    logInfo("login", "Login successful", { ip: clientIp })

    const response = NextResponse.json({ success: true })

    // Set session cookie (with the raw token - it gets hashed for lookup)
    response.cookies.set("site-auth", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    return response
  } catch (error) {
    logWarn("login", "Login error", { error: String(error), ip: clientIp })
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    )
  }
}

/**
 * Validate a session token
 * Used by auth middleware
 */
export function validateSession(token: string): boolean {
  if (!token) return false

  const hashedToken = hashToken(token)
  const session = sessions.get(hashedToken)

  if (!session) return false

  // Check if expired
  if (Date.now() - session.createdAt > SESSION_DURATION_MS) {
    sessions.delete(hashedToken)
    return false
  }

  return true
}

/**
 * Logout - invalidate session
 */
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get("site-auth")?.value

  if (token) {
    const hashedToken = hashToken(token)
    sessions.delete(hashedToken)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete("site-auth")

  return response
}
