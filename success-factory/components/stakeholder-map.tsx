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
    color: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
  },
  decision_maker: {
    label: "Decision Maker",
    icon: Briefcase,
    color: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
  },
  executive_sponsor: {
    label: "Exec Sponsor",
    icon: Crown,
    color: "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400",
  },
  user: {
    label: "User",
    icon: User,
    color: "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400",
  },
  influencer: {
    label: "Influencer",
    icon: Users,
    color: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400",
  },
  detractor: {
    label: "Detractor",
    icon: AlertTriangle,
    color: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
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

  const fetchStakeholders = async () => {
    try {
      const res = await fetch(`/api/stakeholders/${companyId}`)
      const json = await res.json()
      if (!json.error) {
        setData(json)
      }
    } catch (e) {
      console.error("Failed to fetch stakeholders:", e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStakeholders()
  }, [companyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-content-tertiary" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  const healthColors = {
    strong: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
    moderate: "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400",
    weak: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
    critical: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-content-tertiary" />
            <span className="text-sm font-medium text-content-secondary">
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
          <div className="rounded-lg bg-warning-50 p-2 text-xs text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
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
          <h3 className="font-semibold text-content-primary">
            Key Stakeholders
          </h3>
          <p className="text-sm text-content-secondary">
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
            className="rounded-lg p-2 text-content-tertiary hover:bg-surface-hover hover:text-content-primary"
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
              className="flex items-start gap-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-700 dark:bg-warning-900/20 dark:text-warning-400"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Stakeholder List */}
      {data.stakeholders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-default p-6 text-center">
          <Users className="mx-auto mb-2 h-8 w-8 text-content-tertiary" />
          <p className="text-sm text-content-secondary">
            No stakeholders mapped yet
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 text-sm font-medium text-success-600 hover:text-success-700 dark:text-success-400"
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
                    ? "border-border-default bg-bg-tertiary opacity-60"
                    : "border-border-default bg-bg-elevated"
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
                      <p className="font-medium text-content-primary">
                        {stakeholder.name}
                      </p>
                      {!stakeholder.isActive && (
                        <span className="flex items-center gap-1 rounded bg-bg-tertiary px-1.5 py-0.5 text-xs text-content-secondary">
                          <UserX className="h-3 w-3" />
                          Left
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-content-secondary">
                      {stakeholder.title || config.label}
                    </p>
                  </div>

                  {/* Sentiment */}
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      stakeholder.sentiment === "positive"
                        ? "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
                        : stakeholder.sentiment === "negative"
                        ? "bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400"
                        : "bg-bg-tertiary text-content-tertiary"
                    )}
                  >
                    <SentimentIcon className="h-4 w-4" />
                  </div>

                  <MoreHorizontal className="h-4 w-4 text-content-tertiary" />
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border-default p-3">
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      {stakeholder.email && (
                        <div className="flex items-center gap-2 text-content-secondary">
                          <Mail className="h-4 w-4" />
                          <a
                            href={`mailto:${stakeholder.email}`}
                            className="hover:text-success-600"
                          >
                            {stakeholder.email}
                          </a>
                        </div>
                      )}
                      {stakeholder.phone && (
                        <div className="flex items-center gap-2 text-content-secondary">
                          <Phone className="h-4 w-4" />
                          {stakeholder.phone}
                        </div>
                      )}
                      <div className="text-content-secondary">
                        <span className="font-medium">Influence:</span>{" "}
                        <span className="capitalize">{stakeholder.influence}</span>
                      </div>
                      <div className="text-content-secondary">
                        <span className="font-medium">Engagement:</span>{" "}
                        <span className="capitalize">{stakeholder.engagement}</span>
                      </div>
                    </div>
                    {stakeholder.notes && (
                      <p className="mt-2 text-sm text-content-secondary">
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
            fetchStakeholders()
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
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-bg-elevated p-4 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-content-primary">
            Add Stakeholder
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-content-tertiary hover:bg-surface-hover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-content-secondary">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-content-secondary">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-content-secondary">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-content-secondary">
                Role *
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20"
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
              <label className="mb-1 block text-sm font-medium text-content-secondary">
                Sentiment
              </label>
              <select
                value={form.sentiment}
                onChange={(e) => setForm({ ...form, sentiment: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20"
              >
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-content-secondary">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name}
              className="rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Stakeholder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
