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
  Trash2,
  ListTodo,
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
  const [cleaningUp, setCleaningUp] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<{
    deleted: number
    checked: number
    deletedTasks?: string[]
  } | null>(null)

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

  const handleNotionCleanup = async () => {
    if (!confirm("This will delete tasks that no longer exist in the configured Notion database. Continue?")) {
      return
    }
    setCleaningUp(true)
    setCleanupResult(null)
    try {
      const res = await fetch("/api/integrations/notion/tasks/cleanup", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setCleanupResult({
          deleted: data.deleted,
          checked: data.checked,
          deletedTasks: data.deletedTasks,
        })
      } else {
        console.error("Cleanup failed:", data.error)
      }
    } catch (e) {
      console.error("Cleanup error:", e)
    }
    setCleaningUp(false)
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
          <div className="shimmer h-8 w-48 rounded" />
          <div className="shimmer h-64 rounded-xl" />
          <div className="shimmer h-96 rounded-xl" />
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
            <h1 className="text-xl font-bold text-content-primary sm:text-2xl">
              Settings
            </h1>
            <p className="mt-1 text-sm text-content-secondary sm:text-base">
              Configure notifications and preferences
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all sm:w-auto",
              saved
                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                : "bg-success-600 text-white hover:bg-success-700",
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
        <div className="card-sf p-6">
          <div className="mb-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-content-tertiary" />
            <h2 className="text-lg font-semibold text-content-primary">
              Notification Channels
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Slack */}
            <div
              className={cn(
                "rounded-lg border p-4 transition-all",
                preferences.channels.slack
                  ? "border-success-200 bg-success-50/50 dark:border-success-900 dark:bg-success-950/20"
                  : "border-border-default bg-bg-secondary"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A154B]">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-content-primary">Slack</h3>
                    <p className="text-sm text-content-secondary">
                      {integrations?.slack.configured ? "Connected" : "Not configured"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleChannel("slack")}
                  disabled={!integrations?.slack.configured}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    preferences.channels.slack ? "bg-success-500" : "bg-bg-tertiary",
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
                <p className="mt-3 text-xs text-warning-600 dark:text-warning-400">
                  Set SLACK_WEBHOOK_URL to enable
                </p>
              )}
            </div>

            {/* Email */}
            <div
              className={cn(
                "rounded-lg border p-4 transition-all",
                preferences.channels.email
                  ? "border-success-200 bg-success-50/50 dark:border-success-900 dark:bg-success-950/20"
                  : "border-border-default bg-bg-secondary"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-content-primary">Email</h3>
                    <p className="text-sm text-content-secondary">
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
                    preferences.channels.email ? "bg-success-500" : "bg-bg-tertiary",
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
                <p className="mt-3 text-xs text-warning-600 dark:text-warning-400">
                  Set RESEND_API_KEY to enable
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Alert Types */}
        <div className="card-sf p-6">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-content-tertiary" />
            <h2 className="text-lg font-semibold text-content-primary">
              Alert Types
            </h2>
          </div>
          <p className="mb-4 text-sm text-content-secondary">
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
                      ? "border-border-default bg-bg-elevated"
                      : "border-border-default bg-bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-5 w-5", enabled ? "text-success-500" : "text-content-tertiary")} />
                    <div>
                      <h3 className="font-medium text-content-primary">{alert.label}</h3>
                      <p className="text-sm text-content-secondary">{alert.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAlert(alert.id as keyof typeof preferences.alerts)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      enabled ? "bg-success-500" : "bg-bg-tertiary"
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
        <div className="card-sf p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-content-tertiary" />
              <h2 className="text-lg font-semibold text-content-primary">
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
                preferences.digest.enabled ? "bg-success-500" : "bg-bg-tertiary"
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
              <p className="text-sm text-content-secondary">
                Receive a summary of portfolio health every weekday at 8 AM UTC
              </p>

              <div>
                <label className="mb-2 block text-sm font-medium text-content-primary">
                  Send digest via:
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleDigestChannel("slack")}
                    disabled={!integrations?.slack.configured}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      preferences.digest.channels.includes("slack")
                        ? "border-success-500 bg-success-50 text-success-700 dark:bg-success-950/30 dark:text-success-400"
                        : "border-border-default text-content-secondary hover:border-border-hover",
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
                        ? "border-success-500 bg-success-50 text-success-700 dark:bg-success-950/30 dark:text-success-400"
                        : "border-border-default text-content-secondary hover:border-border-hover",
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
        <div className="card-sf p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plug className="h-5 w-5 text-content-tertiary" />
              <h2 className="text-lg font-semibold text-content-primary">
                Integrations
              </h2>
            </div>
            {integrationsStatus && (
              <span className="text-sm text-content-secondary">
                {integrationsStatus.summary.configured} of {integrationsStatus.summary.total} configured
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-content-secondary">
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
                      ? "border-success-200 bg-success-50/50 dark:border-success-900/50 dark:bg-success-950/20"
                      : "border-border-default bg-bg-secondary"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-content-primary">
                      {integration.name}
                    </h3>
                    {integration.configured ? (
                      <CheckCircle2 className="h-4 w-4 text-success-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-content-tertiary" />
                    )}
                  </div>
                  <p className="text-xs text-content-secondary mb-2">
                    {integration.description}
                  </p>
                  {!integration.configured && (
                    <p className="text-xs text-warning-600 dark:text-warning-400">
                      Set {integration.envVar}
                    </p>
                  )}
                  {integration.configured && integration.docsUrl && (
                    <a
                      href={integration.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-success-600 hover:underline dark:text-success-400"
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
        <div className="card-sf p-6">
          <div className="mb-4 flex items-center gap-3">
            <Database className="h-5 w-5 text-content-tertiary" />
            <h2 className="text-lg font-semibold text-content-primary">
              HubSpot Data Sync
            </h2>
          </div>
          <p className="mb-4 text-sm text-content-secondary">
            Sync customer data from HubSpot to the local database for faster portfolio loads.
            Automatic sync runs at 5am UTC daily.
          </p>

          {/* Sync Status */}
          {syncStatus && (
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
                <div className="text-2xl font-bold text-content-primary">
                  {syncStatus.totalCompanies}
                </div>
                <div className="text-sm text-content-secondary">
                  Companies Synced
                </div>
              </div>

              <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-success-500" />
                  <span className="text-lg font-semibold text-content-primary">
                    {syncStatus.healthDistribution.green || 0}
                  </span>
                  <span className="h-3 w-3 rounded-full bg-warning-500" />
                  <span className="text-lg font-semibold text-content-primary">
                    {syncStatus.healthDistribution.yellow || 0}
                  </span>
                  <span className="h-3 w-3 rounded-full bg-error-500" />
                  <span className="text-lg font-semibold text-content-primary">
                    {syncStatus.healthDistribution.red || 0}
                  </span>
                </div>
                <div className="text-sm text-content-secondary">
                  Health Distribution
                </div>
              </div>

              <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
                <div className="flex items-center gap-2 text-content-primary">
                  <Clock className="h-4 w-4 text-content-tertiary" />
                  <span className="text-sm font-medium">
                    {syncStatus.lastSync?.completedAt
                      ? new Date(syncStatus.lastSync.completedAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <div className="text-sm text-content-secondary">
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
            <p className="mt-3 text-sm text-error-500">
              Last sync failed. Check logs for details.
            </p>
          )}
        </div>

        {/* Notion Tasks */}
        <div className="card-sf p-6">
          <div className="mb-4 flex items-center gap-3">
            <ListTodo className="h-5 w-5 text-content-tertiary" />
            <h2 className="text-lg font-semibold text-content-primary">
              Notion Tasks
            </h2>
          </div>
          <p className="mb-4 text-sm text-content-secondary">
            Manage tasks synced from Notion. Use cleanup to remove orphaned tasks when switching databases.
          </p>

          {/* Cleanup Result */}
          {cleanupResult && (
            <div className="mb-4 rounded-lg border border-success-200 bg-success-50 p-4 dark:border-success-900/50 dark:bg-success-950/30">
              <p className="font-medium text-success-800 dark:text-success-200">
                Cleanup complete: {cleanupResult.deleted} tasks deleted ({cleanupResult.checked} checked)
              </p>
              {cleanupResult.deletedTasks && cleanupResult.deletedTasks.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-success-700 dark:text-success-300">Deleted tasks:</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-success-600 dark:text-success-400">
                    {cleanupResult.deletedTasks.slice(0, 5).map((title, i) => (
                      <li key={i} className="truncate">{title}</li>
                    ))}
                    {cleanupResult.deletedTasks.length > 5 && (
                      <li>...and {cleanupResult.deletedTasks.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Cleanup Button */}
          <button
            onClick={handleNotionCleanup}
            disabled={cleaningUp}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              "border border-error-200 bg-error-50 text-error-700 hover:bg-error-100",
              "dark:border-error-900/50 dark:bg-error-950/30 dark:text-error-400 dark:hover:bg-error-950/50",
              cleaningUp && "opacity-50 cursor-not-allowed"
            )}
          >
            {cleaningUp ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {cleaningUp ? "Cleaning up..." : "Cleanup Orphaned Tasks"}
          </button>
          <p className="mt-2 text-xs text-content-secondary">
            Removes tasks that exist locally but not in the configured Notion database
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
