"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Camera, Loader2, Trash2, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ProfilePictureProps {
  className?: string
}

export function ProfilePicture({ className }: ProfilePictureProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Fetch current avatar
    fetch("/api/settings/avatar")
      .then((res) => res.json())
      .then((data) => {
        setAvatarUrl(data.avatarUrl)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Allowed: JPEG, PNG, GIF, WebP")
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error("File too large. Max 5MB")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/settings/avatar", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        setAvatarUrl(data.avatarUrl)
        toast.success("Profile picture updated")
      } else {
        toast.error(data.error || "Failed to upload")
      }
    } catch {
      toast.error("Failed to upload profile picture")
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async () => {
    if (!avatarUrl) return

    setDeleting(true)
    try {
      const res = await fetch("/api/settings/avatar", {
        method: "DELETE",
      })

      const data = await res.json()

      if (data.success) {
        setAvatarUrl(null)
        toast.success("Profile picture removed")
      } else {
        toast.error(data.error || "Failed to remove")
      }
    } catch {
      toast.error("Failed to remove profile picture")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={cn("flex items-center gap-6", className)}>
      {/* Avatar Display */}
      <div className="relative">
        <div
          className={cn(
            "relative h-24 w-24 overflow-hidden rounded-full",
            "bg-bg-tertiary border-border-default border-2",
            "flex items-center justify-center"
          )}
        >
          {loading ? (
            <Loader2 className="text-content-tertiary h-8 w-8 animate-spin" />
          ) : avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Profile picture"
              fill
              className="object-cover"
              unoptimized // Vercel Blob URLs are already optimized
            />
          ) : (
            <User className="text-content-tertiary h-12 w-12" />
          )}
        </div>

        {/* Upload button overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "absolute right-0 bottom-0",
            "flex h-8 w-8 items-center justify-center",
            "dark:border-bg-primary rounded-full border-2 border-white",
            "bg-primary-500 text-white",
            "hover:bg-primary-600 transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          title="Upload profile picture"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Info and actions */}
      <div className="flex-1">
        <h3 className="text-content-primary font-medium">Profile Picture</h3>
        <p className="text-content-secondary mt-1 text-sm">
          Upload a profile picture. Max 5MB, JPEG/PNG/GIF/WebP.
        </p>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              "bg-primary-500 hover:bg-primary-600 text-white",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                {avatarUrl ? "Change" : "Upload"}
              </>
            )}
          </button>

          {avatarUrl && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                "border-error-200 bg-error-50 text-error-700 border",
                "hover:bg-error-100",
                "dark:border-error-900/50 dark:bg-error-950/30 dark:text-error-400",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Remove
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
