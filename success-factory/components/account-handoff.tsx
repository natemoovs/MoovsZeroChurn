"use client"

import { useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  User,
  FileText,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface HandoffProps {
  companyId: string
  companyName: string
  currentOwner: {
    email: string
    name: string
  }
  onComplete?: () => void
  onCancel?: () => void
}

interface NotionUser {
  id: string
  name: string
  email: string | null
}

export function AccountHandoff({
  companyId,
  companyName,
  currentOwner,
  onComplete,
  onCancel,
}: HandoffProps) {
  const [step, setStep] = useState(1)
  const [newOwner, setNewOwner] = useState<NotionUser | null>(null)
  const [users, setUsers] = useState<NotionUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [handoffNotes, setHandoffNotes] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])
  const [transferTasks, setTransferTasks] = useState(true)
  const [notifyStakeholders, setNotifyStakeholders] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch users when component mounts
  useState(() => {
    fetchUsers()
  })

  async function fetchUsers() {
    setLoadingUsers(true)
    try {
      const res = await fetch("/api/integrations/notion/users")
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  async function handleSubmit() {
    if (!newOwner) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/accounts/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          newOwnerEmail: newOwner.email,
          newOwnerName: newOwner.name,
          handoffNotes,
          openItems,
          transferTasks,
          notifyStakeholders,
        }),
      })

      if (!res.ok) throw new Error("Handoff failed")

      toast.success(`Account transferred to ${newOwner.name}`)
      onComplete?.()
    } catch (error) {
      console.error("Handoff error:", error)
      toast.error("Failed to complete handoff")
    } finally {
      setSubmitting(false)
    }
  }

  const steps = [
    { id: 1, title: "Select New Owner", icon: User },
    { id: 2, title: "Handoff Notes", icon: FileText },
    { id: 3, title: "Options & Confirm", icon: CheckCircle2 },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-elevated w-full max-w-2xl rounded-2xl shadow-xl">
        {/* Header */}
        <div className="border-border-default flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-content-primary text-lg font-semibold">Account Handoff</h2>
            <p className="text-content-secondary text-sm">{companyName}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-content-tertiary hover:bg-surface-hover hover:text-content-secondary rounded-lg p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="border-border-default border-b px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2",
                    step >= s.id
                      ? "text-success-600 dark:text-success-400"
                      : "text-content-tertiary"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      step > s.id
                        ? "bg-success-100 dark:bg-success-900/30"
                        : step === s.id
                          ? "bg-success-600 text-white"
                          : "bg-bg-tertiary"
                    )}
                  >
                    {step > s.id ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <s.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="hidden text-sm font-medium sm:inline">{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="text-content-tertiary mx-4 h-4 w-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-bg-tertiary rounded-lg p-4">
                <p className="text-content-secondary text-sm">
                  <span className="font-medium">Current Owner:</span> {currentOwner.name} (
                  {currentOwner.email})
                </p>
              </div>

              <div>
                <label className="text-content-secondary mb-2 block text-sm font-medium">
                  Transfer to:
                </label>
                {loadingUsers ? (
                  <div className="text-content-secondary flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading team members...</span>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {users
                      .filter((u) => u.email !== currentOwner.email)
                      .map((user) => (
                        <button
                          key={user.id}
                          onClick={() => setNewOwner(user)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                            newOwner?.id === user.id
                              ? "border-success-500 bg-success-50 dark:border-success-600 dark:bg-success-900/20"
                              : "border-border-default hover:border-border-default"
                          )}
                        >
                          <div className="from-success-400 to-accent-600 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-content-primary font-medium">{user.name}</p>
                            <p className="text-content-secondary text-xs">{user.email}</p>
                          </div>
                          {newOwner?.id === user.id && (
                            <CheckCircle2 className="text-success-500 ml-auto h-5 w-5" />
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-content-secondary mb-2 block text-sm font-medium">
                  Handoff Notes
                </label>
                <textarea
                  value={handoffNotes}
                  onChange={(e) => setHandoffNotes(e.target.value)}
                  rows={5}
                  placeholder="Key context, ongoing issues, relationship notes, upcoming milestones..."
                  className="border-border-default bg-bg-elevated text-content-primary focus:border-success-500 focus:ring-success-500 w-full rounded-lg border p-3 text-sm focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-content-secondary mb-2 block text-sm font-medium">
                  Open Items to Address
                </label>
                <div className="space-y-2">
                  {openItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newItems = [...openItems]
                          newItems[i] = e.target.value
                          setOpenItems(newItems)
                        }}
                        className="border-border-default bg-bg-elevated focus:border-success-500 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => setOpenItems(openItems.filter((_, j) => j !== i))}
                        className="text-content-tertiary hover:text-error-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setOpenItems([...openItems, ""])}
                    className="text-success-600 hover:text-success-700 text-sm"
                  >
                    + Add open item
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-bg-tertiary rounded-lg p-4">
                <h3 className="text-content-primary mb-3 font-medium">Handoff Summary</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-content-secondary">From:</span>{" "}
                    <span className="font-medium">{currentOwner.name}</span>
                  </p>
                  <p>
                    <span className="text-content-secondary">To:</span>{" "}
                    <span className="font-medium">{newOwner?.name}</span>
                  </p>
                  {handoffNotes && <p className="text-content-secondary mt-2">{handoffNotes}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={transferTasks}
                    onChange={(e) => setTransferTasks(e.target.checked)}
                    className="border-border-default text-success-600 focus:ring-success-500 h-4 w-4 rounded"
                  />
                  <span className="text-content-secondary text-sm">
                    Transfer all open tasks to new owner
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={notifyStakeholders}
                    onChange={(e) => setNotifyStakeholders(e.target.checked)}
                    className="border-border-default text-success-600 focus:ring-success-500 h-4 w-4 rounded"
                  />
                  <span className="text-content-secondary text-sm">
                    Notify stakeholders of CSM change
                  </span>
                </label>
              </div>

              {notifyStakeholders && (
                <div className="bg-warning-50 dark:bg-warning-900/20 flex items-start gap-2 rounded-lg p-3">
                  <AlertTriangle className="text-warning-500 h-5 w-5" />
                  <p className="text-warning-800 dark:text-warning-200 text-sm">
                    An introduction email will be sent to mapped stakeholders introducing{" "}
                    {newOwner?.name} as their new CSM.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border-default flex items-center justify-between border-t p-6">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onCancel?.())}
            className="border-border-default text-content-secondary hover:bg-surface-hover rounded-lg border px-4 py-2 text-sm font-medium"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !newOwner}
              className="bg-success-600 hover:bg-success-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-success-600 hover:bg-success-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Handoff
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
