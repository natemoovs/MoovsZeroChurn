"use client"

import { useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  User,
  FileText,
  AlertTriangle,
  Calendar,
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
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Account Handoff
            </h2>
            <p className="text-sm text-zinc-500">{companyName}</p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2",
                    step >= s.id
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-400"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      step > s.id
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : step === s.id
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800"
                    )}
                  >
                    {step > s.id ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <s.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="hidden text-sm font-medium sm:inline">
                    {s.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="mx-4 h-4 w-4 text-zinc-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">Current Owner:</span>{" "}
                  {currentOwner.name} ({currentOwner.email})
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Transfer to:
                </label>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 text-zinc-500">
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
                              ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20"
                              : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                          )}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {user.name}
                            </p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          </div>
                          {newOwner?.id === user.id && (
                            <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
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
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Handoff Notes
                </label>
                <textarea
                  value={handoffNotes}
                  onChange={(e) => setHandoffNotes(e.target.value)}
                  rows={5}
                  placeholder="Key context, ongoing issues, relationship notes, upcoming milestones..."
                  className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
                        className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <button
                        onClick={() =>
                          setOpenItems(openItems.filter((_, j) => j !== i))
                        }
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setOpenItems([...openItems, ""])}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    + Add open item
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-100">
                  Handoff Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-zinc-500">From:</span>{" "}
                    <span className="font-medium">{currentOwner.name}</span>
                  </p>
                  <p>
                    <span className="text-zinc-500">To:</span>{" "}
                    <span className="font-medium">{newOwner?.name}</span>
                  </p>
                  {handoffNotes && (
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                      {handoffNotes}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={transferTasks}
                    onChange={(e) => setTransferTasks(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Transfer all open tasks to new owner
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={notifyStakeholders}
                    onChange={(e) => setNotifyStakeholders(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Notify stakeholders of CSM change
                  </span>
                </label>
              </div>

              {notifyStakeholders && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    An introduction email will be sent to mapped stakeholders
                    introducing {newOwner?.name} as their new CSM.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 p-6 dark:border-zinc-800">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onCancel?.())}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !newOwner}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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
