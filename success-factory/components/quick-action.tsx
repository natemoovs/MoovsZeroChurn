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
  default: "bg-bg-tertiary text-content-secondary",
  danger: "bg-error-100 text-error-700 dark:bg-error-950 dark:text-error-400",
  warning: "bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-400",
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
      className="group border-border-default bg-bg-elevated hover:border-success-200 hover:bg-success-50/50 dark:hover:border-success-900 dark:hover:bg-success-950/20 flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="bg-bg-tertiary group-hover:bg-success-100 dark:group-hover:bg-success-950 rounded-lg p-2 transition-colors">
          <Icon className="text-content-secondary group-hover:text-success-600 dark:group-hover:text-success-400 h-5 w-5 transition-colors" />
        </div>
        <div>
          <p className="text-content-primary font-medium">{label}</p>
          {description && <p className="text-content-secondary text-sm">{description}</p>}
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
        <ChevronRight className="text-content-tertiary h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
