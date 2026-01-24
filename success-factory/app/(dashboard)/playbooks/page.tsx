"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Play,
  Pause,
  Plus,
  Trash2,
  ChevronRight,
  Zap,
  CheckSquare,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Playbook {
  id: string
  name: string
  description: string | null
  trigger: string
  isActive: boolean
  actions: PlaybookAction[]
  taskCount: number
  createdAt: string
}

interface PlaybookAction {
  type: "create_task"
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueInDays?: number
}

interface TriggerType {
  label: string
  description: string
}

const TRIGGER_ICONS: Record<string, typeof AlertTriangle> = {
  health_drops_to_red: AlertTriangle,
  health_drops_to_yellow: AlertTriangle,
  inactive_30_days: Clock,
  inactive_60_days: Clock,
  low_usage: Users,
  new_customer: Users,
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [triggerTypes, setTriggerTypes] = useState<Record<string, TriggerType>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchPlaybooks()
  }, [])

  async function fetchPlaybooks() {
    try {
      const res = await fetch("/api/playbooks")
      const data = await res.json()
      setPlaybooks(data.playbooks || [])
      setTriggerTypes(data.triggerTypes || {})
    } catch (error) {
      console.error("Failed to fetch playbooks:", error)
    } finally {
      setLoading(false)
    }
  }

  async function togglePlaybook(id: string, isActive: boolean) {
    try {
      await fetch(`/api/playbooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      setPlaybooks((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !isActive } : p))
      )
    } catch (error) {
      console.error("Failed to toggle playbook:", error)
    }
  }

  async function deletePlaybook(id: string) {
    if (!confirm("Are you sure you want to delete this playbook?")) return

    try {
      await fetch(`/api/playbooks/${id}`, { method: "DELETE" })
      setPlaybooks((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error("Failed to delete playbook:", error)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
              Playbooks
            </h1>
            <p className="mt-1 text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
              Automated workflows triggered by customer events
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            New Playbook
          </button>
        </div>

        {/* Playbooks Grid */}
        {playbooks.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Zap className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No playbooks yet
            </h3>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Create your first playbook to automate CSM workflows
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Create Playbook
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {playbooks.map((playbook) => {
              const TriggerIcon = TRIGGER_ICONS[playbook.trigger] || Zap
              const triggerInfo = triggerTypes[playbook.trigger]

              return (
                <div
                  key={playbook.id}
                  className={cn(
                    "rounded-xl border bg-white p-5 transition-all dark:bg-zinc-900",
                    playbook.isActive
                      ? "border-emerald-200 dark:border-emerald-900"
                      : "border-zinc-200 opacity-60 dark:border-zinc-800"
                  )}
                >
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          playbook.isActive
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                        )}
                      >
                        <TriggerIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {playbook.name}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {triggerInfo?.label || playbook.trigger}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePlaybook(playbook.id, playbook.isActive)}
                        className={cn(
                          "rounded-lg p-2 transition-colors",
                          playbook.isActive
                            ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                            : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                        title={playbook.isActive ? "Pause playbook" : "Activate playbook"}
                      >
                        {playbook.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => deletePlaybook(playbook.id)}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        title="Delete playbook"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {playbook.description && (
                    <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {playbook.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Actions
                    </p>
                    {playbook.actions.map((action, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg bg-zinc-50 p-2 text-sm dark:bg-zinc-800"
                      >
                        <CheckSquare className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-700 dark:text-zinc-300">
                          Create task: {action.title}
                        </span>
                        {action.priority && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-xs font-medium",
                              action.priority === "urgent" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                              action.priority === "high" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                              action.priority === "medium" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                              action.priority === "low" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                            )}
                          >
                            {action.priority}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {playbook.taskCount} tasks created
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        playbook.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}
                    >
                      {playbook.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePlaybookModal
          triggerTypes={triggerTypes}
          onClose={() => setShowCreateModal(false)}
          onCreated={(playbook) => {
            setPlaybooks((prev) => [playbook, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
    </DashboardLayout>
  )
}

function CreatePlaybookModal({
  triggerTypes,
  onClose,
  onCreated,
}: {
  triggerTypes: Record<string, TriggerType>
  onClose: () => void
  onCreated: (playbook: Playbook) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [trigger, setTrigger] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !trigger || !taskTitle) return

    setSaving(true)
    try {
      const res = await fetch("/api/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          trigger,
          actions: [
            {
              type: "create_task",
              title: taskTitle,
              priority: taskPriority,
            },
          ],
        }),
      })

      if (res.ok) {
        const playbook = await res.json()
        onCreated({ ...playbook, taskCount: 0 })
      }
    } catch (error) {
      console.error("Failed to create playbook:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-4 sm:max-w-lg sm:rounded-xl sm:p-6 dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Create Playbook
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Playbook Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., At-Risk Customer Outreach"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this playbook do?"
              rows={2}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Trigger
            </label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              required
            >
              <option value="">Select a trigger...</option>
              {Object.entries(triggerTypes).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Action: Create Task */}
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="mb-3 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Action: Create Task
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Schedule check-in call"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as typeof taskPriority)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !trigger || !taskTitle}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Playbook"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
