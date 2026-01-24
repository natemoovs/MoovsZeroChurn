"use client"

import { useEffect, useState } from "react"
import {
  User,
  Crown,
  Briefcase,
  Users,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  X,
  UserX,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Stakeholder {
  id: string
  companyId: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
  role: string
  sentiment: string
  influence: string
  engagement: string
  lastContactAt: string | null
  notes: string | null
  isActive: boolean
  leftCompanyAt: string | null
}

interface StakeholderData {
  companyId: string
  companyName: string
  stakeholders: Stakeholder[]
  summary: {
    total: number
    active: number
    hasChampion: boolean
    hasDecisionMaker: boolean
    relationshipHealth: string
    sentimentBreakdown: {
      positive: number
      neutral: number
      negative: number
    }
  }
  alerts: string[]
}

interface StakeholderMapProps {
  companyId: string
  compact?: boolean
}

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: typeof User; color: string }
> = {
  champion: {
    label: "Champion",
    icon: Crown,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  decision_maker: {
    label: "Decision Maker",
    icon: Briefcase,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  executive_sponsor: {
    label: "Exec Sponsor",
    icon: Crown,
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  user: {
    label: "User",
    icon: User,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  influencer: {
    label: "Influencer",
    icon: Users,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
  detractor: {
    label: "Detractor",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
}

const SENTIMENT_ICONS = {
  positive: ThumbsUp,
  neutral: Minus,
  negative: ThumbsDown,
}

export function StakeholderMap({ companyId, compact = false }: StakeholderMapProps) {
  const [data, setData] = useState<StakeholderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/stakeholders/${companyId}`)
        const json = await res.json()
        if (!cancelled && !json.error) {
          setData(json)
        }
      } catch (e) {
        console.error("Failed to fetch stakeholders:", e)
      }
      if (!cancelled) setLoading(false)
    }
    fetchData()
    return () => { cancelled = true }
  }, [companyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  const healthColors = {
    strong: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    moderate: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    weak: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {data.summary.active} contacts
            </span>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              healthColors[data.summary.relationshipHealth as keyof typeof healthColors]
            )}
          >
            {data.summary.relationshipHealth}
          </span>
        </div>
        {data.alerts.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {data.alerts[0]}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Key Stakeholders
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {data.summary.active} active contacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium capitalize",
              healthColors[data.summary.relationshipHealth as keyof typeof healthColors]
            )}
          >
            {data.summary.relationshipHealth}
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Stakeholder List */}
      {data.stakeholders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
          <Users className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No stakeholders mapped yet
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            Add first contact
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {data.stakeholders.map((stakeholder) => {
            const config = ROLE_CONFIG[stakeholder.role] || ROLE_CONFIG.user
            const RoleIcon = config.icon
            const SentimentIcon =
              SENTIMENT_ICONS[stakeholder.sentiment as keyof typeof SENTIMENT_ICONS] ||
              SENTIMENT_ICONS.neutral
            const isExpanded = expandedId === stakeholder.id

            return (
              <div
                key={stakeholder.id}
                className={cn(
                  "rounded-lg border transition-all",
                  !stakeholder.isActive
                    ? "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                )}
              >
                <div
                  className="flex cursor-pointer items-center gap-3 p-3"
                  onClick={() => setExpandedId(isExpanded ? null : stakeholder.id)}
                >
                  {/* Role Icon */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      config.color
                    )}
                  >
                    <RoleIcon className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {stakeholder.name}
                      </p>
                      {!stakeholder.isActive && (
                        <span className="flex items-center gap-1 rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                          <UserX className="h-3 w-3" />
                          Left
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {stakeholder.title || config.label}
                    </p>
                  </div>

                  {/* Sentiment */}
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      stakeholder.sentiment === "positive"
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : stakeholder.sentiment === "negative"
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    )}
                  >
                    <SentimentIcon className="h-4 w-4" />
                  </div>

                  <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      {stakeholder.email && (
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                          <Mail className="h-4 w-4" />
                          <a
                            href={`mailto:${stakeholder.email}`}
                            className="hover:text-emerald-600"
                          >
                            {stakeholder.email}
                          </a>
                        </div>
                      )}
                      {stakeholder.phone && (
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                          <Phone className="h-4 w-4" />
                          {stakeholder.phone}
                        </div>
                      )}
                      <div className="text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium">Influence:</span>{" "}
                        <span className="capitalize">{stakeholder.influence}</span>
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium">Engagement:</span>{" "}
                        <span className="capitalize">{stakeholder.engagement}</span>
                      </div>
                    </div>
                    {stakeholder.notes && (
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {stakeholder.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddStakeholderModal
          companyId={companyId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

function AddStakeholderModal({
  companyId,
  onClose,
  onAdded,
}: {
  companyId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    role: "user",
    sentiment: "neutral",
    influence: "medium",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.role) return

    setSaving(true)
    try {
      const res = await fetch(`/api/stakeholders/${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        onAdded()
      }
    } catch (e) {
      console.error("Failed to add stakeholder:", e)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-4 sm:max-w-md sm:rounded-xl sm:p-6 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Add Stakeholder
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Role *
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="champion">Champion</option>
                <option value="decision_maker">Decision Maker</option>
                <option value="executive_sponsor">Executive Sponsor</option>
                <option value="user">User</option>
                <option value="influencer">Influencer</option>
                <option value="detractor">Detractor</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Sentiment
              </label>
              <select
                value={form.sentiment}
                onChange={(e) => setForm({ ...form, sentiment: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

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
              disabled={saving || !form.name}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Stakeholder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
