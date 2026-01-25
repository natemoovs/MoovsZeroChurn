"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { DashboardHeader } from "./dashboard-header"
import { CommandPalette } from "./command-palette"
import { AIChat } from "./ai-chat"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg-primary">
      <CommandPalette />
      <AIChat />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <div
        className={cn(
          "min-w-0 overflow-x-hidden transition-all duration-300",
          // No padding on mobile, sidebar overlays
          // Desktop: add padding for sidebar
          collapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6">
          <div className="min-w-0 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
