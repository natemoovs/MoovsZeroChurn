"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useHotkeys } from "react-hotkeys-hook"
import { DashboardLayout } from "@/components/dashboard-layout"
import { HealthBadge } from "@/components/health-badge"
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  Calendar,
  Building2,
  User,
  MoreHorizontal,
  PlayCircle,
  XCircle,
  ArrowUpRight,
  Search,
  RefreshCw,
  Users,
  CheckSquare,
  Square,
  Loader2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "@/lib/auth/client"
import { useTouchDevice } from "@/hooks/use-touch-device"
import { TaskComments } from "@/components/task-comments"
import { TaskDrawer } from "@/components/task-drawer"
import { TaskDetailModal } from "@/components/task-detail-modal"
import { toast } from "sonner"

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
  ownerId: string | null
  ownerEmail: string | null
  playbook: {
    id: string
    name: string
  } | null
  createdAt: string
  metadata?: {
    notionPageId?: string
    notionUrl?: string
    notionAssigneeId?: string
    notionAssigneeName?: string
    syncedFromNotion?: boolean
  } | null
}

interface NotionUser {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
}

interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  overdue: number
  byPriority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
}

export default function TasksPage() {
  const { data } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [notionUsers, setNotionUsers] = useState<NotionUser[]>([])
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all")
  const [assigneeFilter, setAssigneeFilter] = useState<"mine" | "all" | string>("mine")
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewTask, setShowNewTask] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [drawerTask, setDrawerTask] = useState<Task | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailModalTask, setDetailModalTask] = useState<Task | null>(null)
  const taskRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const isTouchDevice = useTouchDevice()

  // Get current user's email for "My Tasks" filter
  const currentUserEmail = data?.user?.email

  // Keyboard shortcuts (only active on non-touch devices)
  // j - move down
  useHotkeys("j", () => {
    if (filteredTasks.length === 0) return
    setFocusedIndex((prev) => {
      const next = Math.min(prev + 1, filteredTasks.length - 1)
      taskRefs.current.get(next)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      return next
    })
  }, { preventDefault: true })

  // k - move up
  useHotkeys("k", () => {
    if (filteredTasks.length === 0) return
    setFocusedIndex((prev) => {
      const next = Math.max(prev - 1, 0)
      taskRefs.current.get(next)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      return next
    })
  }, { preventDefault: true })

  // Enter - toggle completion of focused task
  useHotkeys("enter", () => {
    if (focusedIndex >= 0 && focusedIndex < filteredTasks.length) {
      const task = filteredTasks[focusedIndex]
      updateTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")
    }
  }, { preventDefault: true })

  // x - toggle selection of focused task
  useHotkeys("x", () => {
    if (focusedIndex >= 0 && focusedIndex < filteredTasks.length) {
      toggleTaskSelection(filteredTasks[focusedIndex].id)
    }
  }, { preventDefault: true })

  // c - create new task
  useHotkeys("c", () => {
    setShowNewTask(true)
  }, { preventDefault: true })

  // Escape - clear focus/selection
  useHotkeys("escape", () => {
    setFocusedIndex(-1)
    setSelectedTasks(new Set())
  })

  // Toggle task selection
  function toggleTaskSelection(taskId: string) {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  // Select all visible tasks
  function selectAllTasks() {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filteredTasks.map((t) => t.id)))
    }
  }

  // Bulk reassign selected tasks
  async function bulkReassign(notionUserId: string) {
    if (selectedTasks.size === 0 || bulkAssigning) return

    const user = notionUsers.find((u) => u.id === notionUserId)
    const count = selectedTasks.size

    setBulkAssigning(true)
    try {
      const promises = Array.from(selectedTasks).map((taskId) =>
        fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notionAssigneeId: notionUserId }),
        })
      )
      await Promise.all(promises)
      setSelectedTasks(new Set())
      fetchTasks()
      toast.success(`${count} task${count !== 1 ? "s" : ""} reassigned to ${user?.name || "user"}`)
    } catch (error) {
      console.error("Failed to bulk reassign tasks:", error)
      toast.error("Failed to reassign tasks")
    } finally {
      setBulkAssigning(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchNotionUsers()
  }, [filter])

  // Helper function to get assignee display name
  // Priority: notionAssigneeName > lookup by notionAssigneeId > ownerEmail > "Unassigned"
  function getAssigneeDisplayName(task: Task): string {
    // First check if we have the name stored
    if (task.metadata?.notionAssigneeName) {
      return task.metadata.notionAssigneeName
    }
    // Then try to look up by ID from notionUsers
    if (task.metadata?.notionAssigneeId && notionUsers.length > 0) {
      const user = notionUsers.find((u) => u.id === task.metadata?.notionAssigneeId)
      if (user?.name) {
        return user.name
      }
    }
    // Fall back to ownerEmail
    if (task.ownerEmail) {
      return task.ownerEmail
    }
    return "Unassigned"
  }

  // Filter tasks client-side for assignee and search
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        task.companyName.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Assignee filter
    if (assigneeFilter === "mine" && currentUserEmail) {
      // Match by email or Notion assignee name containing current user's name
      const userFirstName = currentUserEmail.split("@")[0].toLowerCase()
      const assigneeDisplayName = getAssigneeDisplayName(task).toLowerCase()
      const ownerEmail = task.ownerEmail?.toLowerCase() || ""
      return assigneeDisplayName.includes(userFirstName) || ownerEmail.includes(userFirstName)
    } else if (assigneeFilter !== "all" && assigneeFilter !== "mine") {
      // Filter by specific Notion user ID
      return task.metadata?.notionAssigneeId === assigneeFilter
    }

    return true
  })

  async function fetchTasks() {
    try {
      const statusParam = filter !== "all" ? `?status=${filter}` : ""
      const res = await fetch(`/api/tasks${statusParam}`)
      const data = await res.json()
      setTasks(data.tasks || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchNotionUsers() {
    try {
      const res = await fetch("/api/integrations/notion/users")
      const data = await res.json()
      if (data.users) {
        setNotionUsers(data.users)
      }
    } catch (error) {
      console.error("Failed to fetch Notion users:", error)
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      fetchTasks()
      toast.success(status === "completed" ? "Task completed" : "Task reopened")
    } catch (error) {
      console.error("Failed to update task:", error)
      toast.error("Failed to update task")
    }
  }

  async function updateTaskAssignee(taskId: string, notionUserId: string) {
    const user = notionUsers.find((u) => u.id === notionUserId)
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notionAssigneeId: notionUserId }),
      })
      fetchTasks()
      toast.success(`Assigned to ${user?.name || "user"}`)
    } catch (error) {
      console.error("Failed to update task assignee:", error)
      toast.error("Failed to reassign task")
    }
  }

  async function syncFromNotion() {
    setSyncing(true)
    try {
      const res = await fetch("/api/integrations/notion/tasks/sync", {
        method: "POST",
      })
      const data = await res.json()
      if (data.success) {
        fetchTasks()
        const { created, updated } = data.synced || {}
        if (created || updated) {
          toast.success(`Synced: ${created || 0} new, ${updated || 0} updated`)
        } else {
          toast.success("Sync complete - no changes")
        }
      } else {
        toast.error("Sync failed")
      }
    } catch (error) {
      console.error("Failed to sync from Notion:", error)
      toast.error("Failed to sync from Notion")
    } finally {
      setSyncing(false)
    }
  }

  const priorityColors = {
    urgent: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
    high: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
    medium: "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400",
    low: "bg-bg-tertiary text-content-secondary",
  }

  const statusIcons = {
    pending: Circle,
    in_progress: PlayCircle,
    completed: CheckCircle2,
    cancelled: XCircle,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content-primary">
              Tasks
            </h1>
            <p className="mt-1 text-content-secondary">
              Manage your CSM action items and playbook tasks
            </p>
            {!isTouchDevice && (
              <p className="mt-1 hidden text-xs text-content-tertiary sm:block dark:text-content-secondary">
                <kbd className="rounded bg-bg-tertiary px-1">j</kbd>/<kbd className="rounded bg-bg-tertiary px-1">k</kbd> navigate
                {" "}<kbd className="rounded bg-bg-tertiary px-1">x</kbd> select
                {" "}<kbd className="rounded bg-bg-tertiary px-1">↵</kbd> complete
                {" "}<kbd className="rounded bg-bg-tertiary px-1">c</kbd> create
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncFromNotion}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover disabled:opacity-50"
              title="Sync tasks from Notion"
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Syncing..." : "Sync"}
            </button>
            <button
              onClick={() => setShowNewTask(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Total"
              value={stats.total}
              icon={Circle}
              variant="default"
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              label="In Progress"
              value={stats.inProgress}
              icon={PlayCircle}
              variant="info"
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              label="Overdue"
              value={stats.overdue}
              icon={AlertTriangle}
              variant="error"
            />
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-elevated py-2 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Assignee Filter */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-content-tertiary" />
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="rounded-lg border border-border-default bg-bg-elevated px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="mine">My Tasks</option>
                <option value="all">All Tasks</option>
                {notionUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-content-tertiary" />
              <div className="flex gap-1 rounded-lg bg-bg-tertiary p-1">
                {(["all", "pending", "in_progress", "completed"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      filter === f
                        ? "bg-bg-elevated text-content-primary shadow"
                        : "text-content-secondary hover:text-content-primary"
                    )}
                  >
                    {f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedTasks.size > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-success-50 p-3 dark:bg-success-900/20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTasks(new Set())}
                className="rounded p-1 text-content-secondary hover:bg-surface-hover hover:text-content-primary"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-success-700 dark:text-success-400">
                {selectedTasks.size} task{selectedTasks.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-content-secondary">Reassign to:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    bulkReassign(e.target.value)
                    e.target.value = ""
                  }
                }}
                disabled={bulkAssigning}
                className="rounded-lg border border-success-200 bg-bg-elevated px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 dark:border-success-800"
                defaultValue=""
              >
                <option value="" disabled>
                  {bulkAssigning ? "Reassigning..." : "Select person..."}
                </option>
                {notionUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              {bulkAssigning && (
                <Loader2 className="h-4 w-4 animate-spin text-success-600" />
              )}
            </div>
          </div>
        )}

        {/* Task List */}
        {loading ? (
          <TaskListSkeleton />
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-border-default bg-bg-elevated p-12 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-content-tertiary" />
            <h3 className="text-lg font-semibold text-content-primary">
              No tasks found
            </h3>
            <p className="mt-2 text-content-secondary">
              {searchQuery
                ? "No tasks match your search"
                : assigneeFilter === "mine"
                ? "No tasks assigned to you"
                : filter === "all"
                ? "Create your first task or sync from Notion"
                : `No ${filter.replace("_", " ")} tasks`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select All Header */}
            {filteredTasks.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2">
                <button
                  onClick={selectAllTasks}
                  className="flex-shrink-0 text-content-tertiary hover:text-content-secondary"
                >
                  {selectedTasks.size === filteredTasks.length && filteredTasks.length > 0 ? (
                    <CheckSquare className="h-5 w-5 text-success-500" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <span className="text-sm text-content-secondary">
                  {selectedTasks.size === filteredTasks.length && filteredTasks.length > 0
                    ? "Deselect all"
                    : "Select all"}
                </span>
              </div>
            )}
            {filteredTasks.map((task, index) => {
              const StatusIcon = statusIcons[task.status]
              const isOverdue =
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                task.status !== "completed"

              const isSelected = selectedTasks.has(task.id)
              const isFocused = focusedIndex === index

              return (
                <div
                  key={task.id}
                  ref={(el) => {
                    if (el) taskRefs.current.set(index, el)
                  }}
                  onClick={() => setFocusedIndex(index)}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-bg-elevated transition-all-smooth",
                    isFocused
                      ? "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-bg-primary glow-sm"
                      : "",
                    isSelected
                      ? "border-success-400 bg-success-50 dark:bg-success-50/10"
                      : task.status === "completed"
                      ? "border-border-default opacity-60"
                      : isOverdue
                      ? "border-error-300 dark:border-error-500"
                      : "border-border-default"
                  )}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Selection Checkbox - touch-friendly */}
                    <button
                      onClick={() => toggleTaskSelection(task.id)}
                      className="flex-shrink-0 text-content-tertiary hover:text-content-primary min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 transition-colors-smooth"
                    >
                      {selectedTasks.has(task.id) ? (
                        <CheckSquare className="h-5 w-5 text-success-500" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>

                    {/* Status Toggle - touch-friendly */}
                    <button
                      onClick={() =>
                        updateTaskStatus(
                          task.id,
                          task.status === "completed" ? "pending" : "completed"
                        )
                      }
                      className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 transition-colors-smooth"
                    >
                      <StatusIcon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          task.status === "completed"
                            ? "text-success-500"
                            : task.status === "in_progress"
                            ? "text-primary-500"
                            : "text-content-tertiary hover:text-content-secondary"
                        )}
                      />
                    </button>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Open full detail modal for Notion tasks, drawer for others
                              if (task.metadata?.notionPageId) {
                                setDetailModalTask(task)
                              } else {
                                setDrawerTask(task)
                                setDrawerOpen(true)
                              }
                            }}
                            className={cn(
                              "text-left font-medium hover:underline",
                              task.status === "completed"
                                ? "text-content-secondary line-through dark:text-content-tertiary"
                                : "text-content-primary"
                            )}
                          >
                            {task.title}
                          </button>
                          {task.description && (
                            <p className="mt-1 text-sm text-content-secondary line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Priority Badge */}
                        <span
                          className={cn(
                            "flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                            priorityColors[task.priority]
                          )}
                        >
                          {task.priority}
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-content-secondary">
                        <Link
                          href={`/accounts/${task.companyId}`}
                          className="flex items-center gap-1 hover:text-success-600 dark:hover:text-success-400"
                        >
                          <Building2 className="h-4 w-4" />
                          {task.companyName}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>

                        {task.dueDate && (
                          <span
                            className={cn(
                              "flex items-center gap-1",
                              isOverdue && "text-error-600 dark:text-error-400"
                            )}
                          >
                            <Calendar className="h-4 w-4" />
                            {isOverdue ? "Overdue: " : "Due: "}
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}

                        {/* Assignee Dropdown */}
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <select
                            value={task.metadata?.notionAssigneeId || ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                updateTaskAssignee(task.id, e.target.value)
                              }
                            }}
                            className="rounded border-0 bg-transparent py-0 pl-0 pr-6 text-sm text-content-secondary focus:ring-1 focus:ring-success-500 dark:text-content-tertiary"
                          >
                            <option value="">
                              {getAssigneeDisplayName(task)}
                            </option>
                            {notionUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {task.playbook && (
                          <span className="rounded bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                            {task.playbook.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions - touch-friendly */}
                    <div className="flex-shrink-0">
                      <button className="rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center text-content-tertiary hover:bg-surface-hover hover:text-content-primary transition-colors-smooth">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {task.metadata?.notionPageId && (
                    <TaskComments
                      taskId={task.id}
                      notionPageId={task.metadata.notionPageId}
                      notionUrl={task.metadata.notionUrl}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onCreated={() => {
            setShowNewTask(false)
            fetchTasks()
          }}
        />
      )}

      {/* Task Detail Drawer (mobile-friendly) */}
      <TaskDrawer
        task={drawerTask}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusChange={(taskId, status) => {
          updateTaskStatus(taskId, status)
          // Update drawer task if still open
          if (drawerTask?.id === taskId) {
            setDrawerTask({ ...drawerTask, status: status as Task["status"] })
          }
        }}
      />

      {/* Full Notion Task Detail Modal */}
      {detailModalTask?.metadata?.notionPageId && (
        <TaskDetailModal
          isOpen={!!detailModalTask}
          onClose={() => setDetailModalTask(null)}
          notionPageId={detailModalTask.metadata.notionPageId}
          taskTitle={detailModalTask.title}
          taskId={detailModalTask.id}
          companyId={detailModalTask.companyId}
          companyName={detailModalTask.companyName}
          onUpdate={() => fetchTasks()}
        />
      )}
    </DashboardLayout>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string
  value: number
  icon: React.ElementType
  variant?: "default" | "warning" | "info" | "success" | "error"
}) {
  const variantStyles = {
    default: {
      iconColor: "text-content-secondary",
      iconBg: "bg-bg-tertiary",
    },
    warning: {
      iconColor: "text-warning-600 dark:text-warning-500",
      iconBg: "bg-warning-100 dark:bg-warning-50",
    },
    info: {
      iconColor: "text-info-600 dark:text-info-500",
      iconBg: "bg-info-50 dark:bg-info-50",
    },
    success: {
      iconColor: "text-success-600 dark:text-success-500",
      iconBg: "bg-success-100 dark:bg-success-50",
    },
    error: {
      iconColor: "text-error-600 dark:text-error-500",
      iconBg: "bg-error-100 dark:bg-error-50",
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className="card-sf p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-content-secondary">{label}</span>
        <div className={cn("rounded-lg p-2", styles.iconBg)}>
          <Icon className={cn("h-5 w-5", styles.iconColor)} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-content-primary">
        {value}
      </p>
    </div>
  )
}

function NewTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [formData, setFormData] = useState({
    companyId: "",
    companyName: "",
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.companyId || !formData.title) return

    setSaving(true)
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate || null,
        }),
      })
      onCreated()
    } catch (error) {
      console.error("Failed to create task:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
      <div className="w-full max-w-lg rounded-xl bg-bg-elevated p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-content-primary">
          New Task
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-content-primary">
              Company ID *
            </label>
            <input
              type="text"
              value={formData.companyId}
              onChange={(e) =>
                setFormData({ ...formData, companyId: e.target.value })
              }
              className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="HubSpot Company ID"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-content-primary">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Company name"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-content-primary">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-content-primary">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Additional details..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-content-primary">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-content-primary">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.companyId || !formData.title}
              className="rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-24 shimmer rounded-xl"
        />
      ))}
    </div>
  )
}
