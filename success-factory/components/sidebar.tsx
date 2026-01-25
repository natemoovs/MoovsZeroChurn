"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Sparkles,
  History,
  CalendarClock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  UsersRound,
  Zap,
  Settings,
  X,
  TrendingUp,
  BarChart3,
  PieChart,
  Brain,
  Activity,
  LayoutGrid,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/accounts", icon: Users, label: "Accounts" },
  { href: "/matrix", icon: LayoutGrid, label: "Moovs Matrix" },
  { href: "/predictions", icon: Brain, label: "Predictions" },
  { href: "/benchmarks", icon: Activity, label: "Benchmarks" },
  { href: "/engagement", icon: Zap, label: "Engagement" },
  { href: "/expansion", icon: TrendingUp, label: "Expansion" },
  { href: "/cohorts", icon: BarChart3, label: "Cohorts" },
  { href: "/roi", icon: PieChart, label: "ROI Dashboard" },
  { href: "/team", icon: UsersRound, label: "CSM Workload" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/playbooks", icon: Zap, label: "Playbooks" },
  { href: "/renewals", icon: CalendarClock, label: "Renewals" },
  { href: "/skills", icon: Sparkles, label: "Skills" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "glass-heavy border-border-default fixed top-0 left-0 z-50 flex h-screen flex-col border-r transition-all duration-300",
          // Mobile: slide in/out
          "max-lg:w-64 max-lg:-translate-x-full",
          isOpen && "max-lg:translate-x-0",
          // Desktop: always visible, respect collapsed state
          "lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Logo */}
        <div className="border-border-default flex h-16 items-center justify-between border-b px-4">
          <Link href="/" className="flex items-center gap-3" onClick={onClose}>
            <Image
              src="/logo.jpg"
              alt="Moovs"
              width={32}
              height={32}
              className="h-8 w-8 flex-shrink-0 rounded-lg"
            />
            {!collapsed && (
              <span className="text-content-primary font-semibold">Success Factory</span>
            )}
          </Link>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="text-content-tertiary hover:bg-surface-hover hover:text-content-primary transition-colors-smooth rounded-lg p-2 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "transition-all-smooth flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive
                    ? "bg-primary-100 text-primary-700 glow-sm dark:bg-primary-50 dark:text-primary-500"
                    : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive && "text-primary-600 dark:text-primary-500"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse Toggle - desktop only */}
        <div className="border-border-default hidden border-t p-3 lg:block">
          <button
            onClick={onToggleCollapse}
            className="text-content-tertiary hover:bg-surface-hover hover:text-content-primary transition-colors-smooth flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
