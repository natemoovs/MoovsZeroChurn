"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "@/lib/auth/client"

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

  // Get current user's email for "My Tasks" filter
  const currentUserEmail = data?.user?.email

  useEffect(() => {
    fetchTasks()
    fetchNotionUsers()
  }, [filter])

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
      const assigneeName = task.metadata?.notionAssigneeName?.toLowerCase() || ""
      const ownerEmail = task.ownerEmail?.toLowerCase() || ""
      return assigneeName.includes(userFirstName) || ownerEmail.includes(userFirstName)
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
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  async function updateTaskAssignee(taskId: string, notionUserId: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notionAssigneeId: notionUserId }),
      })
      fetchTasks()
    } catch (error) {
      console.error("Failed to update task assignee:", error)
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
      }
    } catch (error) {
      console.error("Failed to sync from Notion:", error)
    } finally {
      setSyncing(false)
    }
  }

  const priorityColors = {
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Tasks
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Manage your CSM action items and playbook tasks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncFromNotion}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title="Sync tasks from Notion"
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Syncing..." : "Sync"}
            </button>
            <button
              onClick={() => setShowNewTask(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
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
              color="zinc"
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              label="In Progress"
              value={stats.inProgress}
              icon={PlayCircle}
              color="blue"
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              icon={CheckCircle2}
              color="green"
            />
            <StatCard
              label="Overdue"
              value={stats.overdue}
              icon={AlertTriangle}
              color="red"
            />
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Assignee Filter */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
              <Filter className="h-4 w-4 text-zinc-400" />
              <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                {(["all", "pending", "in_progress", "completed"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      filter === f
                        ? "bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-zinc-100"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    )}
                  >
                    {f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <TaskListSkeleton />
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              No tasks found
            </h3>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
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
            {filteredTasks.map((task) => {
              const StatusIcon = statusIcons[task.status]
              const isOverdue =
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                task.status !== "completed"

              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border bg-white p-4 transition-colors dark:bg-zinc-900",
                    task.status === "completed"
                      ? "border-zinc-100 opacity-60 dark:border-zinc-800"
                      : isOverdue
                      ? "border-red-200 dark:border-red-900"
                      : "border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  {/* Status Toggle */}
                  <button
                    onClick={() =>
                      updateTaskStatus(
                        task.id,
                        task.status === "completed" ? "pending" : "completed"
                      )
                    }
                    className="mt-0.5 flex-shrink-0"
                  >
                    <StatusIcon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        task.status === "completed"
                          ? "text-emerald-500"
                          : task.status === "in_progress"
                          ? "text-blue-500"
                          : "text-zinc-300 hover:text-zinc-400 dark:text-zinc-600"
                      )}
                    />
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3
                          className={cn(
                            "font-medium",
                            task.status === "completed"
                              ? "text-zinc-500 line-through dark:text-zinc-400"
                              : "text-zinc-900 dark:text-zinc-100"
                          )}
                        >
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
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
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <Link
                        href={`/accounts/${task.companyId}`}
                        className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        <Building2 className="h-4 w-4" />
                        {task.companyName}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>

                      {task.dueDate && (
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            isOverdue && "text-red-600 dark:text-red-400"
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
                          className="rounded border-0 bg-transparent py-0 pl-0 pr-6 text-sm text-zinc-500 focus:ring-1 focus:ring-emerald-500 dark:text-zinc-400"
                        >
                          <option value="">
                            {task.metadata?.notionAssigneeName || task.ownerEmail || "Unassigned"}
                          </option>
                          {notionUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {task.playbook && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          {task.playbook.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
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
    </DashboardLayout>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: "zinc" | "yellow" | "blue" | "green" | "red"
}) {
  const colors = {
    zinc: "text-zinc-500",
    yellow: "text-yellow-500",
    blue: "text-blue-500",
    green: "text-emerald-500",
    red: "text-red-500",
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        <Icon className={cn("h-5 w-5", colors[color])} />
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          New Task
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Company ID *
            </label>
            <input
              type="text"
              value={formData.companyId}
              onChange={(e) =>
                setFormData({ ...formData, companyId: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="HubSpot Company ID"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Company name"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Additional details..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.companyId || !formData.title}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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
          className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  )
}
