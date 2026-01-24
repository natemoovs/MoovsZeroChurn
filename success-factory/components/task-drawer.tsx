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
  pending: { icon: Circle, label: "Pending", color: "text-zinc-400" },
  in_progress: { icon: PlayCircle, label: "In Progress", color: "text-blue-500" },
  completed: { icon: CheckCircle2, label: "Completed", color: "text-emerald-500" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "text-red-500" },
}

const priorityColors = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

export function TaskDrawer({ task, open, onOpenChange, onStatusChange }: TaskDrawerProps) {
  if (!task) return null

  const StatusIcon = statusConfig[task.status].icon
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "completed"

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 mt-24 flex h-[85vh] flex-col rounded-t-[10px] bg-white dark:bg-zinc-900">
          {/* Handle */}
          <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {task.title}
                </h2>
                <span
                  className={cn(
                    "flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                    priorityColors[task.priority]
                  )}
                >
                  {task.priority}
                </span>
              </div>
              {task.description && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {task.description}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="mb-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {(["pending", "in_progress", "completed"] as const).map((status) => {
                  const config = statusConfig[status]
                  const Icon = config.icon
                  return (
                    <button
                      key={status}
                      onClick={() => onStatusChange(task.id, status)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        task.status === status
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Details */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-zinc-400" />
                <span className="text-zinc-600 dark:text-zinc-400">Company:</span>
                <a
                  href={`/accounts/${task.companyId}`}
                  className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  {task.companyName}
                </a>
              </div>

              {task.dueDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-600 dark:text-zinc-400">Due:</span>
                  <span
                    className={cn(
                      "font-medium",
                      isOverdue ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"
                    )}
                  >
                    {new Date(task.dueDate).toLocaleDateString()}
                    {isOverdue && " (Overdue)"}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-zinc-400" />
                <span className="text-zinc-600 dark:text-zinc-400">Assignee:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {task.metadata?.notionAssigneeName || task.ownerEmail || "Unassigned"}
                </span>
              </div>

              {task.metadata?.notionUrl && (
                <div className="flex items-center gap-3 text-sm">
                  <ExternalLink className="h-4 w-4 text-zinc-400" />
                  <a
                    href={task.metadata.notionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    View in Notion
                  </a>
                </div>
              )}

              {task.completedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-600 dark:text-zinc-400">Completed:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {new Date(task.completedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Comments */}
            {task.metadata?.notionPageId && (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                <TaskComments
                  taskId={task.id}
                  notionPageId={task.metadata.notionPageId}
                  notionUrl={task.metadata.notionUrl}
                />
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
