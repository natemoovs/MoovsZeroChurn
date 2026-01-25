"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Play,
  Pause,
  Plus,
  Trash2,
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
      setPlaybooks((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !isActive } : p)))
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
          <div className="shimmer h-8 w-48 rounded" />
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="shimmer h-48 rounded-xl" />
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
            <h1 className="text-content-primary text-xl font-bold sm:text-2xl">Playbooks</h1>
            <p className="text-content-secondary mt-1 text-sm sm:text-base">
              Automated workflows triggered by customer events
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-success-600 hover:bg-success-700 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            New Playbook
          </button>
        </div>

        {/* Playbooks Grid */}
        {playbooks.length === 0 ? (
          <div className="card-sf p-12 text-center">
            <div className="bg-success-100 dark:bg-success-900/30 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Zap className="text-success-600 dark:text-success-400 h-6 w-6" />
            </div>
            <h3 className="text-content-primary text-lg font-medium">No playbooks yet</h3>
            <p className="text-content-secondary mt-1">
              Create your first playbook to automate CSM workflows
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-success-600 hover:bg-success-700 mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
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
                    "bg-bg-elevated rounded-xl border p-5 transition-all",
                    playbook.isActive
                      ? "border-success-200 dark:border-success-900"
                      : "border-border-default opacity-60"
                  )}
                >
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          playbook.isActive
                            ? "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
                            : "bg-bg-secondary text-content-tertiary"
                        )}
                      >
                        <TriggerIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-content-primary font-semibold">{playbook.name}</h3>
                        <p className="text-content-secondary text-sm">
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
                            ? "text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-900/20"
                            : "text-content-tertiary hover:bg-bg-secondary"
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
                        className="text-content-tertiary hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/20 rounded-lg p-2 transition-colors"
                        title="Delete playbook"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {playbook.description && (
                    <p className="text-content-secondary mb-4 text-sm">{playbook.description}</p>
                  )}

                  {/* Actions */}
                  <div className="mb-4 space-y-2">
                    <p className="text-content-secondary text-xs font-medium tracking-wider uppercase">
                      Actions
                    </p>
                    {playbook.actions.map((action, i) => (
                      <div
                        key={i}
                        className="bg-bg-secondary flex items-center gap-2 rounded-lg p-2 text-sm"
                      >
                        <CheckSquare className="text-content-tertiary h-4 w-4" />
                        <span className="text-content-primary">Create task: {action.title}</span>
                        {action.priority && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-xs font-medium",
                              action.priority === "urgent" &&
                                "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
                              action.priority === "high" &&
                                "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
                              action.priority === "medium" &&
                                "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
                              action.priority === "low" && "bg-bg-secondary text-content-secondary"
                            )}
                          >
                            {action.priority}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="border-border-default flex items-center justify-between border-t pt-4">
                    <span className="text-content-secondary text-sm">
                      {playbook.taskCount} tasks created
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        playbook.isActive
                          ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                          : "bg-bg-secondary text-content-secondary"
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
      <div className="bg-bg-elevated max-h-[90vh] w-full overflow-y-auto rounded-t-xl p-4 sm:max-w-lg sm:rounded-xl sm:p-6">
        <h2 className="text-content-primary mb-4 text-xl font-semibold">Create Playbook</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-content-primary mb-1 block text-sm font-medium">
              Playbook Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., At-Risk Customer Outreach"
              className="border-border-default bg-bg-elevated focus:border-success-500 focus:ring-success-500/20 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-content-primary mb-1 block text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this playbook do?"
              rows={2}
              className="border-border-default bg-bg-elevated focus:border-success-500 focus:ring-success-500/20 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-content-primary mb-1 block text-sm font-medium">Trigger</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="border-border-default bg-bg-elevated focus:border-success-500 focus:ring-success-500/20 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
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
          <div className="border-border-default rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2">
              <CheckSquare className="text-success-600 h-4 w-4" />
              <span className="text-content-primary text-sm font-medium">Action: Create Task</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-content-secondary mb-1 block text-xs">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Schedule check-in call"
                  className="border-border-default bg-bg-elevated focus:border-success-500 focus:ring-success-500/20 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                  required
                />
              </div>

              <div>
                <label className="text-content-secondary mb-1 block text-xs">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as typeof taskPriority)}
                  className="border-border-default bg-bg-elevated focus:border-success-500 focus:ring-success-500/20 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
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
              className="text-content-secondary hover:bg-bg-secondary rounded-lg px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !trigger || !taskTitle}
              className="bg-success-600 hover:bg-success-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Playbook"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
