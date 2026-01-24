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
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/accounts", icon: Users, label: "Accounts" },
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
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950",
          // Mobile: slide in/out
          "max-lg:-translate-x-full max-lg:w-64",
          isOpen && "max-lg:translate-x-0",
          // Desktop: always visible, respect collapsed state
          "lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link href="/" className="flex items-center gap-3" onClick={onClose}>
            <Image
              src="/logo.jpg"
              alt="Moovs"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg flex-shrink-0"
            />
            {!collapsed && (
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Success Factory
              </span>
            )}
          </Link>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-blue-600 dark:text-blue-400")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse Toggle - desktop only */}
        <div className="hidden border-t border-zinc-200 p-3 lg:block dark:border-zinc-800">
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
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
