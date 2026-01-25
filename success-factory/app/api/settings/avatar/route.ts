import { NextRequest, NextResponse } from "next/server"
import { put, del } from "@vercel/blob"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/server"

/**
 * Get current user's avatar
 * GET /api/settings/avatar
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userPref = await prisma.userPreference.findUnique({
      where: { neonUserId: user.id },
      select: { avatarUrl: true },
    })

    return NextResponse.json({
      avatarUrl: userPref?.avatarUrl || null,
    })
  } catch (error) {
    console.error("Failed to get avatar:", error)
    return NextResponse.json({ error: "Failed to get avatar" }, { status: 500 })
  }
}

/**
 * Upload a new avatar
 * POST /api/settings/avatar
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Max 5MB" }, { status: 400 })
    }

    // Get current avatar to delete later
    const currentPref = await prisma.userPreference.findUnique({
      where: { neonUserId: user.id },
      select: { avatarUrl: true },
    })

    // Upload to Vercel Blob
    const blob = await put(`avatars/${user.id}-${Date.now()}`, file, {
      access: "public",
      addRandomSuffix: false,
    })

    // Update user preference with new avatar URL
    await prisma.userPreference.upsert({
      where: { neonUserId: user.id },
      update: { avatarUrl: blob.url },
      create: {
        neonUserId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: blob.url,
      },
    })

    // Delete old avatar from blob storage if exists
    if (currentPref?.avatarUrl) {
      try {
        await del(currentPref.avatarUrl)
      } catch {
        // Ignore deletion errors for old avatars
      }
    }

    return NextResponse.json({
      success: true,
      avatarUrl: blob.url,
    })
  } catch (error) {
    console.error("Failed to upload avatar:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}

/**
 * Delete current avatar
 * DELETE /api/settings/avatar
 */
export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userPref = await prisma.userPreference.findUnique({
      where: { neonUserId: user.id },
      select: { avatarUrl: true },
    })

    if (userPref?.avatarUrl) {
      // Delete from blob storage
      try {
        await del(userPref.avatarUrl)
      } catch {
        // Ignore deletion errors
      }

      // Clear avatar URL in database
      await prisma.userPreference.update({
        where: { neonUserId: user.id },
        data: { avatarUrl: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete avatar:", error)
    return NextResponse.json({ error: "Failed to delete avatar" }, { status: 500 })
  }
}
