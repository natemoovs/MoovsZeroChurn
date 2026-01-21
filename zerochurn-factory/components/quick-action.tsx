"use client"

import Link from "next/link"
import { LucideIcon, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickActionProps {
  href: string
  icon: LucideIcon
  label: string
  description?: string
  badge?: string | number
  badgeVariant?: "default" | "danger" | "warning"
}

const badgeStyles = {
  default: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
}

export function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  badge,
  badgeVariant = "default",
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-zinc-100 p-2 transition-colors group-hover:bg-emerald-100 dark:bg-zinc-800 dark:group-hover:bg-emerald-950">
          <Icon className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-emerald-600 dark:text-zinc-400 dark:group-hover:text-emerald-400" />
        </div>
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
          {description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-sm font-medium",
              badgeStyles[badgeVariant]
            )}
          >
            {badge}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" />
      </div>
    </Link>
  )
}
