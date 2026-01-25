"use client"

import { useState, useEffect } from "react"
import {
  X,
  Plus,
  GripVertical,
  Check,
  LayoutGrid,
  Activity,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  DollarSign,
  BarChart3,
  PieChart,
  ListTodo,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Widget {
  id: string
  type: string
  name: string
  description: string
  icon: React.ElementType
  size: "small" | "medium" | "large"
  enabled: boolean
  order: number
}

const AVAILABLE_WIDGETS: Omit<Widget, "enabled" | "order">[] = [
  {
    id: "health-summary",
    type: "health-summary",
    name: "Health Summary",
    description: "Overview of account health distribution",
    icon: PieChart,
    size: "small",
  },
  {
    id: "mrr-chart",
    type: "mrr-chart",
    name: "MRR Chart",
    description: "Monthly recurring revenue trends",
    icon: DollarSign,
    size: "medium",
  },
  {
    id: "at-risk-accounts",
    type: "at-risk-accounts",
    name: "At-Risk Accounts",
    description: "Accounts needing immediate attention",
    icon: AlertTriangle,
    size: "medium",
  },
  {
    id: "activity-feed",
    type: "activity-feed",
    name: "Activity Feed",
    description: "Recent team activity",
    icon: Activity,
    size: "medium",
  },
  {
    id: "upcoming-renewals",
    type: "upcoming-renewals",
    name: "Upcoming Renewals",
    description: "Renewals in the next 30 days",
    icon: Calendar,
    size: "small",
  },
  {
    id: "tasks-overview",
    type: "tasks-overview",
    name: "Tasks Overview",
    description: "Your pending and overdue tasks",
    icon: ListTodo,
    size: "small",
  },
  {
    id: "team-leaderboard",
    type: "team-leaderboard",
    name: "Team Leaderboard",
    description: "CSM performance rankings",
    icon: Trophy,
    size: "medium",
  },
  {
    id: "expansion-pipeline",
    type: "expansion-pipeline",
    name: "Expansion Pipeline",
    description: "Upsell and cross-sell opportunities",
    icon: TrendingUp,
    size: "medium",
  },
  {
    id: "cohort-retention",
    type: "cohort-retention",
    name: "Cohort Retention",
    description: "Retention by signup cohort",
    icon: BarChart3,
    size: "large",
  },
  {
    id: "nps-summary",
    type: "nps-summary",
    name: "NPS Summary",
    description: "Net Promoter Score overview",
    icon: Users,
    size: "small",
  },
]

interface DashboardBuilderProps {
  isOpen: boolean
  onClose: () => void
  onSave: (widgets: Widget[]) => void
  currentWidgets?: Widget[]
}

export function DashboardBuilder({
  isOpen,
  onClose,
  onSave,
  currentWidgets,
}: DashboardBuilderProps) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)

  useEffect(() => {
    if (currentWidgets?.length) {
      setWidgets(currentWidgets)
    } else {
      // Default widgets
      setWidgets(
        AVAILABLE_WIDGETS.slice(0, 6).map((w, i) => ({
          ...w,
          enabled: true,
          order: i,
        }))
      )
    }
  }, [currentWidgets, isOpen])

  const toggleWidget = (widgetId: string) => {
    setWidgets((prev) => {
      const existing = prev.find((w) => w.id === widgetId)
      if (existing) {
        return prev.map((w) =>
          w.id === widgetId ? { ...w, enabled: !w.enabled } : w
        )
      } else {
        const template = AVAILABLE_WIDGETS.find((w) => w.id === widgetId)
        if (template) {
          return [
            ...prev,
            { ...template, enabled: true, order: prev.length },
          ]
        }
      }
      return prev
    })
  }

  const moveWidget = (widgetId: string, direction: "up" | "down") => {
    setWidgets((prev) => {
      const enabledWidgets = prev.filter((w) => w.enabled).sort((a, b) => a.order - b.order)
      const idx = enabledWidgets.findIndex((w) => w.id === widgetId)
      if (idx === -1) return prev

      const newIdx = direction === "up" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= enabledWidgets.length) return prev

      // Swap orders
      const swapTarget = enabledWidgets[newIdx]
      return prev.map((w) => {
        if (w.id === widgetId) return { ...w, order: swapTarget.order }
        if (w.id === swapTarget.id) return { ...w, order: enabledWidgets[idx].order }
        return w
      })
    })
  }

  const handleSave = () => {
    onSave(widgets)
    onClose()
  }

  if (!isOpen) return null

  const enabledWidgets = widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order)
  const disabledWidgetIds = new Set(widgets.filter((w) => !w.enabled).map((w) => w.id))
  const availableToAdd = AVAILABLE_WIDGETS.filter(
    (w) => !widgets.some((ew) => ew.id === w.id) || disabledWidgetIds.has(w.id)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-bg-elevated shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-900/30">
              <LayoutGrid className="h-5 w-5 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-content-primary">
                Customize Dashboard
              </h2>
              <p className="text-sm text-content-secondary">
                Add, remove, and reorder widgets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-content-tertiary hover:bg-surface-hover hover:text-content-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Active widgets */}
          <div className="flex-1 overflow-y-auto border-r border-border-default p-4">
            <h3 className="mb-3 text-sm font-medium text-content-secondary">
              Active Widgets ({enabledWidgets.length})
            </h3>
            <div className="space-y-2">
              {enabledWidgets.map((widget, idx) => (
                <div
                  key={widget.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border-default bg-bg-elevated p-3 transition-all",
                    draggedWidget === widget.id && "opacity-50"
                  )}
                >
                  <div className="cursor-grab text-content-tertiary">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      "bg-bg-tertiary text-content-secondary"
                    )}
                  >
                    <widget.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-content-primary">
                      {widget.name}
                    </p>
                    <p className="text-xs text-content-secondary">{widget.size} widget</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveWidget(widget.id, "up")}
                      disabled={idx === 0}
                      className="rounded p-1 text-content-tertiary hover:bg-surface-hover hover:text-content-secondary disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveWidget(widget.id, "down")}
                      disabled={idx === enabledWidgets.length - 1}
                      className="rounded p-1 text-content-tertiary hover:bg-surface-hover hover:text-content-secondary disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className="rounded p-1 text-content-tertiary hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {enabledWidgets.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-border-default p-8 text-center">
                  <LayoutGrid className="mx-auto mb-2 h-8 w-8 text-content-tertiary" />
                  <p className="text-sm text-content-secondary">
                    Add widgets from the right panel
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Available widgets */}
          <div className="w-80 overflow-y-auto bg-bg-secondary p-4">
            <h3 className="mb-3 text-sm font-medium text-content-secondary">
              Available Widgets
            </h3>
            <div className="space-y-2">
              {AVAILABLE_WIDGETS.map((widget) => {
                const isEnabled = widgets.find(
                  (w) => w.id === widget.id && w.enabled
                )
                return (
                  <button
                    key={widget.id}
                    onClick={() => !isEnabled && toggleWidget(widget.id)}
                    disabled={!!isEnabled}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      isEnabled
                        ? "border-success-200 bg-success-50 dark:border-success-900/50 dark:bg-success-900/20"
                        : "border-border-default bg-bg-elevated hover:border-success-300 hover:bg-success-50 dark:hover:border-success-800 dark:hover:bg-success-900/20"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        isEnabled
                          ? "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
                          : "bg-bg-tertiary text-content-secondary"
                      )}
                    >
                      <widget.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-content-primary">
                        {widget.name}
                      </p>
                      <p className="text-xs text-content-secondary">{widget.description}</p>
                    </div>
                    {isEnabled ? (
                      <Check className="h-4 w-4 text-success-600" />
                    ) : (
                      <Plus className="h-4 w-4 text-content-tertiary" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-default p-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700"
          >
            <Check className="h-4 w-4" />
            Save Layout
          </button>
        </div>
      </div>
    </div>
  )
}
