"use client"

import { Drawer } from "vaul"
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
  Calendar,
  Building2,
  User,
  ExternalLink,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskComments } from "./task-comments"

interface Task {
  id: string
  companyId: string
  companyName: string
  title: string
  description: string | null
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled"
  dueDate: string | null
  completedAt: string | null
  ownerEmail: string | null
  metadata?: {
    notionPageId?: string
    notionUrl?: string
    notionAssigneeId?: string
    notionAssigneeName?: string
  } | null
}

interface TaskDrawerProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (taskId: string, status: string) => void
}

const statusConfig = {
  pending: { icon: Circle, label: "Pending", color: "text-content-tertiary" },
  in_progress: { icon: PlayCircle, label: "In Progress", color: "text-info-500" },
  completed: { icon: CheckCircle2, label: "Completed", color: "text-success-500" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "text-error-500" },
}

const priorityColors = {
  urgent: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
  high: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
  medium: "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400",
  low: "bg-bg-tertiary text-content-secondary",
}

export function TaskDrawer({ task, open, onOpenChange, onStatusChange }: TaskDrawerProps) {
  if (!task) return null

  const StatusIcon = statusConfig[task.status].icon
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed"

  // Status-specific accent colors for header
  const statusAccent = {
    pending: "from-warning-500/10 to-transparent border-warning-200 dark:border-warning-800",
    in_progress: "from-info-500/10 to-transparent border-info-200 dark:border-info-800",
    completed: "from-success-500/10 to-transparent border-success-200 dark:border-success-800",
    cancelled: "from-error-500/10 to-transparent border-error-200 dark:border-error-800",
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="bg-bg-elevated fixed right-0 bottom-0 left-0 mt-24 flex h-[85vh] flex-col rounded-t-2xl shadow-xl">
          {/* Handle */}
          <div className="bg-content-tertiary/50 mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Header with gradient accent */}
            <div
              className={cn("mb-4 border-b bg-gradient-to-b p-4 pb-5", statusAccent[task.status])}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg",
                      task.status === "completed"
                        ? "bg-success-100 dark:bg-success-900/30"
                        : task.status === "in_progress"
                          ? "bg-info-100 dark:bg-info-900/30"
                          : "bg-warning-100 dark:bg-warning-900/30"
                    )}
                  >
                    <StatusIcon className={cn("h-5 w-5", statusConfig[task.status].color)} />
                  </div>
                  <div>
                    <h2 className="text-content-primary text-lg font-semibold">{task.title}</h2>
                    <p className="text-content-tertiary text-xs">
                      {statusConfig[task.status].label}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
                    priorityColors[task.priority]
                  )}
                >
                  {task.priority}
                </span>
              </div>
              {task.description && (
                <p className="text-content-secondary mt-3 text-sm leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>

            <div className="px-4 pb-4">
              {/* Status */}
              <div className="border-border-default bg-bg-secondary mb-4 rounded-xl border p-4">
                <label className="text-content-tertiary mb-3 block text-xs font-semibold tracking-wide uppercase">
                  Update Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["pending", "in_progress", "completed"] as const).map((status) => {
                    const config = statusConfig[status]
                    const Icon = config.icon
                    const isActive = task.status === status

                    const activeStyles = {
                      pending:
                        "bg-warning-100 text-warning-700 ring-2 ring-warning-500/30 dark:bg-warning-900/30 dark:text-warning-400",
                      in_progress:
                        "bg-info-100 text-info-700 ring-2 ring-info-500/30 dark:bg-info-900/30 dark:text-info-400",
                      completed:
                        "bg-success-100 text-success-700 ring-2 ring-success-500/30 dark:bg-success-900/30 dark:text-success-400",
                    }

                    return (
                      <button
                        key={status}
                        onClick={() => onStatusChange(task.id, status)}
                        className={cn(
                          "flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                          isActive
                            ? activeStyles[status]
                            : "bg-bg-elevated text-content-secondary hover:bg-surface-hover border-border-default border"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isActive ? "" : config.color)} />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Details */}
              <div className="border-border-default bg-bg-elevated mb-4 rounded-xl border">
                <div className="border-border-default border-b px-4 py-3">
                  <h3 className="text-content-tertiary text-xs font-semibold tracking-wide uppercase">
                    Details
                  </h3>
                </div>
                <div className="divide-border-default divide-y">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="bg-primary-100 dark:bg-primary-900/30 flex h-8 w-8 items-center justify-center rounded-lg">
                      <Building2 className="text-primary-600 dark:text-primary-400 h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span className="text-content-tertiary text-xs">Company</span>
                      <a
                        href={`/accounts/${task.companyId}`}
                        className="text-primary-600 dark:text-primary-400 block font-medium hover:underline"
                      >
                        {task.companyName}
                      </a>
                    </div>
                  </div>

                  {task.dueDate && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          isOverdue
                            ? "bg-error-100 dark:bg-error-900/30"
                            : "bg-info-100 dark:bg-info-900/30"
                        )}
                      >
                        <Calendar
                          className={cn(
                            "h-4 w-4",
                            isOverdue
                              ? "text-error-600 dark:text-error-400"
                              : "text-info-600 dark:text-info-400"
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-content-tertiary text-xs">Due Date</span>
                        <span
                          className={cn(
                            "block font-medium",
                            isOverdue
                              ? "text-error-600 dark:text-error-400"
                              : "text-content-primary"
                          )}
                        >
                          {new Date(task.dueDate).toLocaleDateString()}
                          {isOverdue && (
                            <span className="bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400 ml-2 rounded px-1.5 py-0.5 text-xs font-semibold">
                              Overdue
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="bg-accent-100 dark:bg-accent-900/30 flex h-8 w-8 items-center justify-center rounded-lg">
                      <User className="text-accent-600 dark:text-accent-400 h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span className="text-content-tertiary text-xs">Assignee</span>
                      <span className="text-content-primary block font-medium">
                        {task.metadata?.notionAssigneeName || task.ownerEmail || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {task.completedAt && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="bg-success-100 dark:bg-success-900/30 flex h-8 w-8 items-center justify-center rounded-lg">
                        <Clock className="text-success-600 dark:text-success-400 h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <span className="text-content-tertiary text-xs">Completed</span>
                        <span className="text-success-600 dark:text-success-400 block font-medium">
                          {new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {task.metadata?.notionUrl && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="bg-bg-tertiary flex h-8 w-8 items-center justify-center rounded-lg">
                        <ExternalLink className="text-content-secondary h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <span className="text-content-tertiary text-xs">Source</span>
                        <a
                          href={task.metadata.notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 dark:text-primary-400 block font-medium hover:underline"
                        >
                          View in Notion →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              {task.metadata?.notionPageId && (
                <div className="border-border-default bg-bg-elevated overflow-hidden rounded-xl border">
                  <TaskComments
                    taskId={task.id}
                    notionPageId={task.metadata.notionPageId}
                    notionUrl={task.metadata.notionUrl}
                  />
                </div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
