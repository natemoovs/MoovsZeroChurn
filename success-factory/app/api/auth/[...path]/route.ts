import { authApiHandler } from "@neondatabase/auth/next/server"
import { NextResponse } from "next/server"
import {
  isAllowedEmailDomain,
  ALLOWED_EMAIL_DOMAINS,
} from "@/lib/auth/email-validator"

type Params = { path: string[] }

// Lazy-initialize handler to avoid build-time env var requirement
let handler: ReturnType<typeof authApiHandler> | null = null
function getHandler() {
  if (!handler) {
    handler = authApiHandler()
  }
  return handler
}

// Endpoints that include email in the request body
const EMAIL_ENDPOINTS = [
  "sign-up/email",
  "sign-in/email",
  "sign-in/email-otp",
  "email-otp/send-verification-otp",
]

async function validateEmailDomain(
  request: Request,
  path: string
): Promise<NextResponse | null> {
  // Check if this is an endpoint that requires email validation
  if (!EMAIL_ENDPOINTS.includes(path)) {
    return null
  }

  try {
    // Clone the request to read the body (can only be read once)
    const clonedRequest = request.clone()
    const body = await clonedRequest.json()
    const email = body.email

    if (email && !isAllowedEmailDomain(email)) {
      return NextResponse.json(
        {
          error: {
            message: `Access restricted to ${ALLOWED_EMAIL_DOMAINS.join(" and ")} email addresses only.`,
            code: "EMAIL_DOMAIN_NOT_ALLOWED",
          },
        },
        { status: 403 }
      )
    }
  } catch {
    // If we can't parse the body, let the original handler deal with it
  }

  return null
}

export async function GET(
  request: Request,
  context: { params: Promise<Params> }
) {
  return getHandler().GET(request, context)
}

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  const { path } = await context.params
  const pathString = path.join("/")

  // Validate email domain for sign-up and sign-in requests
  const validationError = await validateEmailDomain(request, pathString)
  if (validationError) {
    return validationError
  }

  return getHandler().POST(request, context)
}

export async function PUT(
  request: Request,
  context: { params: Promise<Params> }
) {
  return getHandler().PUT(request, context)
}

export async function DELETE(
  request: Request,
  context: { params: Promise<Params> }
) {
  return getHandler().DELETE(request, context)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<Params> }
) {
  return getHandler().PATCH(request, context)
}
