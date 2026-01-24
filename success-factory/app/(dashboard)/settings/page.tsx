"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Bell,
  Mail,
  MessageSquare,
  Check,
  AlertTriangle,
  TrendingDown,
  CalendarClock,
  CreditCard,
  Moon,
  Save,
  Loader2,
  RefreshCw,
  Database,
  Clock,
  Plug,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationPreferences {
  channels: {
    slack: boolean
    email: boolean
  }
  alerts: {
    at_risk: boolean
    health_change: boolean
    renewal_upcoming: boolean
    payment_failed: boolean
    inactive: boolean
    journey_change: boolean
  }
  digest: {
    enabled: boolean
    frequency: "daily" | "weekly"
    channels: ("slack" | "email")[]
  }
}

interface IntegrationStatus {
  slack: { configured: boolean }
  email: { configured: boolean; provider: string | null }
}

interface SyncStatus {
  lastSync: {
    status: string
    recordsSynced: number
    recordsFailed: number
    completedAt: string
  } | null
  totalCompanies: number
  healthDistribution: Record<string, number>
}

interface IntegrationInfo {
  name: string
  description: string
  configured: boolean
  envVar: string
  docsUrl: string | null
}

interface IntegrationsStatus {
  integrations: Record<string, IntegrationInfo>
  summary: {
    configured: number
    total: number
    percentage: number
  }
}

const ALERT_TYPES = [
  { id: "at_risk", label: "At-Risk Alerts", description: "When an account drops to red health", icon: AlertTriangle },
  { id: "health_change", label: "Health Changes", description: "Any health score change", icon: TrendingDown },
  { id: "renewal_upcoming", label: "Renewal Reminders", description: "30/60/90 day renewal warnings", icon: CalendarClock },
  { id: "payment_failed", label: "Payment Issues", description: "Failed payments or billing problems", icon: CreditCard },
  { id: "inactive", label: "Inactivity Alerts", description: "Accounts with no recent activity", icon: Moon },
  { id: "journey_change", label: "Journey Updates", description: "Customer journey stage changes", icon: TrendingDown },
] as const

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    channels: { slack: true, email: false },
    alerts: {
      at_risk: true,
      health_change: true,
      renewal_upcoming: true,
      payment_failed: true,
      inactive: true,
      journey_change: false,
    },
    digest: {
      enabled: true,
      frequency: "daily",
      channels: ["slack"],
    },
  })
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null)
  const [integrationsStatus, setIntegrationsStatus] = useState<IntegrationsStatus | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/sync/hubspot")
      const data = await res.json()
      setSyncStatus(data)
    } catch (e) {
      console.error("Failed to fetch sync status:", e)
    }
  }

  useEffect(() => {
    // Fetch integration status and sync status
    Promise.all([
      fetch("/api/alerts/slack").then((r) => r.json()).catch(() => ({ configured: false })),
      fetch("/api/alerts/email").then((r) => r.json()).catch(() => ({ configured: false, provider: null })),
      fetch("/api/settings/notifications").then((r) => r.json()).catch(() => null),
      fetch("/api/sync/hubspot").then((r) => r.json()).catch(() => null),
      fetch("/api/integrations/status").then((r) => r.json()).catch(() => null),
    ]).then(([slack, email, savedPrefs, sync, intStatus]) => {
      setIntegrations({ slack, email })
      if (savedPrefs?.preferences) {
        setPreferences(savedPrefs.preferences)
      }
      if (sync) {
        setSyncStatus(sync)
      }
      if (intStatus) {
        setIntegrationsStatus(intStatus)
      }
      setLoading(false)
    })
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/sync/hubspot", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        // Refresh sync status
        await fetchSyncStatus()
      } else {
        console.error("Sync failed:", data.error)
      }
    } catch (e) {
      console.error("Sync error:", e)
    }
    setSyncing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error("Failed to save:", e)
    }
    setSaving(false)
  }

  const toggleChannel = (channel: "slack" | "email") => {
    setPreferences((p) => ({
      ...p,
      channels: { ...p.channels, [channel]: !p.channels[channel] },
    }))
  }

  const toggleAlert = (alert: keyof typeof preferences.alerts) => {
    setPreferences((p) => ({
      ...p,
      alerts: { ...p.alerts, [alert]: !p.alerts[alert] },
    }))
  }

  const toggleDigestChannel = (channel: "slack" | "email") => {
    setPreferences((p) => {
      const channels = p.digest.channels.includes(channel)
        ? p.digest.channels.filter((c) => c !== channel)
        : [...p.digest.channels, channel]
      return { ...p, digest: { ...p.digest, channels } }
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-96 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Settings
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Configure notifications and preferences
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              saved
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
              saving && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Notification Channels */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Notification Channels
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Slack */}
            <div
              className={cn(
                "rounded-lg border p-4 transition-all",
                preferences.channels.slack
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A154B]">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Slack</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {integrations?.slack.configured ? "Connected" : "Not configured"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleChannel("slack")}
                  disabled={!integrations?.slack.configured}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    preferences.channels.slack ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600",
                    !integrations?.slack.configured && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                      preferences.channels.slack && "translate-x-5"
                    )}
                  />
                </button>
              </div>
              {!integrations?.slack.configured && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  Set SLACK_WEBHOOK_URL to enable
                </p>
              )}
            </div>

            {/* Email */}
            <div
              className={cn(
                "rounded-lg border p-4 transition-all",
                preferences.channels.email
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Email</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {integrations?.email.configured
                        ? `Via ${integrations.email.provider}`
                        : "Not configured"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleChannel("email")}
                  disabled={!integrations?.email.configured}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    preferences.channels.email ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600",
                    !integrations?.email.configured && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                      preferences.channels.email && "translate-x-5"
                    )}
                  />
                </button>
              </div>
              {!integrations?.email.configured && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  Set RESEND_API_KEY to enable
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Alert Types */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Alert Types
            </h2>
          </div>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Choose which alerts you want to receive
          </p>

          <div className="space-y-3">
            {ALERT_TYPES.map((alert) => {
              const Icon = alert.icon
              const enabled = preferences.alerts[alert.id as keyof typeof preferences.alerts]

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4 transition-all",
                    enabled
                      ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                      : "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-5 w-5", enabled ? "text-emerald-500" : "text-zinc-400")} />
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{alert.label}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{alert.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAlert(alert.id as keyof typeof preferences.alerts)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                        enabled && "translate-x-5"
                      )}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Daily Digest */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Daily Digest
              </h2>
            </div>
            <button
              onClick={() =>
                setPreferences((p) => ({
                  ...p,
                  digest: { ...p.digest, enabled: !p.digest.enabled },
                }))
              }
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                preferences.digest.enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  preferences.digest.enabled && "translate-x-5"
                )}
              />
            </button>
          </div>

          {preferences.digest.enabled && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Receive a summary of portfolio health every weekday at 8 AM UTC
              </p>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Send digest via:
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleDigestChannel("slack")}
                    disabled={!integrations?.slack.configured}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      preferences.digest.channels.includes("slack")
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400",
                      !integrations?.slack.configured && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Slack
                    {preferences.digest.channels.includes("slack") && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleDigestChannel("email")}
                    disabled={!integrations?.email.configured}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      preferences.digest.channels.includes("email")
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400",
                      !integrations?.email.configured && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                    {preferences.digest.channels.includes("email") && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Integrations */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plug className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Integrations
              </h2>
            </div>
            {integrationsStatus && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {integrationsStatus.summary.configured} of {integrationsStatus.summary.total} configured
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Connect external services via API keys. Set the environment variables to enable each integration.
          </p>

          {integrationsStatus && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(integrationsStatus.integrations).map(([key, integration]) => (
                <div
                  key={key}
                  className={cn(
                    "rounded-lg border p-4 transition-all",
                    integration.configured
                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      {integration.name}
                    </h3>
                    {integration.configured ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    {integration.description}
                  </p>
                  {!integration.configured && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Set {integration.envVar}
                    </p>
                  )}
                  {integration.configured && integration.docsUrl && (
                    <a
                      href={integration.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Docs <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Sync */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-3">
            <Database className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              HubSpot Data Sync
            </h2>
          </div>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Sync customer data from HubSpot to the local database for faster portfolio loads.
            Automatic sync runs at 5am UTC daily.
          </p>

          {/* Sync Status */}
          {syncStatus && (
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {syncStatus.totalCompanies}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Companies Synced
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {syncStatus.healthDistribution.green || 0}
                  </span>
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {syncStatus.healthDistribution.yellow || 0}
                  </span>
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {syncStatus.healthDistribution.red || 0}
                  </span>
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Health Distribution
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium">
                    {syncStatus.lastSync?.completedAt
                      ? new Date(syncStatus.lastSync.completedAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Last Sync
                </div>
              </div>
            </div>
          )}

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
              syncing && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>

          {syncStatus?.lastSync?.status === "failed" && (
            <p className="mt-3 text-sm text-red-500">
              Last sync failed. Check logs for details.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
