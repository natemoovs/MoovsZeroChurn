"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useSession } from "@/lib/auth/client"
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  DollarSign,
  CreditCard,
  Users,
  Car,
  TrendingUp,
  Calendar,
  Shield,
  Settings,
  FileText,
  Mail,
  BarChart3,
  Clock,
  RefreshCw,
  ChevronRight,
  Phone,
  MessageSquare,
  Clipboard,
  Globe,
  Bell,
  Plus,
  History,
  CreditCard as CreditCardIcon,
  Edit3,
  Tag,
  MapPin,
  Zap,
  Percent,
  Landmark,
  Receipt,
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface ContactInfo {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  jobTitle: string | null
}

interface OperatorData {
  // Core identifiers
  id: string
  hubspotId: string
  operatorId: string | null
  stripeAccountId: string | null
  name: string
  domain: string | null

  // Billing & Revenue
  plan: string | null
  planCode: string | null
  mrr: number | null
  subscriptionStatus: string | null

  // Health
  healthScore: string | null
  numericHealthScore: number | null
  paymentHealth: string | null
  riskSignals: string[]
  positiveSignals: string[]

  // Usage metrics
  totalTrips: number | null
  tripsLast30Days: number | null
  vehiclesTotal: number | null
  driversCount: number | null
  membersCount: number | null
  setupScore: number | null

  // Engagement
  daysSinceLastLogin: number | null
  engagementStatus: string | null
  lastTripCreatedAt: string | null

  // Location
  city: string | null
  state: string | null
  country: string | null

  // CSM
  ownerName: string | null
  ownerEmail: string | null

  // Team/Contacts
  contacts: ContactInfo[]

  // Timestamps
  lastSyncedAt: string | null
}

type TabId =
  | "overview"
  | "payments"
  | "risk"
  | "quotes"
  | "features"
  | "activity"
  | "trips"
  | "tickets"
  | "emails"
  | "feedback"
  | "history"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "risk", label: "Risk", icon: Shield },
  { id: "quotes", label: "Quotes", icon: FileText },
  { id: "features", label: "Features", icon: Settings },
  { id: "activity", label: "Activity", icon: BarChart3 },
  { id: "trips", label: "Trips", icon: Car },
  { id: "tickets", label: "Tickets", icon: FileText },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "history", label: "History", icon: History },
]

// ============================================================================
// Helper Components
// ============================================================================

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-content-tertiary hover:text-content-primary inline-flex items-center gap-1 text-xs transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="text-success-500 h-3 w-3" /> : <Copy className="h-3 w-3" />}
      <span className="sr-only">Copy {label}</span>
    </button>
  )
}

function CopyActionButton({
  text,
  label,
  disabled,
}: {
  text: string
  label: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (disabled || !text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
        disabled
          ? "cursor-not-allowed border-border-default bg-bg-tertiary text-content-tertiary"
          : copied
            ? "border-success-500 bg-success-50 text-success-700 dark:border-success-600 dark:bg-success-950/30 dark:text-success-400"
            : "border-border-default hover:bg-surface-hover"
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
      {copied ? "Copied!" : label}
    </button>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  subtext,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  variant?: "default" | "success" | "warning" | "danger"
  subtext?: string
}) {
  return (
    <div className="card-sf p-4">
      <div className="flex items-center justify-between">
        <span className="text-content-secondary text-sm">{label}</span>
        <Icon
          className={cn(
            "h-5 w-5",
            variant === "success" && "text-success-500",
            variant === "warning" && "text-warning-500",
            variant === "danger" && "text-error-500",
            variant === "default" && "text-content-tertiary"
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold",
          variant === "success" && "text-success-600 dark:text-success-500",
          variant === "warning" && "text-warning-600 dark:text-warning-500",
          variant === "danger" && "text-error-600 dark:text-error-500",
          variant === "default" && "text-content-primary"
        )}
      >
        {value}
      </p>
      {subtext && <p className="text-content-tertiary mt-1 text-xs">{subtext}</p>}
    </div>
  )
}

function getHealthColor(health: string | null) {
  switch (health?.toLowerCase()) {
    case "green":
      return "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
    case "yellow":
      return "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
    case "red":
      return "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
    default:
      return "bg-bg-tertiary text-content-tertiary"
  }
}

// ============================================================================
// Tab Content Components
// ============================================================================

interface EmailHealthData {
  status: "healthy" | "warning" | "critical" | "unknown"
  hasRecentEmails: boolean
  failedCount: number
  successCount: number
  message: string
}

function EmailHealthAlert({ operatorId }: { operatorId: string | null }) {
  const [health, setHealth] = useState<EmailHealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!operatorId) {
      setLoading(false)
      return
    }

    fetch(`/api/operator-hub/${operatorId}/email-logs?limit=100`)
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (data?.health) {
          setHealth(data.health)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [operatorId])

  // Only show alert for warning or critical status
  if (loading || !health || health.status === "healthy" || health.status === "unknown") {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        health.status === "critical"
          ? "border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-950/30"
          : "border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-950/30"
      )}
    >
      <Bell
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          health.status === "critical"
            ? "text-error-600 dark:text-error-400"
            : "text-warning-600 dark:text-warning-400"
        )}
      />
      <div className="flex-1">
        <h4
          className={cn(
            "font-semibold",
            health.status === "critical"
              ? "text-error-700 dark:text-error-400"
              : "text-warning-700 dark:text-warning-400"
          )}
        >
          {health.status === "critical" ? "Email Delivery Issue" : "Email Configuration Warning"}
        </h4>
        <p
          className={cn(
            "mt-1 text-sm",
            health.status === "critical"
              ? "text-error-600 dark:text-error-500"
              : "text-warning-600 dark:text-warning-500"
          )}
        >
          {health.message}
        </p>
        {health.failedCount > 0 && (
          <p
            className={cn(
              "mt-1 text-xs",
              health.status === "critical"
                ? "text-error-600/80 dark:text-error-500/80"
                : "text-warning-600/80 dark:text-warning-500/80"
            )}
          >
            {health.failedCount} failed / {health.successCount} successful emails
          </p>
        )}
      </div>
    </div>
  )
}

function OverviewTab({ operator }: { operator: OperatorData }) {
  const location = [operator.city, operator.state, operator.country].filter(Boolean).join(", ")
  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const [bookingPortalUrl, setBookingPortalUrl] = useState<string | null>(null)

  // Fetch booking portal URL from platform data
  useEffect(() => {
    if (!operator.operatorId) return

    fetch(`/api/operator-hub/${operator.operatorId}/platform-data`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.operatorInfo?.bookingPortalUrl) {
          setBookingPortalUrl(data.operatorInfo.bookingPortalUrl)
        }
      })
      .catch(() => {
        // Silently fail - we'll fall back to domain if available
      })
  }, [operator.operatorId])

  const handlePlanChangeSuccess = () => {
    // Refresh the page to get updated plan info
    window.location.reload()
  }

  // Use booking portal URL from Snowflake, fall back to domain from HubSpot
  const customerPortalUrl = bookingPortalUrl || (operator.domain ? `https://${operator.domain}` : null)

  return (
    <div className="space-y-6">
      {/* Email Health Alert */}
      <EmailHealthAlert operatorId={operator.operatorId} />

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly Revenue"
          value={operator.mrr ? `$${operator.mrr.toLocaleString()}` : "—"}
          icon={DollarSign}
          variant={operator.mrr && operator.mrr > 500 ? "success" : "default"}
        />
        <StatCard
          label="Total Trips"
          value={operator.totalTrips?.toLocaleString() || "—"}
          icon={TrendingUp}
          subtext={
            operator.tripsLast30Days ? `${operator.tripsLast30Days} last 30 days` : undefined
          }
        />
        <StatCard
          label="Fleet Size"
          value={operator.vehiclesTotal?.toString() || "—"}
          icon={Car}
          subtext={operator.driversCount ? `${operator.driversCount} drivers` : undefined}
        />
        <StatCard
          label="Team Members"
          value={operator.membersCount?.toString() || "—"}
          icon={Users}
        />
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Info */}
        <div className="card-sf p-5">
          <h3 className="text-content-primary mb-4 font-semibold">Account Information</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-content-secondary">Plan</dt>
              <dd className="text-content-primary font-medium">{operator.plan || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">Plan Code</dt>
              <dd className="text-content-primary font-mono text-xs">{operator.planCode || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">Status</dt>
              <dd>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    operator.subscriptionStatus === "active"
                      ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                      : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                  )}
                >
                  {operator.subscriptionStatus || "unknown"}
                </span>
              </dd>
            </div>
            {location && (
              <div className="flex justify-between">
                <dt className="text-content-secondary">Location</dt>
                <dd className="text-content-primary">{location}</dd>
              </div>
            )}
            {operator.ownerName && (
              <div className="flex justify-between">
                <dt className="text-content-secondary">CSM</dt>
                <dd className="text-content-primary">{operator.ownerName}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Engagement & Health */}
        <div className="card-sf p-5">
          <h3 className="text-content-primary mb-4 font-semibold">Engagement & Health</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-content-secondary">Health Score</dt>
              <dd>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    getHealthColor(operator.healthScore)
                  )}
                >
                  {operator.healthScore || "unknown"}
                  {operator.numericHealthScore !== null && ` (${operator.numericHealthScore}/100)`}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">Payment Health</dt>
              <dd className="text-content-primary capitalize">
                {operator.paymentHealth?.replace("_", " ") || "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">Engagement</dt>
              <dd className="text-content-primary">{operator.engagementStatus || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">Last Activity</dt>
              <dd className="text-content-primary">
                {operator.daysSinceLastLogin !== null
                  ? operator.daysSinceLastLogin === 0
                    ? "Today"
                    : `${operator.daysSinceLastLogin} days ago`
                  : "—"}
              </dd>
            </div>
            {operator.setupScore !== null && (
              <div className="flex justify-between">
                <dt className="text-content-secondary">Setup Score</dt>
                <dd
                  className={cn(
                    "font-medium",
                    operator.setupScore >= 25
                      ? "text-success-600 dark:text-success-500"
                      : operator.setupScore >= 15
                        ? "text-warning-600 dark:text-warning-500"
                        : "text-error-600 dark:text-error-500"
                  )}
                >
                  {Math.round((operator.setupScore / 30) * 100)}%
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Signals */}
      {(operator.riskSignals.length > 0 || operator.positiveSignals.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {operator.riskSignals.length > 0 && (
            <div className="border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-950/30 rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="text-error-600 dark:text-error-500 h-5 w-5" />
                <h3 className="text-error-700 dark:text-error-400 font-semibold">Risk Signals</h3>
              </div>
              <ul className="space-y-2">
                {operator.riskSignals.map((signal, i) => (
                  <li
                    key={i}
                    className="text-error-700 dark:text-error-400 flex items-center gap-2 text-sm"
                  >
                    <span className="bg-error-500 h-1.5 w-1.5 rounded-full" />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {operator.positiveSignals.length > 0 && (
            <div className="border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-950/30 rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2">
                <Check className="text-success-600 dark:text-success-500 h-5 w-5" />
                <h3 className="text-success-700 dark:text-success-400 font-semibold">
                  Positive Signals
                </h3>
              </div>
              <ul className="space-y-2">
                {operator.positiveSignals.map((signal, i) => (
                  <li
                    key={i}
                    className="text-success-700 dark:text-success-400 flex items-center gap-2 text-sm"
                  >
                    <span className="bg-success-500 h-1.5 w-1.5 rounded-full" />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Team/Contacts */}
      <div className="card-sf p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-content-primary font-semibold">Team Members</h3>
          <div className="text-content-tertiary text-sm">
            {operator.membersCount ? `${operator.membersCount} total` : ""}
          </div>
        </div>
        {operator.contacts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {operator.contacts.slice(0, 6).map((contact) => (
              <div
                key={contact.id}
                className="bg-bg-secondary flex items-start gap-3 rounded-lg p-3"
              >
                <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                  {contact.firstName?.[0] || contact.email?.[0]?.toUpperCase() || "?"}
                  {contact.lastName?.[0] || ""}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-content-primary truncate text-sm font-medium">
                    {contact.firstName || contact.lastName
                      ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                      : contact.email || "Unknown"}
                  </p>
                  {contact.jobTitle && (
                    <p className="text-content-tertiary truncate text-xs">{contact.jobTitle}</p>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-primary-600 hover:text-primary-700 block truncate text-xs"
                    >
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="text-content-secondary text-xs">
                      {contact.phone}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Users className="text-content-tertiary mx-auto mb-2 h-8 w-8" />
            <p className="text-content-secondary text-sm">No contacts on file</p>
            <p className="text-content-tertiary mt-1 text-xs">Contacts are synced from HubSpot</p>
          </div>
        )}
        {operator.contacts.length > 6 && (
          <p className="text-content-tertiary mt-3 text-center text-xs">
            +{operator.contacts.length - 6} more contacts
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card-sf p-5">
        <h3 className="text-content-primary mb-4 font-semibold">Quick Actions</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {/* External Portal Links */}
          {customerPortalUrl && (
            <a
              href={customerPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary-500 hover:bg-primary-600 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              <Globe className="h-4 w-4" />
              Open Customer Portal
            </a>
          )}
          <a
            href={`https://app.hubspot.com/contacts/8796840/company/${operator.hubspotId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border-default hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View in HubSpot
          </a>

          {/* Copy Actions */}
          <CopyActionButton
            text={operator.operatorId || ""}
            label="Copy Operator ID"
            disabled={!operator.operatorId}
          />
          <CopyActionButton
            text={operator.stripeAccountId || ""}
            label="Copy Stripe ID"
            disabled={!operator.stripeAccountId}
          />

          {/* HubSpot Actions */}
          <a
            href={`https://app.hubspot.com/contacts/8796840/company/${operator.hubspotId}/notes`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border-default hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add HubSpot Note
          </a>

          {/* Payment Link - generates Stripe Express Dashboard link */}
          {operator.stripeAccountId && (
            <CopyActionButton
              text={`https://connect.stripe.com/express/${operator.stripeAccountId}`}
              label="Copy Stripe Login Link"
            />
          )}

          {/* View Actions */}
          {operator.operatorId && (
            <a
              href={`https://app.intercom.com/a/apps/g54vvt0t/users/show?user_id=${operator.operatorId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border-default hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              View Chat Logs
            </a>
          )}
          {/* OpenPhone - call history */}
          <a
            href="https://my.openphone.com/inbox/PN7CwuUc0S"
            target="_blank"
            rel="noopener noreferrer"
            className="border-border-default hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <Phone className="h-4 w-4" />
            OpenPhone Inbox
          </a>
          <Link
            href={`/matrix/${operator.hubspotId}?tab=emails`}
            className="border-border-default hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <Mail className="h-4 w-4" />
            Search Email Logs
          </Link>

          {/* View Matrix History - navigates to activity tab with history focus */}
          <Link
            href={`/matrix/${operator.hubspotId}?tab=activity`}
            className="border-border-default hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <History className="h-4 w-4" />
            View Matrix History
          </Link>

          {/* Manage Subscription - opens plan change modal */}
          {operator.operatorId && (
            <button
              onClick={() => setShowChangePlanModal(true)}
              className="border-border-default hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <CreditCardIcon className="h-4 w-4" />
              Change Plan
            </button>
          )}

          {/* Risk Assessment Note - links to HubSpot notes with risk context */}
          <a
            href={`https://app.hubspot.com/contacts/8796840/company/${operator.hubspotId}/notes`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border-default hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <Shield className="h-4 w-4" />
            Add Risk Note
          </a>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card-sf p-5">
        <h3 className="text-content-primary mb-4 font-semibold">Quick Links</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {operator.operatorId && (
            <a
              href={`https://swoop.metabaseapp.com/public/dashboard/0e0f542a-68dd-4ff0-b383-a72efb064158?operator_id=${operator.operatorId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border-default hover:bg-surface-hover flex items-center gap-3 rounded-lg border p-3 transition-colors"
            >
              <BarChart3 className="text-content-tertiary h-5 w-5" />
              <span className="text-content-primary flex-1 text-sm font-medium">
                Metabase Dashboard
              </span>
              <ExternalLink className="text-content-tertiary h-4 w-4" />
            </a>
          )}
          {operator.operatorId && (
            <a
              href={`https://analytics.june.so/a/829/objects/2321/object/${operator.operatorId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border-default hover:bg-surface-hover flex items-center gap-3 rounded-lg border p-3 transition-colors"
            >
              <TrendingUp className="text-content-tertiary h-5 w-5" />
              <span className="text-content-primary flex-1 text-sm font-medium">
                June Analytics
              </span>
              <ExternalLink className="text-content-tertiary h-4 w-4" />
            </a>
          )}
          {operator.stripeAccountId && (
            <a
              href={`https://dashboard.stripe.com/connect/accounts/${operator.stripeAccountId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border-default hover:bg-surface-hover flex items-center gap-3 rounded-lg border p-3 transition-colors"
            >
              <CreditCard className="text-content-tertiary h-5 w-5" />
              <span className="text-content-primary flex-1 text-sm font-medium">
                Stripe Dashboard
              </span>
              <ExternalLink className="text-content-tertiary h-4 w-4" />
            </a>
          )}
          <Link
            href={`/accounts/${operator.hubspotId}`}
            className="border-border-default hover:bg-surface-hover flex items-center gap-3 rounded-lg border p-3 transition-colors"
          >
            <FileText className="text-content-tertiary h-5 w-5" />
            <span className="text-content-primary flex-1 text-sm font-medium">
              Full Account View
            </span>
            <ChevronRight className="text-content-tertiary h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Change Plan Modal */}
      {operator.operatorId && (
        <ChangePlanModal
          operatorId={operator.operatorId}
          operatorName={operator.name}
          currentPlan={operator.plan}
          isOpen={showChangePlanModal}
          onClose={() => setShowChangePlanModal(false)}
          onSuccess={handlePlanChangeSuccess}
        />
      )}
    </div>
  )
}

interface ChargesApiResponse {
  source: string
  charges: Array<{
    charge_id: string
    operator_id: string
    operator_name: string
    created_date: string
    status: string
    total_dollars_charged: number
    fee_amount: number
    net_amount: number
    description: string | null
    customer_email: string | null
    // Extended fields for Retool parity
    customer_id?: string | null
    total_dollars_refunded?: number | null
    billing_detail_name?: string | null
    outcome_network_status?: string | null
    outcome_reason?: string | null
    outcome_seller_message?: string | null
    outcome_risk_level?: string | null
    outcome_risk_score?: number | null
    card_id?: string | null
    calculated_statement_descriptor?: string | null
    dispute_id?: string | null
    dispute_status?: string | null
    disputed_amount?: number | null
    dispute_reason?: string | null
    dispute_date?: string | null
  }>
  summary: Array<{
    charge_month: string
    status: string
    total_charges: number
    charge_count: number
  }>
  totals: {
    totalVolume: number
    totalCount: number
    successCount: number
    successVolume: number
    failedCount: number
    failedVolume: number
    successRate: number
  }
}

interface InvoicesApiResponse {
  operatorId: string
  invoices: Array<{
    id: string
    number: string
    type: string
    status: string
    paymentStatus: string
    currency: string
    totalAmountCents: number
    taxesAmountCents: number
    issuingDate: string
    paymentDueDate: string | null
    paymentOverdue: boolean
    fromDate: string | null
    toDate: string | null
    createdAt: string
  }>
  summary: {
    totalInvoiced: number
    totalPaid: number
    totalPending: number
    totalOverdue: number
    invoiceCount: number
    paidCount: number
    pendingCount: number
    overdueCount: number
    failedCount: number
    currency: string
  }
}

interface CustomerApiResponse {
  operatorId: string
  customerId: string
  summary: {
    customer_id: string
    customer_email: string | null
    customer_name: string | null
    total_charges: number
    total_amount: number
    total_refunded: number
    total_disputes: number
    first_charge_date: string | null
    last_charge_date: string | null
  }
  charges: Array<{
    charge_id: string
    created_date: string
    status: string
    total_dollars_charged: number
    description: string | null
    total_dollars_refunded: number | null
    dispute_id: string | null
    dispute_status: string | null
    outcome_risk_level: string | null
  }>
}

// Charge Detail Modal Component
function ChargeDetailModal({
  charge,
  onClose,
  onViewCustomerCharges,
}: {
  charge: ChargesApiResponse["charges"][0]
  onClose: () => void
  onViewCustomerCharges?: (customerId: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="bg-surface-default relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl shadow-xl">
        <div className="border-border-default sticky top-0 flex items-center justify-between border-b bg-inherit px-6 py-4">
          <h3 className="text-content-primary text-lg font-semibold">Charge Details</h3>
          <button
            onClick={onClose}
            className="text-content-tertiary hover:text-content-primary rounded-lg p-1 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Amount & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-content-tertiary text-sm">Amount</p>
              <p className="text-content-primary text-3xl font-bold">
                ${charge.total_dollars_charged.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium capitalize",
                charge.status === "succeeded" || charge.status === "paid"
                  ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                  : charge.status === "failed"
                    ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                    : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
              )}
            >
              {charge.status}
            </span>
          </div>

          {/* Basic Info */}
          <div className="card-sf p-4">
            <h4 className="text-content-primary mb-3 font-medium">Transaction Info</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-content-secondary">Charge ID</dt>
              <dd className="text-content-primary truncate font-mono text-xs">{charge.charge_id}</dd>

              <dt className="text-content-secondary">Date</dt>
              <dd className="text-content-primary">
                {new Date(charge.created_date).toLocaleString()}
              </dd>

              <dt className="text-content-secondary">Description</dt>
              <dd className="text-content-primary">{charge.description || "—"}</dd>

              {charge.calculated_statement_descriptor && (
                <>
                  <dt className="text-content-secondary">Statement Descriptor</dt>
                  <dd className="text-content-primary">{charge.calculated_statement_descriptor}</dd>
                </>
              )}
            </dl>
          </div>

          {/* Customer Info */}
          <div className="card-sf p-4">
            <h4 className="text-content-primary mb-3 font-medium">Customer</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {charge.billing_detail_name && (
                <>
                  <dt className="text-content-secondary">Name</dt>
                  <dd className="text-content-primary">{charge.billing_detail_name}</dd>
                </>
              )}
              {charge.customer_email && (
                <>
                  <dt className="text-content-secondary">Email</dt>
                  <dd className="text-content-primary">{charge.customer_email}</dd>
                </>
              )}
              {charge.customer_id && (
                <>
                  <dt className="text-content-secondary">Customer ID</dt>
                  <dd className="text-content-primary truncate font-mono text-xs">{charge.customer_id}</dd>
                </>
              )}
              {charge.card_id && (
                <>
                  <dt className="text-content-secondary">Card ID</dt>
                  <dd className="text-content-primary truncate font-mono text-xs">{charge.card_id}</dd>
                </>
              )}
            </dl>
            {charge.customer_id && onViewCustomerCharges && (
              <button
                onClick={() => onViewCustomerCharges(charge.customer_id!)}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-3 flex items-center gap-1 text-sm font-medium transition-colors"
              >
                <Users className="h-4 w-4" />
                View All Customer Charges
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Risk & Outcome */}
          {(charge.outcome_risk_level || charge.outcome_reason) && (
            <div className="card-sf p-4">
              <h4 className="text-content-primary mb-3 font-medium">Risk & Outcome</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {charge.outcome_risk_level && (
                  <>
                    <dt className="text-content-secondary">Risk Level</dt>
                    <dd>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          charge.outcome_risk_level === "normal" || charge.outcome_risk_level === "low"
                            ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                            : charge.outcome_risk_level === "elevated"
                              ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                              : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                        )}
                      >
                        {charge.outcome_risk_level}
                      </span>
                    </dd>
                  </>
                )}
                {charge.outcome_risk_score !== null && charge.outcome_risk_score !== undefined && (
                  <>
                    <dt className="text-content-secondary">Risk Score</dt>
                    <dd className="text-content-primary">{charge.outcome_risk_score}</dd>
                  </>
                )}
                {charge.outcome_network_status && (
                  <>
                    <dt className="text-content-secondary">Network Status</dt>
                    <dd className="text-content-primary capitalize">{charge.outcome_network_status.replace(/_/g, " ")}</dd>
                  </>
                )}
                {charge.outcome_reason && (
                  <>
                    <dt className="text-content-secondary">Outcome Reason</dt>
                    <dd className="text-content-primary capitalize">{charge.outcome_reason.replace(/_/g, " ")}</dd>
                  </>
                )}
                {charge.outcome_seller_message && (
                  <>
                    <dt className="text-content-secondary col-span-2">Message</dt>
                    <dd className="text-content-primary col-span-2">{charge.outcome_seller_message}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* Refund Info */}
          {charge.total_dollars_refunded && charge.total_dollars_refunded > 0 && (
            <div className="bg-warning-50 dark:bg-warning-950/30 rounded-lg p-4">
              <h4 className="text-warning-700 dark:text-warning-400 mb-2 font-medium">Refund</h4>
              <p className="text-warning-600 dark:text-warning-500 text-2xl font-bold">
                ${charge.total_dollars_refunded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Dispute Info */}
          {charge.dispute_id && (
            <div
              className={cn(
                "rounded-lg p-4",
                charge.dispute_status === "won"
                  ? "bg-success-50 dark:bg-success-950/30"
                  : charge.dispute_status === "lost"
                    ? "bg-error-50 dark:bg-error-950/30"
                    : "bg-warning-50 dark:bg-warning-950/30"
              )}
            >
              <h4
                className={cn(
                  "mb-3 font-medium",
                  charge.dispute_status === "won"
                    ? "text-success-700 dark:text-success-400"
                    : charge.dispute_status === "lost"
                      ? "text-error-700 dark:text-error-400"
                      : "text-warning-700 dark:text-warning-400"
                )}
              >
                Dispute
              </h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt
                  className={cn(
                    charge.dispute_status === "won"
                      ? "text-success-600 dark:text-success-500"
                      : charge.dispute_status === "lost"
                        ? "text-error-600 dark:text-error-500"
                        : "text-warning-600 dark:text-warning-500"
                  )}
                >
                  Status
                </dt>
                <dd className="font-medium capitalize">{charge.dispute_status}</dd>

                {charge.dispute_reason && (
                  <>
                    <dt
                      className={cn(
                        charge.dispute_status === "won"
                          ? "text-success-600 dark:text-success-500"
                          : charge.dispute_status === "lost"
                            ? "text-error-600 dark:text-error-500"
                            : "text-warning-600 dark:text-warning-500"
                      )}
                    >
                      Reason
                    </dt>
                    <dd className="capitalize">{charge.dispute_reason.replace(/_/g, " ")}</dd>
                  </>
                )}

                {charge.disputed_amount && (
                  <>
                    <dt
                      className={cn(
                        charge.dispute_status === "won"
                          ? "text-success-600 dark:text-success-500"
                          : charge.dispute_status === "lost"
                            ? "text-error-600 dark:text-error-500"
                            : "text-warning-600 dark:text-warning-500"
                      )}
                    >
                      Disputed Amount
                    </dt>
                    <dd className="font-medium">
                      ${charge.disputed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </dd>
                  </>
                )}

                {charge.dispute_date && (
                  <>
                    <dt
                      className={cn(
                        charge.dispute_status === "won"
                          ? "text-success-600 dark:text-success-500"
                          : charge.dispute_status === "lost"
                            ? "text-error-600 dark:text-error-500"
                            : "text-warning-600 dark:text-warning-500"
                      )}
                    >
                      Dispute Date
                    </dt>
                    <dd>{new Date(charge.dispute_date).toLocaleDateString()}</dd>
                  </>
                )}

                <dt
                  className={cn(
                    charge.dispute_status === "won"
                      ? "text-success-600 dark:text-success-500"
                      : charge.dispute_status === "lost"
                        ? "text-error-600 dark:text-error-500"
                        : "text-warning-600 dark:text-warning-500"
                  )}
                >
                  Dispute ID
                </dt>
                <dd className="truncate font-mono text-xs">{charge.dispute_id}</dd>
              </dl>
            </div>
          )}

          {/* Fees */}
          {(charge.fee_amount > 0 || charge.net_amount > 0) && (
            <div className="card-sf p-4">
              <h4 className="text-content-primary mb-3 font-medium">Fees & Net</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-content-secondary">Gross Amount</dt>
                <dd className="text-content-primary font-medium">
                  ${charge.total_dollars_charged.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </dd>
                <dt className="text-content-secondary">Fee</dt>
                <dd className="text-content-primary">
                  ${charge.fee_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </dd>
                <dt className="text-content-secondary">Net Amount</dt>
                <dd className="text-content-primary font-medium">
                  ${charge.net_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </dd>
              </dl>
            </div>
          )}
        </div>

        <div className="border-border-default sticky bottom-0 border-t bg-inherit px-6 py-4">
          <button
            onClick={onClose}
            className="bg-primary-600 hover:bg-primary-700 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Customer Charges Modal Component
function CustomerChargesModal({
  customerId,
  operatorId,
  onClose,
}: {
  customerId: string
  operatorId: string
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CustomerApiResponse | null>(null)

  useEffect(() => {
    fetch(`/api/operator-hub/${operatorId}/customer/${customerId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch customer data")
        return res.json()
      })
      .then((customerData) => {
        setData(customerData)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [customerId, operatorId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="bg-surface-default relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl shadow-xl">
        <div className="border-border-default sticky top-0 flex items-center justify-between border-b bg-inherit px-6 py-4">
          <h3 className="text-content-primary text-lg font-semibold">Customer Charges</h3>
          <button
            onClick={onClose}
            className="text-content-tertiary hover:text-content-primary rounded-lg p-1 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-error-600 dark:text-error-400 py-8 text-center">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
              <p>{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Customer Summary */}
              <div className="card-sf p-4">
                <h4 className="text-content-primary mb-3 font-medium">Customer Summary</h4>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-content-tertiary text-xs uppercase">Name</p>
                    <p className="text-content-primary font-medium">
                      {data.summary.customer_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-content-tertiary text-xs uppercase">Email</p>
                    <p className="text-content-primary truncate font-medium">
                      {data.summary.customer_email || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-content-tertiary text-xs uppercase">Total Charges</p>
                    <p className="text-content-primary font-medium">{data.summary.total_charges}</p>
                  </div>
                  <div>
                    <p className="text-content-tertiary text-xs uppercase">Total Amount</p>
                    <p className="text-content-primary font-medium">
                      ${data.summary.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-content-tertiary text-xs uppercase">Total Refunded</p>
                    <p className={cn(
                      "font-medium",
                      data.summary.total_refunded > 0 ? "text-warning-600 dark:text-warning-400" : "text-content-primary"
                    )}>
                      ${data.summary.total_refunded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-content-tertiary text-xs uppercase">Disputes</p>
                    <p className={cn(
                      "font-medium",
                      data.summary.total_disputes > 0 ? "text-error-600 dark:text-error-400" : "text-content-primary"
                    )}>
                      {data.summary.total_disputes}
                    </p>
                  </div>
                  <div>
                    <p className="text-content-tertiary text-xs uppercase">First Charge</p>
                    <p className="text-content-primary font-medium">
                      {data.summary.first_charge_date
                        ? new Date(data.summary.first_charge_date).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-content-tertiary text-xs uppercase">Last Charge</p>
                    <p className="text-content-primary font-medium">
                      {data.summary.last_charge_date
                        ? new Date(data.summary.last_charge_date).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Charges Table */}
              <div className="card-sf overflow-hidden">
                <div className="border-border-default border-b px-4 py-3">
                  <h4 className="text-content-primary font-medium">
                    All Charges ({data.charges.length})
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-bg-secondary">
                      <tr className="border-border-default border-b">
                        <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                          Date
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                          Description
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                          Status
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                          Risk
                        </th>
                        <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.charges.map((charge) => (
                        <tr key={charge.charge_id} className="border-border-default border-b">
                          <td className="text-content-secondary px-4 py-3 text-sm">
                            {new Date(charge.created_date).toLocaleDateString()}
                          </td>
                          <td className="text-content-primary max-w-[200px] truncate px-4 py-3 text-sm">
                            {charge.description || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                charge.status === "succeeded" || charge.status === "paid"
                                  ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                  : charge.status === "failed"
                                    ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                    : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                              )}
                            >
                              {charge.status}
                            </span>
                            {charge.dispute_id && (
                              <span className="bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 ml-1 rounded-full px-2 py-0.5 text-xs font-medium">
                                Disputed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {charge.outcome_risk_level ? (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                  charge.outcome_risk_level === "normal" || charge.outcome_risk_level === "low"
                                    ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                    : charge.outcome_risk_level === "elevated"
                                      ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                                      : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                )}
                              >
                                {charge.outcome_risk_level}
                              </span>
                            ) : (
                              <span className="text-content-tertiary text-xs">—</span>
                            )}
                          </td>
                          <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                            ${charge.total_dollars_charged.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            {charge.total_dollars_refunded && charge.total_dollars_refunded > 0 && (
                              <span className="text-warning-600 dark:text-warning-400 ml-1 text-xs">
                                (-${charge.total_dollars_refunded.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-border-default sticky bottom-0 border-t bg-inherit px-6 py-4">
          <button
            onClick={onClose}
            className="bg-primary-600 hover:bg-primary-700 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentsTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, _setError] = useState<string | null>(null)
  const [data, setData] = useState<ChargesApiResponse | null>(null)
  const [invoices, setInvoices] = useState<InvoicesApiResponse | null>(null)
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [selectedCharge, setSelectedCharge] = useState<ChargesApiResponse["charges"][0] | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  useEffect(() => {
    if (!operator.operatorId) {
      setLoading(false)
      setInvoicesLoading(false)
      return
    }

    // Fetch charges and invoices in parallel
    // Pass stripeAccountId to charges API so it can fallback to Stripe when Snowflake isn't available
    const chargesUrl = operator.stripeAccountId
      ? `/api/operator-hub/${operator.operatorId}/charges?stripeAccountId=${operator.stripeAccountId}`
      : `/api/operator-hub/${operator.operatorId}/charges`

    Promise.all([
      fetch(chargesUrl)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      fetch(`/api/operator-hub/${operator.operatorId}/invoices`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ]).then(([chargesData, invoicesData]) => {
      if (chargesData) setData(chargesData)
      if (invoicesData) setInvoices(invoicesData)
      setLoading(false)
      setInvoicesLoading(false)
    })
  }, [operator.operatorId, operator.stripeAccountId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  const hasCharges = data && data.charges?.length > 0
  const hasInvoices = invoices && invoices.invoices?.length > 0
  const totals = data?.totals
  const charges = data?.charges || []

  return (
    <div className="space-y-6">
      {/* Payment Stats - show charges stats if available, otherwise invoice stats */}
      {totals ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Volume"
            value={`$${totals.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            subtext={`${totals.totalCount} charges`}
          />
          <StatCard
            label="Successful"
            value={`$${totals.successVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Check}
            variant="success"
            subtext={`${totals.successCount} charges`}
          />
          <StatCard
            label="Success Rate"
            value={`${totals.successRate.toFixed(1)}%`}
            icon={TrendingUp}
            variant={
              totals.successRate >= 95 ? "success" : totals.successRate >= 80 ? "warning" : "danger"
            }
          />
          <StatCard
            label="Failed"
            value={`$${totals.failedVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={AlertTriangle}
            variant={totals.failedCount > 0 ? "danger" : "default"}
            subtext={`${totals.failedCount} charges`}
          />
        </div>
      ) : invoices?.summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Invoiced"
            value={`$${(invoices.summary.totalInvoiced / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={FileText}
            subtext={`${invoices.summary.invoiceCount} invoices`}
          />
          <StatCard
            label="Total Paid"
            value={`$${(invoices.summary.totalPaid / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Check}
            variant="success"
            subtext={`${invoices.summary.paidCount} paid`}
          />
          <StatCard
            label="Pending"
            value={`$${(invoices.summary.totalPending / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Clock}
            variant={invoices.summary.pendingCount > 0 ? "warning" : "default"}
            subtext={`${invoices.summary.pendingCount} pending`}
          />
          <StatCard
            label="Overdue"
            value={`$${(invoices.summary.totalOverdue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={AlertTriangle}
            variant={invoices.summary.overdueCount > 0 ? "danger" : "default"}
            subtext={`${invoices.summary.overdueCount} overdue`}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Volume" value="—" icon={DollarSign} subtext="All time" />
          <StatCard label="This Month" value="—" icon={Calendar} />
          <StatCard label="Success Rate" value="—" icon={Check} />
          <StatCard label="Failed Payments" value="—" icon={AlertTriangle} />
        </div>
      )}

      {/* Charges Analytics Charts */}
      {hasCharges && (() => {
        // Prepare monthly data for charts
        const monthlyData: Record<string, { month: string; succeeded: number; failed: number; total: number }> = {}

        charges.forEach(charge => {
          const date = new Date(charge.created_date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthLabel, succeeded: 0, failed: 0, total: 0 }
          }

          const amount = charge.total_dollars_charged || 0
          if (charge.status === 'succeeded') {
            monthlyData[monthKey].succeeded += amount
          } else if (charge.status === 'failed') {
            monthlyData[monthKey].failed += amount
          }
          monthlyData[monthKey].total += amount
        })

        const chartData = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([, data]) => data)

        if (chartData.length < 2) return null

        return (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Volume Bar Chart */}
            <div className="card-sf p-5">
              <h3 className="text-content-primary mb-4 font-semibold">Monthly Charge Volume</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border-default" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      className="text-content-tertiary"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      className="text-content-tertiary"
                    />
                    <Tooltip
                      formatter={(value) => [`$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, '']}
                      labelClassName="text-content-primary font-medium"
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="succeeded" name="Succeeded" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charges Over Time Line Chart */}
            <div className="card-sf p-5">
              <h3 className="text-content-primary mb-4 font-semibold">Charges Over Time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border-default" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      className="text-content-tertiary"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      className="text-content-tertiary"
                    />
                    <Tooltip
                      formatter={(value) => [`$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Total Volume']}
                      labelClassName="text-content-primary font-medium"
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ fill: '#6366f1', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Stripe Connected Account Live Data */}
      {operator.stripeAccountId && operator.operatorId && (
        <StripeLiveDataCard
          stripeAccountId={operator.stripeAccountId}
          operatorId={operator.operatorId}
        />
      )}

      {/* Lago Invoices Section */}
      {invoicesLoading ? (
        <div className="card-sf p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="text-primary-500 h-5 w-5 animate-spin" />
            <span className="text-content-secondary text-sm">Loading invoices...</span>
          </div>
        </div>
      ) : hasInvoices ? (
        <div className="card-sf overflow-hidden">
          <div className="border-border-default border-b px-4 py-3">
            <h3 className="text-content-primary font-semibold">Billing Invoices (Lago)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-bg-secondary">
                <tr className="border-border-default border-b">
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Invoice #
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Date
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Period
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                    Status
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices!.invoices.slice(0, 15).map((invoice) => (
                  <tr key={invoice.id} className="border-border-default border-b">
                    <td className="text-content-primary px-4 py-3 text-sm font-medium">
                      {invoice.number}
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-sm">
                      {new Date(invoice.issuingDate).toLocaleDateString()}
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-sm">
                      {invoice.fromDate && invoice.toDate
                        ? `${new Date(invoice.fromDate).toLocaleDateString()} - ${new Date(invoice.toDate).toLocaleDateString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          invoice.paymentStatus === "succeeded"
                            ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                            : invoice.paymentStatus === "failed"
                              ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                              : invoice.paymentOverdue
                                ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                        )}
                      >
                        {invoice.paymentOverdue ? "Overdue" : invoice.paymentStatus}
                      </span>
                    </td>
                    <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                      $
                      {(invoice.totalAmountCents / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoices!.invoices.length > 15 && (
            <div className="border-border-default border-t px-4 py-3 text-center">
              <p className="text-content-secondary text-sm">
                Showing 15 of {invoices!.invoices.length} invoices
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Charges Table */}
      {hasCharges ? (
        <div className="card-sf overflow-hidden">
          <div className="border-border-default border-b px-4 py-3">
            <h3 className="text-content-primary font-semibold">Platform Charges</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-bg-secondary">
                <tr className="border-border-default border-b">
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Date
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Customer
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                    Status
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                    Risk
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                    Amount
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                    Refund
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                    Dispute
                  </th>
                </tr>
              </thead>
              <tbody>
                {charges.slice(0, 25).map((charge) => (
                  <tr
                    key={charge.charge_id}
                    className="border-border-default hover:bg-surface-hover cursor-pointer border-b transition-colors"
                    onClick={() => setSelectedCharge(charge)}
                  >
                    <td className="text-content-secondary px-4 py-3 text-sm">
                      {new Date(charge.created_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-content-primary max-w-[160px] truncate">
                        {charge.billing_detail_name || charge.customer_email || "—"}
                      </div>
                      {charge.billing_detail_name && charge.customer_email && (
                        <div className="text-content-tertiary max-w-[160px] truncate text-xs">
                          {charge.customer_email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          charge.status === "succeeded" || charge.status === "paid"
                            ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                            : charge.status === "failed"
                              ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                              : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                        )}
                      >
                        {charge.status}
                      </span>
                      {charge.outcome_reason && charge.status === "failed" && (
                        <div className="text-content-tertiary mt-1 text-xs" title={charge.outcome_seller_message || charge.outcome_reason}>
                          {charge.outcome_reason.replace(/_/g, " ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {charge.outcome_risk_level ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            charge.outcome_risk_level === "normal" || charge.outcome_risk_level === "low"
                              ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                              : charge.outcome_risk_level === "elevated"
                                ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                                : charge.outcome_risk_level === "highest" || charge.outcome_risk_level === "high"
                                  ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                  : "bg-bg-tertiary text-content-tertiary"
                          )}
                        >
                          {charge.outcome_risk_level}
                        </span>
                      ) : (
                        <span className="text-content-tertiary">—</span>
                      )}
                      {charge.outcome_risk_score !== null && charge.outcome_risk_score !== undefined && (
                        <div className="text-content-tertiary mt-0.5 text-xs">
                          Score: {charge.outcome_risk_score}
                        </div>
                      )}
                    </td>
                    <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                      ${charge.total_dollars_charged.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {charge.total_dollars_refunded && charge.total_dollars_refunded > 0 ? (
                        <span className="text-warning-600 dark:text-warning-400 font-medium">
                          ${charge.total_dollars_refunded.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-content-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {charge.dispute_id ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            charge.dispute_status === "won"
                              ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                              : charge.dispute_status === "lost"
                                ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                          )}
                          title={charge.dispute_reason ? charge.dispute_reason.replace(/_/g, " ") : undefined}
                        >
                          {charge.dispute_status || "disputed"}
                        </span>
                      ) : (
                        <span className="text-content-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {charges.length > 25 && (
            <div className="border-border-default border-t px-4 py-3 text-center">
              <p className="text-content-secondary text-sm">
                Showing 25 of {charges.length} charges
              </p>
            </div>
          )}
        </div>
      ) : !hasInvoices ? (
        <div className="card-sf p-8 text-center">
          <CreditCard className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
          <h3 className="text-content-primary text-lg font-medium">Payment History</h3>
          <p className="text-content-secondary mx-auto mt-2 max-w-md">
            {error || "Configure data sources to view payment and invoice history."}
          </p>
          <p className="text-content-tertiary mt-4 text-sm">
            Supported: Snowflake, Metabase, Lago, Stripe
          </p>
        </div>
      ) : null}

      {/* Charge Detail Modal */}
      {selectedCharge && (
        <ChargeDetailModal
          charge={selectedCharge}
          onClose={() => setSelectedCharge(null)}
          onViewCustomerCharges={(customerId) => {
            setSelectedCharge(null)
            setSelectedCustomerId(customerId)
          }}
        />
      )}

      {/* Customer Charges Modal */}
      {selectedCustomerId && operator.operatorId && (
        <CustomerChargesModal
          customerId={selectedCustomerId}
          operatorId={operator.operatorId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  )
}

interface RiskApiResponse {
  operator_id: string
  risk_score: number | null
  failed_payments_count: number
  dispute_count: number
  avg_transaction_amount: number | null
  last_failed_payment_date: string | null
  risk_level: "low" | "medium" | "high" | "unknown"
  // Risk management settings
  instant_payout_limit_cents: number | null
  daily_payment_limit_cents: number | null
}

// ============================================================================
// Stripe Live Data Component
// ============================================================================

interface StripeLiveData {
  operatorId: string
  stripeAccountId: string
  account: {
    id: string
    businessName: string | null
    email: string | null
    country: string | null
    defaultCurrency: string | null
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    createdAt: string
    requirements: {
      currentlyDue: string[]
      pastDue: string[]
      disabledReason: string | null
    }
  }
  balance: {
    available: number
    pending: number
    total: number
    currency: string
  }
  payouts: Array<{
    id: string
    amount: number
    currency: string
    status: string
    arrivalDate: string
    createdAt: string
  }>
  charges: {
    recent: Array<{
      id: string
      amount: number
      currency: string
      status: string
      description: string | null
      createdAt: string
      paymentMethod: { brand: string; last4: string } | null
    }>
    stats: {
      totalCount: number
      successCount: number
      totalVolume: number
      avgAmount: number
      currency: string
    }
  }
}

function StripeLiveDataCard({
  stripeAccountId,
  operatorId,
}: {
  stripeAccountId: string
  operatorId: string
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StripeLiveData | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!stripeAccountId || !operatorId) {
      setLoading(false)
      return
    }

    fetch(`/api/operator-hub/${operatorId}/stripe?stripeAccountId=${stripeAccountId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch Stripe data")
        return res.json()
      })
      .then((result) => {
        setData(result)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [stripeAccountId, operatorId])

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  if (loading) {
    return (
      <div className="card-sf p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="text-primary-500 h-5 w-5 animate-spin" />
          <span className="text-content-secondary text-sm">Loading Stripe data...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card-sf p-4">
        <div className="flex items-center gap-3">
          <CreditCard className="text-content-tertiary h-5 w-5" />
          <div>
            <p className="text-content-primary text-sm font-medium">Stripe Connected Account</p>
            <p className="text-content-tertiary text-xs">{error || "Data not available"}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card-sf overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-bg-secondary flex w-full items-center justify-between p-4 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="bg-primary-100 dark:bg-primary-900/30 rounded-lg p-2">
            <CreditCard className="text-primary-600 dark:text-primary-400 h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-content-primary text-sm font-medium">
              Stripe Balance: {formatCurrency(data.balance.available, data.balance.currency)}
            </p>
            <p className="text-content-secondary text-xs">
              {data.balance.pending > 0 &&
                `${formatCurrency(data.balance.pending, data.balance.currency)} pending • `}
              {data.account.chargesEnabled ? "Charges enabled" : "Charges disabled"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.account.requirements.pastDue.length > 0 && (
            <span className="bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 rounded-full px-2 py-0.5 text-xs font-medium">
              Action Required
            </span>
          )}
          <ChevronRight
            className={cn(
              "text-content-tertiary h-5 w-5 transition-transform",
              expanded && "rotate-90"
            )}
          />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-border-default border-t">
          {/* Balance & Account Status */}
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <div className="bg-bg-secondary rounded-lg p-3">
              <p className="text-content-tertiary text-xs">Available Balance</p>
              <p className="text-content-primary text-lg font-semibold">
                {formatCurrency(data.balance.available, data.balance.currency)}
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-3">
              <p className="text-content-tertiary text-xs">Pending Balance</p>
              <p className="text-content-primary text-lg font-semibold">
                {formatCurrency(data.balance.pending, data.balance.currency)}
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-3">
              <p className="text-content-tertiary text-xs">
                Recent Volume ({data.charges.stats.totalCount} charges)
              </p>
              <p className="text-content-primary text-lg font-semibold">
                {formatCurrency(data.charges.stats.totalVolume, data.charges.stats.currency)}
              </p>
            </div>
          </div>

          {/* Recent Payouts */}
          {data.payouts.length > 0 && (
            <div className="border-border-default border-t px-4 py-3">
              <h4 className="text-content-secondary mb-2 text-xs font-medium uppercase">
                Recent Payouts
              </h4>
              <div className="space-y-2">
                {data.payouts.slice(0, 5).map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          payout.status === "paid"
                            ? "bg-success-500"
                            : payout.status === "pending" || payout.status === "in_transit"
                              ? "bg-warning-500"
                              : "bg-error-500"
                        )}
                      />
                      <span className="text-content-primary">
                        {formatCurrency(payout.amount, payout.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-content-tertiary text-xs capitalize">
                        {payout.status}
                      </span>
                      <span className="text-content-tertiary text-xs">
                        {new Date(payout.arrivalDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Charges */}
          {data.charges.recent.length > 0 && (
            <div className="border-border-default border-t px-4 py-3">
              <h4 className="text-content-secondary mb-2 text-xs font-medium uppercase">
                Recent Charges
              </h4>
              <div className="space-y-2">
                {data.charges.recent.slice(0, 5).map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          charge.status === "succeeded" ? "bg-success-500" : "bg-error-500"
                        )}
                      />
                      <span className="text-content-primary">
                        {formatCurrency(charge.amount, charge.currency)}
                      </span>
                      {charge.paymentMethod && (
                        <span className="text-content-tertiary text-xs">
                          {charge.paymentMethod.brand} •••• {charge.paymentMethod.last4}
                        </span>
                      )}
                    </div>
                    <span className="text-content-tertiary text-xs">
                      {new Date(charge.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirements Warning */}
          {data.account.requirements.pastDue.length > 0 && (
            <div className="border-border-default bg-error-50 dark:bg-error-950/30 border-t p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-error-600 dark:text-error-400 mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-error-700 dark:text-error-400 text-sm font-medium">
                    Action Required
                  </p>
                  <p className="text-error-600 dark:text-error-500 mt-1 text-xs">
                    {data.account.requirements.pastDue.length} requirement(s) past due.{" "}
                    {data.account.requirements.disabledReason && (
                      <>Reason: {data.account.requirements.disabledReason}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Links */}
          <div className="border-border-default flex items-center justify-between border-t p-4">
            <span className="text-content-tertiary text-xs">
              Account: {data.account.id.slice(0, 20)}...
            </span>
            <a
              href={`https://dashboard.stripe.com/connect/accounts/${data.account.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 text-xs font-medium"
            >
              View in Stripe <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

interface DisputesApiResponse {
  operatorId: string
  stripeAccountId: string
  disputes: Array<{
    dispute_id: string
    charge_id: string
    dispute_status: string
    dispute_reason: string | null
    disputed_amount: number
    dispute_date: string
    created_date: string
    outcome_risk_level: string | null
    billing_detail_name: string | null
  }>
  summary: {
    total_disputes: number
    total_disputed_amount: number
    disputes_by_status: Array<{ status: string; count: number }>
    disputes_by_reason: Array<{ reason: string; count: number }>
    disputes_by_risk_level: Array<{ risk_level: string; count: number }>
    disputes_over_time: Array<{ date: string; count: number }>
  }
}

// ============================================================================
// Risk Update Modal (Admin Only)
// ============================================================================

interface RiskUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  operatorId: string
  currentValues: {
    instantPayoutLimitCents: number | null
    dailyPaymentLimitCents: number | null
    riskScore: number | null
  }
  onSuccess: () => void
}

function RiskUpdateModal({
  isOpen,
  onClose,
  operatorId,
  currentValues,
  onSuccess,
}: RiskUpdateModalProps) {
  const [instantPayoutLimit, setInstantPayoutLimit] = useState<string>(
    currentValues.instantPayoutLimitCents
      ? (currentValues.instantPayoutLimitCents / 100).toString()
      : ""
  )
  const [dailyPaymentLimit, setDailyPaymentLimit] = useState<string>(
    currentValues.dailyPaymentLimitCents
      ? (currentValues.dailyPaymentLimitCents / 100).toString()
      : ""
  )
  const [riskScore, setRiskScore] = useState<string>(
    currentValues.riskScore !== null ? currentValues.riskScore.toString() : ""
  )
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens with new values
  useEffect(() => {
    if (isOpen) {
      setInstantPayoutLimit(
        currentValues.instantPayoutLimitCents
          ? (currentValues.instantPayoutLimitCents / 100).toString()
          : ""
      )
      setDailyPaymentLimit(
        currentValues.dailyPaymentLimitCents
          ? (currentValues.dailyPaymentLimitCents / 100).toString()
          : ""
      )
      setRiskScore(currentValues.riskScore !== null ? currentValues.riskScore.toString() : "")
      setError(null)
    }
  }, [isOpen, currentValues])

  const handleUpdate = async (field: "instantPayout" | "dailyPayment" | "riskScore") => {
    setUpdating(true)
    setError(null)

    try {
      const body: Record<string, number> = {}

      if (field === "instantPayout" && instantPayoutLimit) {
        body.instantPayoutLimitCents = Math.round(parseFloat(instantPayoutLimit) * 100)
      } else if (field === "dailyPayment" && dailyPaymentLimit) {
        body.dailyPaymentLimitCents = Math.round(parseFloat(dailyPaymentLimit) * 100)
      } else if (field === "riskScore" && riskScore) {
        body.riskScore = parseFloat(riskScore)
      }

      const response = await fetch(`/api/operator-hub/${operatorId}/risk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update risk settings")
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setUpdating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="bg-bg-primary/80 absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="card-sf relative z-10 mx-4 w-full max-w-md p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-content-primary text-lg font-semibold">Risk Details</h3>
          <button
            onClick={onClose}
            className="text-content-secondary hover:text-content-primary transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-error-50 dark:bg-error-950/30 text-error-700 dark:text-error-400 mb-4 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Instant Payout Limit */}
          <div className="space-y-2">
            <label className="text-content-primary block text-sm font-medium">
              Instant Payout Limit Amount
            </label>
            <p className="text-content-tertiary text-xs">
              The total instant payout volume an operator can process.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="text-content-tertiary absolute left-3 top-1/2 -translate-y-1/2">
                  $
                </span>
                <input
                  type="number"
                  value={instantPayoutLimit}
                  onChange={(e) => setInstantPayoutLimit(e.target.value)}
                  className="input-sf w-full pl-7"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <button
                onClick={() => handleUpdate("instantPayout")}
                disabled={updating || !instantPayoutLimit}
                className="btn-sf-secondary whitespace-nowrap"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>

          {/* Daily Payment Limit */}
          <div className="space-y-2">
            <label className="text-content-primary block text-sm font-medium">
              Daily Processing Limit Amount
            </label>
            <p className="text-content-tertiary text-xs">
              The total amount of moovs payments an operator can process daily through Customer
              Portal, Operator Portal.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="text-content-tertiary absolute left-3 top-1/2 -translate-y-1/2">
                  $
                </span>
                <input
                  type="number"
                  value={dailyPaymentLimit}
                  onChange={(e) => setDailyPaymentLimit(e.target.value)}
                  className="input-sf w-full pl-7"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <button
                onClick={() => handleUpdate("dailyPayment")}
                disabled={updating || !dailyPaymentLimit}
                className="btn-sf-secondary whitespace-nowrap"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>

          {/* Risk Score */}
          <div className="space-y-2">
            <label className="text-content-primary block text-sm font-medium">Risk Score</label>
            <p className="text-content-tertiary text-xs">
              This is the internal risk score of an operator.
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                value={riskScore}
                onChange={(e) => setRiskScore(e.target.value)}
                className="input-sf flex-1"
                placeholder="0"
                step="1"
              />
              <button
                onClick={() => handleUpdate("riskScore")}
                disabled={updating || !riskScore}
                className="btn-sf-secondary whitespace-nowrap"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-sf-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function RiskTab({ operator }: { operator: OperatorData }) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RiskApiResponse | null>(null)
  const [disputesData, setDisputesData] = useState<DisputesApiResponse | null>(null)
  const [disputesLoading, setDisputesLoading] = useState(true)
  const [showRiskModal, setShowRiskModal] = useState(false)

  // Reusable function to fetch risk data
  const fetchRiskData = useCallback(() => {
    if (!operator.operatorId) return

    fetch(`/api/operator-hub/${operator.operatorId}/risk`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch risk data")
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [operator.operatorId])

  useEffect(() => {
    if (!operator.operatorId) {
      setLoading(false)
      setDisputesLoading(false)
      return
    }

    // Fetch risk data
    fetchRiskData()

    // Fetch disputes data if stripe account ID available
    if (operator.stripeAccountId) {
      fetch(
        `/api/operator-hub/${operator.operatorId}/disputes?stripeAccountId=${operator.stripeAccountId}`
      )
        .then((res) => {
          if (!res.ok) return null
          return res.json()
        })
        .then((data) => {
          if (data) setDisputesData(data)
          setDisputesLoading(false)
        })
        .catch(() => {
          setDisputesLoading(false)
        })
    } else {
      setDisputesLoading(false)
    }
  }, [operator.operatorId, operator.stripeAccountId, fetchRiskData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  const riskData = data || {
    risk_score: null,
    failed_payments_count: 0,
    dispute_count: 0,
    avg_transaction_amount: null,
    last_failed_payment_date: null,
    risk_level: "unknown" as const,
    instant_payout_limit_cents: null,
    daily_payment_limit_cents: null,
  }

  return (
    <div className="space-y-6">
      {/* Admin Risk Update Modal */}
      {operator.operatorId && (
        <RiskUpdateModal
          isOpen={showRiskModal}
          onClose={() => setShowRiskModal(false)}
          operatorId={operator.operatorId}
          currentValues={{
            instantPayoutLimitCents: riskData.instant_payout_limit_cents,
            dailyPaymentLimitCents: riskData.daily_payment_limit_cents,
            riskScore: riskData.risk_score,
          }}
          onSuccess={() => {
            fetchRiskData()
            setShowRiskModal(false)
          }}
        />
      )}

      {/* Header with Admin Update Button */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowRiskModal(true)}
            className="btn-sf-secondary inline-flex items-center gap-2 text-sm"
          >
            <Edit3 className="h-4 w-4" />
            Update Risk Details
          </button>
        </div>
      )}

      {/* Risk Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Payment Health"
          value={operator.paymentHealth?.replace("_", " ") || "—"}
          icon={Shield}
          variant={
            operator.paymentHealth === "good"
              ? "success"
              : operator.paymentHealth === "at_risk"
                ? "warning"
                : operator.paymentHealth === "critical"
                  ? "danger"
                  : "default"
          }
        />
        <StatCard
          label="Risk Level"
          value={riskData.risk_level}
          icon={AlertTriangle}
          variant={
            riskData.risk_level === "low"
              ? "success"
              : riskData.risk_level === "medium"
                ? "warning"
                : riskData.risk_level === "high"
                  ? "danger"
                  : "default"
          }
        />
        <StatCard
          label="Failed Payments"
          value={riskData.failed_payments_count.toString()}
          icon={CreditCard}
          variant={riskData.failed_payments_count > 0 ? "danger" : "default"}
          subtext={
            riskData.last_failed_payment_date
              ? `Last: ${new Date(riskData.last_failed_payment_date).toLocaleDateString()}`
              : undefined
          }
        />
        <StatCard
          label="Disputes"
          value={riskData.dispute_count.toString()}
          icon={FileText}
          variant={riskData.dispute_count > 0 ? "danger" : "default"}
        />
      </div>

      {/* Risk Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Score Card */}
        <div className="card-sf p-5">
          <h3 className="text-content-primary mb-4 font-semibold">Risk Analysis</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-content-secondary">Overall Risk Level</dt>
              <dd>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    riskData.risk_level === "low"
                      ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                      : riskData.risk_level === "medium"
                        ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                        : riskData.risk_level === "high"
                          ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                          : "bg-bg-tertiary text-content-tertiary"
                  )}
                >
                  {riskData.risk_level}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">Avg Transaction</dt>
              <dd className="text-content-primary">
                {riskData.avg_transaction_amount !== null
                  ? `$${riskData.avg_transaction_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">Failed Payments</dt>
              <dd className="text-content-primary">{riskData.failed_payments_count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">Disputes</dt>
              <dd className="text-content-primary">{riskData.dispute_count}</dd>
            </div>
            {/* Admin-managed fields */}
            <div className="border-border-secondary mt-4 border-t pt-4">
              <p className="text-content-tertiary mb-3 text-xs font-medium uppercase tracking-wider">
                Risk Management Settings
              </p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-content-secondary">Internal Risk Score</dt>
                  <dd className="text-content-primary">
                    {riskData.risk_score !== null ? riskData.risk_score : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-content-secondary">Instant Payout Limit</dt>
                  <dd className="text-content-primary">
                    {riskData.instant_payout_limit_cents !== null
                      ? `$${(riskData.instant_payout_limit_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-content-secondary">Daily Payment Limit</dt>
                  <dd className="text-content-primary">
                    {riskData.daily_payment_limit_cents !== null
                      ? `$${(riskData.daily_payment_limit_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : "—"}
                  </dd>
                </div>
              </div>
            </div>
          </dl>
        </div>

        {/* Risk Signals */}
        <div className="card-sf p-5">
          <h3 className="text-content-primary mb-4 font-semibold">Risk Indicators</h3>
          <div className="space-y-3">
            {riskData.failed_payments_count > 5 && (
              <div className="bg-error-50 dark:bg-error-950/30 flex items-start gap-3 rounded-lg p-3">
                <AlertTriangle className="text-error-600 dark:text-error-400 mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-error-700 dark:text-error-400 text-sm font-medium">
                    High Failed Payment Count
                  </p>
                  <p className="text-error-600 dark:text-error-500 text-xs">
                    {riskData.failed_payments_count} failed payments detected
                  </p>
                </div>
              </div>
            )}
            {riskData.dispute_count > 0 && (
              <div className="bg-warning-50 dark:bg-warning-950/30 flex items-start gap-3 rounded-lg p-3">
                <FileText className="text-warning-600 dark:text-warning-400 mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-warning-700 dark:text-warning-400 text-sm font-medium">
                    Disputes Detected
                  </p>
                  <p className="text-warning-600 dark:text-warning-500 text-xs">
                    {riskData.dispute_count} dispute(s) on record
                  </p>
                </div>
              </div>
            )}
            {riskData.risk_level === "low" && riskData.failed_payments_count === 0 && (
              <div className="bg-success-50 dark:bg-success-950/30 flex items-start gap-3 rounded-lg p-3">
                <Check className="text-success-600 dark:text-success-400 mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-success-700 dark:text-success-400 text-sm font-medium">
                    Good Standing
                  </p>
                  <p className="text-success-600 dark:text-success-500 text-xs">
                    No significant risk indicators
                  </p>
                </div>
              </div>
            )}
            {error && (
              <div className="text-content-tertiary text-center text-sm">
                Unable to load full risk analysis. {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Analytics Charts */}
      {disputesData && disputesData.summary.total_disputes > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Disputes Over Time Chart */}
          {disputesData.summary.disputes_over_time.length > 1 && (
            <div className="card-sf p-5">
              <h3 className="text-content-primary mb-4 font-semibold">Disputes Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={disputesData.summary.disputes_over_time.map(d => ({
                      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      count: d.count,
                    }))}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border-default" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-content-tertiary" />
                    <YAxis tick={{ fontSize: 11 }} className="text-content-tertiary" />
                    <Tooltip
                      formatter={(value) => [Number(value || 0), 'Disputes']}
                      labelClassName="text-content-primary font-medium"
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Risk Level Distribution Bar Chart */}
          {disputesData.summary.disputes_by_risk_level.length > 0 && (
            <div className="card-sf p-5">
              <h3 className="text-content-primary mb-4 font-semibold">Disputes by Risk Level</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={disputesData.summary.disputes_by_risk_level.map(d => ({
                      level: (d.risk_level || 'Unknown').replace(/_/g, ' '),
                      count: d.count,
                    }))}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border-default" />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="text-content-tertiary" />
                    <YAxis
                      dataKey="level"
                      type="category"
                      tick={{ fontSize: 11 }}
                      className="text-content-tertiary"
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => [Number(value || 0), 'Disputes']}
                      labelClassName="text-content-primary font-medium"
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#f59e0b"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disputes Analytics Section */}
      {operator.stripeAccountId && (
        <div className="space-y-4">
          <h3 className="text-content-primary text-lg font-semibold">Disputes Analytics</h3>

          {disputesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-primary-500 h-6 w-6 animate-spin" />
            </div>
          ) : disputesData && disputesData.summary.total_disputes > 0 ? (
            <>
              {/* Disputes Summary Stats */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total Disputes"
                  value={disputesData.summary.total_disputes.toString()}
                  icon={FileText}
                  variant="danger"
                />
                <StatCard
                  label="Total Disputed Amount"
                  value={`$${disputesData.summary.total_disputed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  icon={DollarSign}
                  variant="danger"
                />
                <StatCard
                  label="Most Common Reason"
                  value={
                    disputesData.summary.disputes_by_reason[0]?.reason?.replace(/_/g, " ") ||
                    "—"
                  }
                  icon={AlertTriangle}
                />
                <StatCard
                  label="Pending Disputes"
                  value={
                    disputesData.summary.disputes_by_status
                      .filter(
                        (s) =>
                          s.status !== "won" &&
                          s.status !== "lost" &&
                          s.status !== "closed"
                      )
                      .reduce((sum, s) => sum + s.count, 0)
                      .toString()
                  }
                  icon={Clock}
                  variant="warning"
                />
              </div>

              {/* Charts Grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Disputes by Status */}
                <div className="card-sf p-5">
                  <h4 className="text-content-primary mb-4 font-medium">Disputes by Status</h4>
                  <div className="space-y-3">
                    {disputesData.summary.disputes_by_status.map((item) => {
                      const percentage =
                        (item.count / disputesData.summary.total_disputes) * 100
                      return (
                        <div key={item.status} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-content-secondary capitalize">
                              {item.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-content-primary font-medium">
                              {item.count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="bg-bg-tertiary h-2 overflow-hidden rounded-full">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                item.status === "won"
                                  ? "bg-success-500"
                                  : item.status === "lost"
                                    ? "bg-error-500"
                                    : "bg-warning-500"
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Disputes by Reason */}
                <div className="card-sf p-5">
                  <h4 className="text-content-primary mb-4 font-medium">Disputes by Reason</h4>
                  <div className="space-y-3">
                    {disputesData.summary.disputes_by_reason.slice(0, 5).map((item) => {
                      const percentage =
                        (item.count / disputesData.summary.total_disputes) * 100
                      return (
                        <div key={item.reason} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-content-secondary capitalize">
                              {(item.reason || "unknown").replace(/_/g, " ")}
                            </span>
                            <span className="text-content-primary font-medium">
                              {item.count}
                            </span>
                          </div>
                          <div className="bg-bg-tertiary h-2 overflow-hidden rounded-full">
                            <div
                              className="bg-primary-500 h-full rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Risk Level Distribution */}
                <div className="card-sf p-5">
                  <h4 className="text-content-primary mb-4 font-medium">
                    Risk Level Distribution
                  </h4>
                  <div className="space-y-3">
                    {disputesData.summary.disputes_by_risk_level.map((item) => {
                      const percentage =
                        (item.count / disputesData.summary.total_disputes) * 100
                      return (
                        <div key={item.risk_level} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-content-secondary capitalize">
                              {(item.risk_level || "unknown").replace(/_/g, " ")}
                            </span>
                            <span className="text-content-primary font-medium">
                              {item.count}
                            </span>
                          </div>
                          <div className="bg-bg-tertiary h-2 overflow-hidden rounded-full">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                item.risk_level === "low" || item.risk_level === "normal"
                                  ? "bg-success-500"
                                  : item.risk_level === "elevated"
                                    ? "bg-warning-500"
                                    : item.risk_level === "highest" || item.risk_level === "high"
                                      ? "bg-error-500"
                                      : "bg-gray-400"
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Disputes Over Time */}
                <div className="card-sf p-5">
                  <h4 className="text-content-primary mb-4 font-medium">Disputes Over Time</h4>
                  {disputesData.summary.disputes_over_time.length > 0 ? (
                    <div className="flex h-32 items-end gap-1">
                      {disputesData.summary.disputes_over_time.map((item) => {
                        const maxCount = Math.max(
                          ...disputesData.summary.disputes_over_time.map((d) => d.count)
                        )
                        const height = (item.count / maxCount) * 100
                        return (
                          <div
                            key={item.date}
                            className="group relative flex-1"
                            title={`${item.date}: ${item.count} disputes`}
                          >
                            <div
                              className="bg-primary-500 hover:bg-primary-600 w-full rounded-t transition-all"
                              style={{ height: `${Math.max(height, 4)}%` }}
                            />
                            <div className="absolute -bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-xs text-content-tertiary group-hover:block">
                              {item.date}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-content-tertiary py-8 text-center text-sm">
                      No dispute history available
                    </p>
                  )}
                </div>
              </div>

              {/* Recent Disputes Table */}
              {disputesData.disputes.length > 0 && (
                <div className="card-sf overflow-hidden">
                  <div className="border-border-default border-b px-4 py-3">
                    <h4 className="text-content-primary font-medium">Recent Disputes</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-bg-secondary">
                        <tr>
                          <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                            Date
                          </th>
                          <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                            Customer
                          </th>
                          <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                            Reason
                          </th>
                          <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                            Status
                          </th>
                          <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {disputesData.disputes.slice(0, 10).map((dispute) => (
                          <tr
                            key={dispute.dispute_id}
                            className="border-border-default border-b"
                          >
                            <td className="text-content-secondary px-4 py-3 text-sm">
                              {dispute.dispute_date
                                ? new Date(dispute.dispute_date).toLocaleDateString()
                                : new Date(dispute.created_date).toLocaleDateString()}
                            </td>
                            <td className="text-content-primary px-4 py-3 text-sm">
                              {dispute.billing_detail_name || "—"}
                            </td>
                            <td className="text-content-secondary px-4 py-3 text-sm capitalize">
                              {(dispute.dispute_reason || "unknown").replace(/_/g, " ")}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                  dispute.dispute_status === "won"
                                    ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                    : dispute.dispute_status === "lost"
                                      ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                      : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                                )}
                              >
                                {dispute.dispute_status}
                              </span>
                            </td>
                            <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                              ${dispute.disputed_amount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {disputesData.disputes.length > 10 && (
                    <div className="border-border-default border-t px-4 py-3 text-center">
                      <p className="text-content-secondary text-sm">
                        Showing 10 of {disputesData.disputes.length} disputes
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="card-sf p-8 text-center">
              <Check className="text-success-500 mx-auto mb-4 h-12 w-12" />
              <h4 className="text-content-primary text-lg font-medium">No Disputes</h4>
              <p className="text-content-secondary mt-2">
                This operator has no recorded payment disputes.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface MembersApiResponse {
  operatorId: string
  members: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    role: string | null
    createdAt: string | null
    lastLoginAt: string | null
  }>
  drivers: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    status: string | null
    createdAt: string | null
  }>
  vehicles: Array<{
    id: string
    name: string | null
    type: string | null
    licensePlate: string | null
    color: string | null
    capacity: number | null
    createdAt: string | null
  }>
  driverPerformance: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    status: string
    totalTrips: number
    completedTrips: number
    tripsLast30Days: number
    totalRevenue: number | null
    lastTripDate: string | null
    completionRate: number | null
  }>
  vehicleUtilization: Array<{
    id: string
    name: string | null
    type: string | null
    licensePlate: string | null
    capacity: number | null
    totalTrips: number
    tripsLast30Days: number
    totalRevenue: number | null
    lastTripDate: string | null
    daysSinceLastTrip: number | null
  }>
  stats: {
    totalMembers: number
    totalDrivers: number
    activeDrivers: number
    totalVehicles: number
    memberRoles: Record<string, number>
  }
}

interface PlatformDataApiResponse {
  operatorId: string
  promoCodes: Array<{
    id: string
    code: string
    description: string | null
    discountType: string | null
    discountValue: number | null
    validFrom: string | null
    validUntil: string | null
    usageLimit: number | null
    timesUsed: number | null
    isActive: boolean | null
    createdAt: string | null
  }>
  priceZones: Array<{
    id: string
    name: string | null
    type: string | null
    baseFare: number | null
    perMileRate: number | null
    perMinuteRate: number | null
    minimumFare: number | null
    createdAt: string | null
  }>
  rules: Array<{
    id: string
    name: string | null
    type: string | null
    conditions: string | null
    actions: string | null
    isActive: boolean | null
    priority: number | null
    createdAt: string | null
  }>
  contacts: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    companyName: string | null
    notes: string | null
    createdAt: string | null
  }>
  bankAccounts: Array<{
    id: string
    institutionName: string | null
    accountName: string | null
    accountType: string | null
    lastFour: string | null
    status: string | null
    createdAt: string | null
  }>
  subscriptionLog: Array<{
    id: string
    eventType: string | null
    planName: string | null
    previousPlan: string | null
    amount: number | null
    eventDate: string | null
    notes: string | null
  }>
  bankTransactions: Array<{
    id: string
    accountId: string | null
    amount: number
    currency: string | null
    description: string | null
    status: string | null
    transactedAt: string | null
    postedAt: string | null
  }>
  driverAppUsers: Array<{
    driverId: string
    appUserId: string | null
    appVersion: string | null
    deviceType: string | null
    lastActiveAt: string | null
    pushEnabled: boolean | null
  }>
  settings: Record<string, unknown> | null
  operatorInfo: {
    name: string | null
    nameSlug: string | null
    email: string | null
    phone: string | null
    generalEmail: string | null
    termsAndConditionsUrl: string | null
    websiteUrl: string | null
    companyLogoUrl: string | null
    bookingPortalUrl: string | null
  } | null
  stats: {
    totalPromoCodes: number
    activePromoCodes: number
    totalZones: number
    totalRules: number
    activeRules: number
    totalContacts: number
    totalBankAccounts: number
    totalSubscriptionEvents: number
    totalBankTransactions: number
    totalDriverAppUsers: number
    hasSettings: boolean
    hasOperatorInfo: boolean
  }
}

// ============================================================================
// Add Member Modal
// ============================================================================

const MEMBER_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "driver_manager", label: "Driver Manager" },
  { value: "accountant", label: "Accountant" },
]

function AddMemberModal({
  operatorId,
  isOpen,
  onClose,
  onSuccess,
}: {
  operatorId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [roleSlug, setRoleSlug] = useState("member")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/operator-hub/${operatorId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, roleSlug }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add member")
      }

      // Reset form and close
      setEmail("")
      setFirstName("")
      setLastName("")
      setRoleSlug("member")
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-primary border-border-default w-full max-w-md rounded-lg border shadow-xl">
        <div className="border-border-default flex items-center justify-between border-b p-4">
          <h2 className="text-content-primary text-lg font-semibold">Add New Member</h2>
          <button
            onClick={onClose}
            className="text-content-secondary hover:text-content-primary rounded p-1"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-400 mb-4 rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="text-content-primary mb-1 block text-sm font-medium"
              >
                Email <span className="text-error-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border-default bg-bg-secondary text-content-primary focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                placeholder="email@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="text-content-primary mb-1 block text-sm font-medium"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border-border-default bg-bg-secondary text-content-primary focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                  placeholder="John"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="text-content-primary mb-1 block text-sm font-medium"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border-border-default bg-bg-secondary text-content-primary focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="text-content-primary mb-1 block text-sm font-medium">
                Role
              </label>
              <select
                id="role"
                value={roleSlug}
                onChange={(e) => setRoleSlug(e.target.value)}
                className="border-border-default bg-bg-secondary text-content-primary focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                {MEMBER_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-content-secondary hover:text-content-primary rounded-md px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// Edit Role Dropdown
// ============================================================================

function EditRoleDropdown({
  currentRole,
  memberId,
  operatorId,
  onSuccess,
}: {
  currentRole: string | null
  memberId: string
  operatorId: string
  onSuccess: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState(currentRole || "member")

  const handleSave = async () => {
    if (selectedRole === currentRole) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/operator-hub/${operatorId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId, roleSlug: selectedRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update role")
      }

      onSuccess()
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update role:", err)
      alert(err instanceof Error ? err.message : "Failed to update role")
    } finally {
      setLoading(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="border-border-default bg-bg-secondary text-content-primary focus:border-primary-500 rounded border px-2 py-1 text-xs focus:outline-none"
          disabled={loading}
        >
          {MEMBER_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-xs font-medium"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </button>
        <button
          onClick={() => {
            setIsEditing(false)
            setSelectedRole(currentRole || "member")
          }}
          disabled={loading}
          className="text-content-tertiary hover:text-content-secondary text-xs"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="bg-bg-tertiary text-content-secondary hover:bg-bg-secondary group flex items-center gap-1 rounded px-2 py-0.5 text-xs capitalize"
    >
      {(currentRole || "member").replace(/_/g, " ")}
      <Edit3 className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

// ============================================================================
// Change Plan Modal
// ============================================================================

interface SubscriptionData {
  operatorId: string
  currentSubscription: {
    id: string
    lagoId: string
    planCode: string
    planName: string | null
    status: string
    startedAt: string
    billingTime: string
    interval: string | null
    amountCents: number | null
    currency: string | null
  } | null
  availablePlans: Array<{
    code: string
    name: string
    interval: string
    amountCents: number
    currency: string
  }>
}

function ChangePlanModal({
  operatorId,
  operatorName,
  currentPlan: _currentPlan,
  isOpen,
  onClose,
  onSuccess,
}: {
  operatorId: string
  operatorName: string
  currentPlan: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [selectedPlans, setSelectedPlans] = useState<
    Array<{ code: string; startDate: string; endDate: string }>
  >([])

  useEffect(() => {
    if (isOpen && operatorId) {
      setLoading(true)
      setError(null)
      setSelectedPlans([])
      fetch(`/api/operator-hub/${operatorId}/subscription`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load subscription data")
          return res.json()
        })
        .then((result) => {
          setData(result)
          // Initialize with current plan if exists
          if (result.currentSubscription?.planCode) {
            setSelectedPlans([{
              code: result.currentSubscription.planCode,
              startDate: "",
              endDate: "",
            }])
          }
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    }
  }, [isOpen, operatorId])

  const togglePlan = (planCode: string) => {
    setSelectedPlans((prev) => {
      const exists = prev.find((p) => p.code === planCode)
      if (exists) {
        return prev.filter((p) => p.code !== planCode)
      }
      return [...prev, { code: planCode, startDate: "", endDate: "" }]
    })
  }

  const updatePlanDates = (planCode: string, field: "startDate" | "endDate", value: string) => {
    setSelectedPlans((prev) =>
      prev.map((p) => (p.code === planCode ? { ...p, [field]: value } : p))
    )
  }

  const handleChangePlan = async () => {
    if (selectedPlans.length === 0 || !data?.currentSubscription) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/operator-hub/${operatorId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: data.currentSubscription.id,
          plans: selectedPlans,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to change plan")
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change plan")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSubscription = async () => {
    if (selectedPlans.length === 0) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/operator-hub/${operatorId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plans: selectedPlans,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create subscription")
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subscription")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const formatPrice = (cents: number | null, currency: string | null) => {
    if (cents === null || cents === undefined) return "—"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(cents / 100)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="bg-bg-primary border-border-default my-auto w-full max-w-lg rounded-lg border shadow-xl">
        <div className="border-border-default sticky top-0 flex items-center justify-between border-b bg-inherit p-4 rounded-t-lg">
          <div>
            <h2 className="text-content-primary text-lg font-semibold">Change Plan</h2>
            <p className="text-content-secondary text-sm">{operatorName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-content-secondary hover:text-content-primary rounded p-1"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
            </div>
          ) : error && !data ? (
            <div className="bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-400 rounded-md p-4 text-sm">
              {error}
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-400 mb-4 rounded-md p-3 text-sm">
                  {error}
                </div>
              )}

              {/* Current Plan */}
              {data?.currentSubscription && (
                <div className="bg-bg-secondary mb-4 rounded-lg p-4">
                  <h4 className="text-content-secondary mb-2 text-xs font-medium uppercase">
                    Current Plan
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-content-primary font-medium">
                        {data.currentSubscription.planName || data.currentSubscription.planCode}
                      </p>
                      <p className="text-content-secondary text-sm">
                        {data.currentSubscription.amountCents && data.currentSubscription.currency
                          ? `${formatPrice(data.currentSubscription.amountCents, data.currentSubscription.currency)}/${data.currentSubscription.interval}`
                          : data.currentSubscription.interval || "—"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        data.currentSubscription.status === "active"
                          ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                          : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                      )}
                    >
                      {data.currentSubscription.status}
                    </span>
                  </div>
                </div>
              )}

              {/* Plan Selection */}
              <div>
                <label className="text-content-primary mb-2 block text-sm font-medium">
                  {data?.currentSubscription ? "Select Plans" : "Select Plans"}
                </label>
                <p className="text-content-tertiary mb-3 text-xs">
                  Select one or more plans. You can optionally set start and end dates.
                </p>
                {data?.availablePlans && data.availablePlans.length > 0 ? (
                  <div className="space-y-3">
                    {data.availablePlans.map((plan) => {
                      const isSelected = selectedPlans.some((p) => p.code === plan.code)
                      const selectedPlanData = selectedPlans.find((p) => p.code === plan.code)
                      return (
                        <div
                          key={plan.code}
                          className={cn(
                            "border-border-default rounded-lg border p-3 transition-colors",
                            isSelected
                              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                              : "hover:bg-bg-secondary"
                          )}
                        >
                          <label className="flex cursor-pointer items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePlan(plan.code)}
                                className="text-primary-600 h-4 w-4 rounded"
                              />
                              <div>
                                <p className="text-content-primary font-medium">{plan.name}</p>
                                <p className="text-content-tertiary text-xs">{plan.code}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-content-primary font-medium">
                                {formatPrice(plan.amountCents, plan.currency)}
                              </p>
                              <p className="text-content-tertiary text-xs">per {plan.interval}</p>
                            </div>
                          </label>
                          {isSelected && (
                            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border-default pt-3">
                              <div>
                                <label className="text-content-secondary mb-1 block text-xs">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  value={selectedPlanData?.startDate || ""}
                                  onChange={(e) =>
                                    updatePlanDates(plan.code, "startDate", e.target.value)
                                  }
                                  className="bg-bg-primary border-border-default text-content-primary w-full rounded-md border px-2 py-1 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-content-secondary mb-1 block text-xs">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  value={selectedPlanData?.endDate || ""}
                                  onChange={(e) =>
                                    updatePlanDates(plan.code, "endDate", e.target.value)
                                  }
                                  className="bg-bg-primary border-border-default text-content-primary w-full rounded-md border px-2 py-1 text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-content-tertiary text-sm">No plans available</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="border-border-default flex justify-end gap-3 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="text-content-secondary hover:text-content-primary rounded-md px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          {data?.currentSubscription ? (
            <button
              onClick={handleChangePlan}
              disabled={saving || selectedPlans.length === 0}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Plans ({selectedPlans.length})
            </button>
          ) : (
            <button
              onClick={handleCreateSubscription}
              disabled={saving || selectedPlans.length === 0}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Subscription ({selectedPlans.length})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Quotes Tab
// ============================================================================

interface QuotesApiResponse {
  operatorId: string
  quotes: Array<{
    request_id: string
    order_number: string | null
    stage: string
    order_type: string | null
    total_amount: number | null
    created_at: string
    pickup_date: string | null
    customer_name: string | null
    customer_email: string | null
    pickup_address: string | null
    dropoff_address: string | null
    vehicle_type: string | null
  }>
  summary: {
    total_quotes: number
    total_quotes_amount: number
    total_reservations: number
    total_reservations_amount: number
    conversion_rate: number
    quotes_by_month: Array<{
      month: string
      quotes: number
      reservations: number
      amount: number
    }>
  }
}

function QuotesTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<QuotesApiResponse | null>(null)
  const [filter, setFilter] = useState<"all" | "quotes" | "reservations">("all")

  useEffect(() => {
    if (!operator.operatorId) {
      setLoading(false)
      return
    }

    fetch(`/api/operator-hub/${operator.operatorId}/quotes`)
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (data) setData(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [operator.operatorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!data || (data.summary.total_quotes === 0 && data.summary.total_reservations === 0)) {
    return (
      <div className="card-sf p-8 text-center">
        <FileText className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
        <h3 className="text-content-primary text-lg font-medium">No Quotes Data</h3>
        <p className="text-content-secondary mx-auto mt-2 max-w-md">
          No quotes or reservations found for this operator.
        </p>
      </div>
    )
  }

  const filteredQuotes = data.quotes.filter((q) => {
    if (filter === "all") return true
    if (filter === "quotes") return q.stage.toLowerCase().includes("quote")
    if (filter === "reservations") return q.stage.toLowerCase().includes("reservation")
    return true
  })

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Quotes"
          value={data.summary.total_quotes.toLocaleString()}
          icon={FileText}
          subtext={`$${data.summary.total_quotes_amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
        />
        <StatCard
          label="Total Reservations"
          value={data.summary.total_reservations.toLocaleString()}
          icon={Car}
          variant="success"
          subtext={`$${data.summary.total_reservations_amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
        />
        <StatCard
          label="Conversion Rate"
          value={`${data.summary.conversion_rate}%`}
          icon={TrendingUp}
          variant={
            data.summary.conversion_rate >= 50
              ? "success"
              : data.summary.conversion_rate >= 25
                ? "warning"
                : "danger"
          }
          subtext="Quotes → Reservations"
        />
        <StatCard
          label="Total Revenue"
          value={`$${(data.summary.total_quotes_amount + data.summary.total_reservations_amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
          icon={DollarSign}
        />
      </div>

      {/* Monthly Trend */}
      {data.summary.quotes_by_month.length > 0 && (
        <div className="card-sf p-5">
          <h3 className="text-content-primary mb-4 font-semibold">Monthly Trend (Last 12 Months)</h3>
          <div className="flex h-40 items-end gap-2">
            {data.summary.quotes_by_month.slice(0, 12).reverse().map((month) => {
              const maxTotal = Math.max(
                ...data.summary.quotes_by_month.map((m) => m.quotes + m.reservations)
              )
              const total = month.quotes + month.reservations
              const height = maxTotal > 0 ? (total / maxTotal) * 100 : 0
              const quoteHeight = total > 0 ? (month.quotes / total) * height : 0
              const resHeight = height - quoteHeight

              return (
                <div
                  key={month.month}
                  className="group relative flex flex-1 flex-col justify-end"
                  title={`${month.month}: ${month.quotes} quotes, ${month.reservations} reservations`}
                >
                  <div
                    className="bg-success-500 w-full rounded-t"
                    style={{ height: `${resHeight}%` }}
                  />
                  <div
                    className="bg-primary-500 w-full"
                    style={{ height: `${quoteHeight}%` }}
                  />
                  <div className="text-content-tertiary mt-1 text-center text-xs">
                    {month.month.split("-")[1]}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="bg-primary-500 h-3 w-3 rounded" />
              <span className="text-content-secondary">Quotes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-success-500 h-3 w-3 rounded" />
              <span className="text-content-secondary">Reservations</span>
            </div>
          </div>
        </div>
      )}

      {/* Quotes/Reservations Table */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-content-primary font-semibold">Recent Quotes & Reservations</h3>
          <div className="flex gap-2">
            {(["all", "quotes", "reservations"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  filter === f
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                    : "text-content-secondary hover:bg-surface-hover"
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-bg-secondary">
              <tr className="border-border-default border-b">
                <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                  Date
                </th>
                <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                  Order #
                </th>
                <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                  Customer
                </th>
                <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                  Route
                </th>
                <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                  Type
                </th>
                <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.slice(0, 25).map((quote) => {
                const isReservation = quote.stage.toLowerCase().includes("reservation")
                return (
                  <tr key={quote.request_id} className="border-border-default border-b">
                    <td className="text-content-secondary px-4 py-3 text-sm">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-content-primary px-4 py-3 text-sm font-medium">
                      {quote.order_number || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-content-primary">{quote.customer_name || "—"}</div>
                      {quote.customer_email && (
                        <div className="text-content-tertiary text-xs">{quote.customer_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-content-primary max-w-[200px] truncate">
                        {quote.pickup_address || "—"}
                      </div>
                      {quote.dropoff_address && (
                        <div className="text-content-tertiary max-w-[200px] truncate text-xs">
                          → {quote.dropoff_address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          isReservation
                            ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                            : "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                        )}
                      >
                        {isReservation ? "Reservation" : "Quote"}
                      </span>
                    </td>
                    <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                      {quote.total_amount !== null
                        ? `$${quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filteredQuotes.length > 25 && (
          <div className="border-border-default border-t px-4 py-3 text-center">
            <p className="text-content-secondary text-sm">
              Showing 25 of {filteredQuotes.length} {filter === "all" ? "items" : filter}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function FeaturesTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MembersApiResponse | null>(null)
  const [platformData, setPlatformData] = useState<PlatformDataApiResponse | null>(null)
  const [activeSection, setActiveSection] = useState<"members" | "drivers" | "vehicles">("members")
  const [configSection, setConfigSection] = useState<
    "promos" | "zones" | "rules" | "contacts" | "bank" | "subscriptions"
  >("promos")
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)

  const fetchData = useCallback(async () => {
    if (!operator.operatorId) {
      setLoading(false)
      return
    }

    try {
      const [membersData, configData] = await Promise.all([
        fetch(`/api/operator-hub/${operator.operatorId}/members`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
        fetch(`/api/operator-hub/${operator.operatorId}/platform-data`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ])
      setData(membersData)
      setPlatformData(configData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [operator.operatorId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  const stats = data?.stats || {
    totalMembers: operator.membersCount || 0,
    totalDrivers: operator.driversCount || 0,
    activeDrivers: 0,
    totalVehicles: operator.vehiclesTotal || 0,
    memberRoles: {},
  }

  return (
    <div className="space-y-6">
      {/* Platform Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Setup Score"
          value={
            operator.setupScore !== null ? `${Math.round((operator.setupScore / 30) * 100)}%` : "—"
          }
          icon={Settings}
          variant={
            operator.setupScore && operator.setupScore >= 25
              ? "success"
              : operator.setupScore && operator.setupScore >= 15
                ? "warning"
                : "default"
          }
        />
        <StatCard label="Members" value={stats.totalMembers.toString()} icon={Users} />
        <StatCard
          label="Drivers"
          value={stats.totalDrivers.toString()}
          icon={Users}
          subtext={`${stats.activeDrivers} active`}
        />
        <StatCard label="Vehicles" value={stats.totalVehicles.toString()} icon={Car} />
      </div>

      {/* Section Tabs */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default flex border-b">
          {[
            { key: "members", label: "Platform Members", count: data?.members.length || 0 },
            { key: "drivers", label: "Drivers", count: data?.drivers.length || 0 },
            { key: "vehicles", label: "Vehicles", count: data?.vehicles.length || 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as typeof activeSection)}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeSection === tab.key
                  ? "border-primary-500 text-primary-600 dark:text-primary-400 border-b-2 bg-white dark:bg-transparent"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Members Section */}
        {activeSection === "members" && (
          <div>
            {/* Add Member Button */}
            {operator.operatorId && (
              <div className="border-border-default flex items-center justify-between border-b px-4 py-3">
                <span className="text-content-secondary text-sm">
                  {data?.members.length || 0} platform members
                </span>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add Member
                </button>
              </div>
            )}

            {!data || data.members.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">No Members Found</h3>
                <p className="text-content-secondary mx-auto mt-2 max-w-md">
                  {error || "Platform member data is not available for this operator."}
                </p>
                {operator.operatorId && (
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="bg-primary-600 hover:bg-primary-700 mt-4 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Member
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-border-default divide-y">
                {data.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 p-4">
                    <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                      {member.firstName?.[0] || member.email?.[0]?.toUpperCase() || "?"}
                      {member.lastName?.[0] || ""}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary text-sm font-medium">
                        {member.firstName || member.lastName
                          ? `${member.firstName || ""} ${member.lastName || ""}`.trim()
                          : member.email || "Unknown"}
                      </p>
                      {member.email && (
                        <p className="text-content-secondary truncate text-xs">{member.email}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {operator.operatorId ? (
                        <EditRoleDropdown
                          currentRole={member.role}
                          memberId={member.id}
                          operatorId={operator.operatorId}
                          onSuccess={fetchData}
                        />
                      ) : (
                        member.role && (
                          <span className="bg-bg-tertiary text-content-secondary rounded px-2 py-0.5 text-xs capitalize">
                            {member.role.replace(/_/g, " ")}
                          </span>
                        )
                      )}
                      {member.lastLoginAt && (
                        <p className="text-content-tertiary text-xs">
                          Last login: {new Date(member.lastLoginAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drivers Section - With Performance Metrics */}
        {activeSection === "drivers" && (
          <div>
            {!data || data.drivers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">No Drivers Found</h3>
                <p className="text-content-secondary mx-auto mt-2 max-w-md">
                  {error || "Driver data is not available for this operator."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-border-default bg-bg-secondary border-b text-left text-xs uppercase tracking-wider">
                      <th className="text-content-secondary px-4 py-3 font-medium">Driver</th>
                      <th className="text-content-secondary px-4 py-3 font-medium">Status</th>
                      <th className="text-content-secondary px-4 py-3 font-medium text-right">Total Trips</th>
                      <th className="text-content-secondary px-4 py-3 font-medium text-right">Last 30 Days</th>
                      <th className="text-content-secondary px-4 py-3 font-medium text-right">Completion</th>
                      <th className="text-content-secondary px-4 py-3 font-medium text-right">Revenue</th>
                      <th className="text-content-secondary px-4 py-3 font-medium">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-default divide-y">
                    {(data.driverPerformance?.length ? data.driverPerformance : data.drivers.map(d => ({ ...d, totalTrips: 0, tripsLast30Days: 0, completionRate: null, totalRevenue: null, lastTripDate: null }))).map((driver) => (
                      <tr key={driver.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                              {driver.firstName?.[0] || "D"}
                              {(driver as { lastName?: string | null }).lastName?.[0] || ""}
                            </div>
                            <div>
                              <p className="text-content-primary text-sm font-medium">
                                {driver.firstName || (driver as { lastName?: string | null }).lastName
                                  ? `${driver.firstName || ""} ${(driver as { lastName?: string | null }).lastName || ""}`.trim()
                                  : "Unknown Driver"}
                              </p>
                              {driver.email && (
                                <p className="text-content-tertiary text-xs">{driver.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              driver.status === "active"
                                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                : driver.status === "inactive"
                                  ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                                  : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                            )}
                          >
                            {driver.status || "unknown"}
                          </span>
                        </td>
                        <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                          {(driver as { totalTrips?: number }).totalTrips ?? "—"}
                        </td>
                        <td className="text-content-secondary px-4 py-3 text-right text-sm">
                          {(driver as { tripsLast30Days?: number }).tripsLast30Days ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {(driver as { completionRate?: number | null }).completionRate !== null && (driver as { completionRate?: number | null }).completionRate !== undefined ? (
                            <span className={cn(
                              "font-medium",
                              (driver as { completionRate?: number }).completionRate! >= 90 ? "text-success-600" :
                              (driver as { completionRate?: number }).completionRate! >= 70 ? "text-warning-600" : "text-error-600"
                            )}>
                              {(driver as { completionRate?: number }).completionRate}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="text-content-primary px-4 py-3 text-right text-sm">
                          {(driver as { totalRevenue?: number | null }).totalRevenue
                            ? `$${(driver as { totalRevenue?: number }).totalRevenue!.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : "—"}
                        </td>
                        <td className="text-content-tertiary px-4 py-3 text-sm">
                          {(driver as { lastTripDate?: string | null }).lastTripDate
                            ? new Date((driver as { lastTripDate?: string }).lastTripDate!).toLocaleDateString()
                            : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Vehicles Section - With Utilization Stats */}
        {activeSection === "vehicles" && (
          <div>
            {!data || data.vehicles.length === 0 ? (
              <div className="p-8 text-center">
                <Car className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">No Vehicles Found</h3>
                <p className="text-content-secondary mx-auto mt-2 max-w-md">
                  {error || "Vehicle data is not available for this operator."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-border-default bg-bg-secondary border-b text-left text-xs uppercase tracking-wider">
                      <th className="text-content-secondary px-4 py-3 font-medium">Vehicle</th>
                      <th className="text-content-secondary px-4 py-3 font-medium">Type</th>
                      <th className="text-content-secondary px-4 py-3 font-medium text-right">Capacity</th>
                      <th className="text-content-secondary px-4 py-3 font-medium text-right">Total Trips</th>
                      <th className="text-content-secondary px-4 py-3 font-medium text-right">Last 30 Days</th>
                      <th className="text-content-secondary px-4 py-3 font-medium text-right">Revenue</th>
                      <th className="text-content-secondary px-4 py-3 font-medium">Last Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-default divide-y">
                    {(data.vehicleUtilization?.length ? data.vehicleUtilization : data.vehicles.map(v => ({ ...v, totalTrips: 0, tripsLast30Days: 0, totalRevenue: null, lastTripDate: null, daysSinceLastTrip: null }))).map((vehicle) => (
                      <tr key={vehicle.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                              <Car className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-content-primary text-sm font-medium">
                                {vehicle.name || vehicle.type || "Unknown Vehicle"}
                              </p>
                              {(vehicle as { licensePlate?: string | null }).licensePlate && (
                                <p className="text-content-tertiary font-mono text-xs">
                                  {(vehicle as { licensePlate?: string }).licensePlate}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {vehicle.type ? (
                            <span className="bg-bg-tertiary text-content-secondary rounded px-2 py-0.5 text-xs capitalize">
                              {vehicle.type}
                            </span>
                          ) : (
                            <span className="text-content-tertiary text-sm">—</span>
                          )}
                        </td>
                        <td className="text-content-primary px-4 py-3 text-right text-sm">
                          {vehicle.capacity ? `${vehicle.capacity}` : "—"}
                        </td>
                        <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                          {(vehicle as { totalTrips?: number }).totalTrips ?? "—"}
                        </td>
                        <td className="text-content-secondary px-4 py-3 text-right text-sm">
                          {(vehicle as { tripsLast30Days?: number }).tripsLast30Days ?? "—"}
                        </td>
                        <td className="text-content-primary px-4 py-3 text-right text-sm">
                          {(vehicle as { totalRevenue?: number | null }).totalRevenue
                            ? `$${(vehicle as { totalRevenue?: number }).totalRevenue!.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {(vehicle as { lastTripDate?: string | null }).lastTripDate ? (
                            <div>
                              <p className="text-content-secondary">
                                {new Date((vehicle as { lastTripDate?: string }).lastTripDate!).toLocaleDateString()}
                              </p>
                              {(vehicle as { daysSinceLastTrip?: number | null }).daysSinceLastTrip !== null && (
                                <p className={cn(
                                  "text-xs",
                                  (vehicle as { daysSinceLastTrip?: number }).daysSinceLastTrip! > 30
                                    ? "text-warning-600"
                                    : "text-content-tertiary"
                                )}>
                                  {(vehicle as { daysSinceLastTrip?: number }).daysSinceLastTrip} days ago
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-content-tertiary">Never</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform Configuration */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default flex border-b">
          {[
            {
              key: "promos",
              label: "Promos",
              count: platformData?.promoCodes.length || 0,
              icon: Tag,
            },
            {
              key: "zones",
              label: "Zones",
              count: platformData?.priceZones.length || 0,
              icon: MapPin,
            },
            {
              key: "rules",
              label: "Rules",
              count: platformData?.rules.length || 0,
              icon: Zap,
            },
            {
              key: "contacts",
              label: "Contacts",
              count: platformData?.contacts?.length || 0,
              icon: Building2,
            },
            {
              key: "bank",
              label: "Bank",
              count: platformData?.bankAccounts?.length || 0,
              icon: Landmark,
            },
            {
              key: "subscriptions",
              label: "History",
              count: platformData?.subscriptionLog?.length || 0,
              icon: Receipt,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setConfigSection(tab.key as typeof configSection)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                configSection === tab.key
                  ? "border-primary-500 text-primary-600 dark:text-primary-400 border-b-2 bg-white dark:bg-transparent"
                  : "text-content-secondary hover:text-content-primary"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Promo Codes Section */}
        {configSection === "promos" && (
          <div>
            {!platformData || platformData.promoCodes.length === 0 ? (
              <div className="p-8 text-center">
                <Tag className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">No Promo Codes</h3>
                <p className="text-content-secondary mx-auto mt-2 max-w-md">
                  No promo codes configured for this operator.
                </p>
              </div>
            ) : (
              <div className="divide-border-default divide-y">
                {platformData.promoCodes.map((promo) => (
                  <div key={promo.id} className="flex items-center gap-4 p-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        promo.isActive
                          ? "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
                          : "bg-bg-tertiary text-content-tertiary"
                      )}
                    >
                      <Percent className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-content-primary font-mono text-sm font-medium">
                          {promo.code}
                        </p>
                        {!promo.isActive && (
                          <span className="bg-bg-tertiary text-content-tertiary rounded px-1.5 py-0.5 text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      {promo.description && (
                        <p className="text-content-secondary mt-0.5 text-xs">{promo.description}</p>
                      )}
                      <div className="mt-1 flex gap-3 text-xs">
                        {promo.discountType && promo.discountValue !== null && (
                          <span className="text-success-600 dark:text-success-400">
                            {promo.discountType === "percentage"
                              ? `${promo.discountValue}% off`
                              : `$${promo.discountValue} off`}
                          </span>
                        )}
                        {promo.usageLimit !== null && promo.timesUsed !== null && (
                          <span className="text-content-tertiary">
                            Used {promo.timesUsed}/{promo.usageLimit}
                          </span>
                        )}
                      </div>
                    </div>
                    {promo.validUntil && (
                      <span className="text-content-tertiary text-xs">
                        Expires {new Date(promo.validUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Price Zones Section */}
        {configSection === "zones" && (
          <div>
            {!platformData || platformData.priceZones.length === 0 ? (
              <div className="p-8 text-center">
                <MapPin className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">No Price Zones</h3>
                <p className="text-content-secondary mx-auto mt-2 max-w-md">
                  No price zones configured for this operator.
                </p>
              </div>
            ) : (
              <div className="divide-border-default divide-y">
                {platformData.priceZones.map((zone) => (
                  <div key={zone.id} className="flex items-center gap-4 p-4">
                    <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary text-sm font-medium">
                        {zone.name || "Unnamed Zone"}
                      </p>
                      {zone.type && (
                        <p className="text-content-secondary mt-0.5 text-xs capitalize">
                          {zone.type}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      {zone.baseFare !== null && (
                        <p className="text-content-primary">Base: ${zone.baseFare.toFixed(2)}</p>
                      )}
                      {zone.perMileRate !== null && (
                        <p className="text-content-secondary">${zone.perMileRate.toFixed(2)}/mi</p>
                      )}
                      {zone.minimumFare !== null && (
                        <p className="text-content-tertiary">Min: ${zone.minimumFare.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Business Rules Section */}
        {configSection === "rules" && (
          <div>
            {!platformData || platformData.rules.length === 0 ? (
              <div className="p-8 text-center">
                <Zap className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">No Business Rules</h3>
                <p className="text-content-secondary mx-auto mt-2 max-w-md">
                  No business rules configured for this operator.
                </p>
              </div>
            ) : (
              <div className="divide-border-default divide-y">
                {platformData.rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-4 p-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        rule.isActive
                          ? "bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400"
                          : "bg-bg-tertiary text-content-tertiary"
                      )}
                    >
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-content-primary text-sm font-medium">
                          {rule.name || "Unnamed Rule"}
                        </p>
                        {!rule.isActive && (
                          <span className="bg-bg-tertiary text-content-tertiary rounded px-1.5 py-0.5 text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      {rule.type && (
                        <p className="text-content-secondary mt-0.5 text-xs capitalize">
                          {rule.type.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                    {rule.priority !== null && (
                      <span className="text-content-tertiary text-xs">
                        Priority: {rule.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Platform Contacts Section */}
        {configSection === "contacts" && (
          <div>
            {!platformData?.contacts || platformData.contacts.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">No Platform Contacts</h3>
                <p className="text-content-secondary mx-auto mt-2 max-w-md">
                  No contacts saved in the operator&apos;s platform.
                </p>
              </div>
            ) : (
              <div className="divide-border-default divide-y">
                {platformData.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-4 p-4">
                    <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary text-sm font-medium">
                        {[contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
                          contact.email ||
                          "Unknown Contact"}
                      </p>
                      {contact.companyName && (
                        <p className="text-content-secondary text-xs">{contact.companyName}</p>
                      )}
                      <div className="mt-1 flex gap-3 text-xs">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <span className="text-content-tertiary">{contact.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bank Accounts & Transactions Section */}
        {configSection === "bank" && (
          <div className="space-y-4">
            {/* Bank Accounts */}
            <div>
              <div className="border-border-default bg-bg-secondary border-b px-4 py-2">
                <h4 className="text-content-secondary text-xs font-semibold uppercase">
                  Connected Accounts ({platformData?.bankAccounts?.length || 0})
                </h4>
              </div>
              {!platformData?.bankAccounts || platformData.bankAccounts.length === 0 ? (
                <div className="p-6 text-center">
                  <Landmark className="text-content-tertiary mx-auto mb-2 h-8 w-8" />
                  <p className="text-content-secondary text-sm">
                    No bank accounts connected via Stripe Financial Connections.
                  </p>
                </div>
              ) : (
                <div className="divide-border-default divide-y">
                  {platformData.bankAccounts.map((account) => (
                    <div key={account.id} className="flex items-center gap-4 p-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          account.status === "active"
                            ? "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
                            : "bg-bg-tertiary text-content-tertiary"
                        )}
                      >
                        <Landmark className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-content-primary text-sm font-medium">
                            {account.institutionName || "Unknown Bank"}
                          </p>
                          {account.status && account.status !== "active" && (
                            <span className="bg-bg-tertiary text-content-tertiary rounded px-1.5 py-0.5 text-xs capitalize">
                              {account.status}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex gap-3 text-xs">
                          {account.accountName && (
                            <span className="text-content-secondary">{account.accountName}</span>
                          )}
                          {account.accountType && (
                            <span className="text-content-tertiary capitalize">
                              {account.accountType}
                            </span>
                          )}
                          {account.lastFour && (
                            <span className="text-content-tertiary font-mono">
                              ····{account.lastFour}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bank Transactions */}
            {platformData?.bankTransactions && platformData.bankTransactions.length > 0 && (
              <div>
                <div className="border-border-default bg-bg-secondary border-b px-4 py-2">
                  <h4 className="text-content-secondary text-xs font-semibold uppercase">
                    Recent Transactions ({platformData.bankTransactions.length})
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-bg-secondary">
                      <tr className="border-border-default border-b">
                        <th className="text-content-secondary px-4 py-2 text-left text-xs font-semibold">
                          Date
                        </th>
                        <th className="text-content-secondary px-4 py-2 text-left text-xs font-semibold">
                          Description
                        </th>
                        <th className="text-content-secondary px-4 py-2 text-right text-xs font-semibold">
                          Amount
                        </th>
                        <th className="text-content-secondary px-4 py-2 text-center text-xs font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-border-default divide-y">
                      {platformData.bankTransactions.slice(0, 20).map((tx) => (
                        <tr key={tx.id}>
                          <td className="text-content-secondary px-4 py-2 text-sm">
                            {tx.transactedAt ? new Date(tx.transactedAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="text-content-primary max-w-[200px] truncate px-4 py-2 text-sm">
                            {tx.description || "Transaction"}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2 text-right text-sm font-medium",
                              tx.amount > 0
                                ? "text-success-600 dark:text-success-400"
                                : "text-content-primary"
                            )}
                          >
                            {tx.amount > 0 ? "+" : ""}
                            {(tx.amount / 100).toLocaleString(undefined, {
                              style: "currency",
                              currency: tx.currency || "USD",
                            })}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                tx.status === "posted"
                                  ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                  : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                              )}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscription History Section */}
        {configSection === "subscriptions" && (
          <div>
            {!platformData?.subscriptionLog || platformData.subscriptionLog.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">
                  No Subscription History
                </h3>
                <p className="text-content-secondary mx-auto mt-2 max-w-md">
                  No subscription events recorded for this operator.
                </p>
              </div>
            ) : (
              <div className="divide-border-default divide-y">
                {platformData.subscriptionLog.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-4">
                    <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-content-primary text-sm font-medium capitalize">
                          {event.eventType?.replace(/_/g, " ") || "Event"}
                        </p>
                      </div>
                      <div className="mt-0.5 flex gap-3 text-xs">
                        {event.planName && (
                          <span className="text-content-secondary">{event.planName}</span>
                        )}
                        {event.previousPlan && (
                          <span className="text-content-tertiary">from {event.previousPlan}</span>
                        )}
                        {event.amount !== null && (
                          <span className="text-success-600 dark:text-success-400">
                            ${event.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {event.eventDate && (
                      <span className="text-content-tertiary text-xs">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {operator.operatorId && (
        <AddMemberModal
          operatorId={operator.operatorId}
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}

interface ReservationsApiResponse {
  operatorId: string
  monthlyData: Array<{
    operator_id: string
    operator_name: string
    created_month: string
    total_trips: number
    total_amount: number
  }>
  totals: {
    totalTrips: number
    totalAmount: number
    monthsWithData: number
  }
  currentMonth: {
    total_trips: number
    total_amount: number
  }
}

function ActivityTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReservationsApiResponse | null>(null)

  useEffect(() => {
    if (!operator.operatorId) {
      setLoading(false)
      return
    }

    fetch(`/api/operator-hub/${operator.operatorId}/reservations`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch reservations")
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [operator.operatorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Activity Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Last Activity"
          value={
            operator.daysSinceLastLogin !== null
              ? operator.daysSinceLastLogin === 0
                ? "Today"
                : `${operator.daysSinceLastLogin}d ago`
              : "—"
          }
          icon={Clock}
          variant={
            operator.daysSinceLastLogin !== null && operator.daysSinceLastLogin > 30
              ? "danger"
              : operator.daysSinceLastLogin !== null && operator.daysSinceLastLogin > 14
                ? "warning"
                : "default"
          }
        />
        <StatCard
          label="Trips (30d)"
          value={operator.tripsLast30Days?.toString() || "—"}
          icon={TrendingUp}
        />
        <StatCard
          label="Total Trips"
          value={
            data?.totals.totalTrips.toLocaleString() || operator.totalTrips?.toLocaleString() || "—"
          }
          icon={BarChart3}
        />
        <StatCard
          label="Total Revenue"
          value={
            data?.totals.totalAmount
              ? `$${data.totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : "—"
          }
          icon={DollarSign}
        />
      </div>

      {/* Monthly Trip Chart */}
      {data && data.monthlyData.length > 0 ? (
        <div className="card-sf p-5">
          <h3 className="text-content-primary mb-4 font-semibold">Monthly Trip Volume</h3>
          <div className="space-y-3">
            {data.monthlyData.slice(0, 12).map((month) => {
              const maxTrips = Math.max(...data.monthlyData.slice(0, 12).map((m) => m.total_trips))
              const percentage = maxTrips > 0 ? (month.total_trips / maxTrips) * 100 : 0

              return (
                <div key={month.created_month} className="flex items-center gap-4">
                  <span className="text-content-secondary w-20 text-sm">{month.created_month}</span>
                  <div className="bg-bg-tertiary h-6 flex-1 overflow-hidden rounded-full">
                    <div
                      className="bg-primary-500 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-32 text-right">
                    <span className="text-content-primary text-sm font-medium">
                      {month.total_trips.toLocaleString()} trips
                    </span>
                  </div>
                  <div className="text-content-secondary w-24 text-right text-sm">
                    ${month.total_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card-sf p-8 text-center">
          <BarChart3 className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
          <h3 className="text-content-primary text-lg font-medium">Trip History</h3>
          <p className="text-content-secondary mx-auto mt-2 max-w-md">
            {error || "No trip data available for this operator."}
          </p>
        </div>
      )}

      {/* Engagement Status */}
      <div className="card-sf p-5">
        <h3 className="text-content-primary mb-4 font-semibold">Engagement Summary</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-bg-tertiary rounded-lg p-4">
            <div className="text-content-secondary mb-1 text-sm">Engagement Status</div>
            <div
              className={cn(
                "text-lg font-semibold",
                operator.engagementStatus?.toLowerCase().includes("active")
                  ? "text-success-600 dark:text-success-500"
                  : operator.engagementStatus?.toLowerCase().includes("inactive")
                    ? "text-error-600 dark:text-error-500"
                    : "text-content-primary"
              )}
            >
              {operator.engagementStatus || "Unknown"}
            </div>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-4">
            <div className="text-content-secondary mb-1 text-sm">Last Trip</div>
            <div className="text-content-primary text-lg font-semibold">
              {operator.lastTripCreatedAt
                ? new Date(operator.lastTripCreatedAt).toLocaleDateString()
                : "—"}
            </div>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-4">
            <div className="text-content-secondary mb-1 text-sm">Avg Trips/Month</div>
            <div className="text-content-primary text-lg font-semibold">
              {data && data.totals.monthsWithData > 0
                ? Math.round(data.totals.totalTrips / data.totals.monthsWithData).toLocaleString()
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TicketsApiResponse {
  operatorId: string
  tickets: Array<{
    id: string
    title: string
    status: string | null
    priority: string | null
    stage: string | null
    tags: string[]
    createdAt: string
    updatedAt: string
    url: string
  }>
  stats: {
    total: number
    open: number
    closed: number
    highPriority: number
  }
}

function TicketsTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TicketsApiResponse | null>(null)

  useEffect(() => {
    if (!operator.operatorId || !operator.name) {
      setLoading(false)
      return
    }

    const encodedName = encodeURIComponent(operator.name)
    fetch(`/api/operator-hub/${operator.operatorId}/tickets?name=${encodedName}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tickets")
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [operator.operatorId, operator.name])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  const getStatusColor = (status: string | null) => {
    const lowerStatus = status?.toLowerCase() || ""
    if (
      lowerStatus.includes("done") ||
      lowerStatus.includes("completed") ||
      lowerStatus.includes("closed")
    ) {
      return "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
    }
    if (lowerStatus.includes("progress") || lowerStatus.includes("review")) {
      return "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
    }
    if (
      lowerStatus.includes("backlog") ||
      lowerStatus.includes("todo") ||
      lowerStatus.includes("not started")
    ) {
      return "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
    }
    return "bg-bg-tertiary text-content-tertiary"
  }

  const getPriorityColor = (priority: string | null) => {
    const lowerPriority = priority?.toLowerCase() || ""
    if (lowerPriority === "urgent" || lowerPriority === "critical") {
      return "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
    }
    if (lowerPriority === "high") {
      return "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
    }
    if (lowerPriority === "medium") {
      return "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
    }
    return "bg-bg-tertiary text-content-tertiary"
  }

  const stats = data?.stats || { total: 0, open: 0, closed: 0, highPriority: 0 }
  const tickets = data?.tickets || []

  return (
    <div className="space-y-6">
      {/* Ticket Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tickets" value={stats.total.toString()} icon={FileText} />
        <StatCard
          label="Open"
          value={stats.open.toString()}
          icon={Clock}
          variant={stats.open > 5 ? "warning" : "default"}
        />
        <StatCard label="Closed" value={stats.closed.toString()} icon={Check} variant="success" />
        <StatCard
          label="High Priority"
          value={stats.highPriority.toString()}
          icon={AlertTriangle}
          variant={stats.highPriority > 0 ? "danger" : "default"}
        />
      </div>

      {/* Tickets Table */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-content-primary font-semibold">Support Tickets</h3>
          <a
            href={`https://www.notion.so/${process.env.NEXT_PUBLIC_NOTION_TICKETS_DB || "13b8aeaa375980f88d7cdd2f627d2578"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm"
          >
            View in Notion
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {tickets.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
            <h3 className="text-content-primary text-lg font-medium">No Tickets Found</h3>
            <p className="text-content-secondary mx-auto mt-2 max-w-md">
              {error
                ? error
                : "No support tickets found for this operator. Tickets are matched by operator name in Notion."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-bg-secondary">
                <tr className="border-border-default border-b">
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Ticket
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                    Status
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                    Priority
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Tags
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-border-default border-b">
                    <td className="px-4 py-3">
                      <a
                        href={ticket.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-content-primary hover:text-primary-600 flex items-center gap-2 text-sm font-medium"
                      >
                        <span className="max-w-[300px] truncate">{ticket.title || "Untitled"}</span>
                        <ExternalLink className="text-content-tertiary h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          getStatusColor(ticket.status)
                        )}
                      >
                        {ticket.status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ticket.priority && (
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                            getPriorityColor(ticket.priority)
                          )}
                        >
                          {ticket.priority}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ticket.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="bg-bg-tertiary text-content-secondary rounded px-1.5 py-0.5 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {ticket.tags.length > 3 && (
                          <span className="text-content-tertiary text-xs">
                            +{ticket.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-right text-sm">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

interface EmailsApiResponse {
  operatorId: string
  emails: Array<{
    id: string
    subject: string
    timestamp: string
  }>
  calls: Array<{
    id: string
    disposition: string
    duration: number
    timestamp: string
  }>
  meetings: Array<{
    id: string
    title: string
    startTime: string
    endTime: string
  }>
  notes: Array<{
    id: string
    body: string
    timestamp: string
  }>
  stats: {
    totalEmails: number
    totalCalls: number
    totalMeetings: number
    emailsLast30Days: number
    emailsLast7Days: number
  }
}

interface SuppressionResult {
  email: string
  type: "bounce" | "block" | "invalid" | "spam"
  reason?: string
  created: number
}

function EmailsTab({ operator }: { operator: OperatorData }) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<EmailsApiResponse | null>(null)
  const [filter, setFilter] = useState<"all" | "emails" | "calls" | "meetings" | "notes">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // SendGrid suppression management state
  const [suppressionEmail, setSuppressionEmail] = useState("")
  const [suppressionLoading, setSuppressionLoading] = useState(false)
  const [suppressionResults, setSuppressionResults] = useState<SuppressionResult[]>([])
  const [suppressionError, setSuppressionError] = useState<string | null>(null)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

  // Global suppression reports state
  const [globalSuppressionTab, setGlobalSuppressionTab] = useState<"bounces" | "blocks" | "invalid" | "spam">("bounces")
  const [globalSuppressions, setGlobalSuppressions] = useState<{
    bounces: Array<{ email: string; created: number; reason: string; status: string }>
    blocks: Array<{ email: string; created: number; reason: string; status: string }>
    invalidEmails: Array<{ email: string; created: number; reason: string }>
    spamReports: Array<{ email: string; created: number; ip?: string }>
  } | null>(null)
  const [globalSuppressionsLoading, setGlobalSuppressionsLoading] = useState(false)
  const [selectedSuppressions, setSelectedSuppressions] = useState<Set<string>>(new Set())
  const [bulkRemoving, setBulkRemoving] = useState(false)

  const searchSuppression = async () => {
    if (!suppressionEmail.trim()) return

    setSuppressionLoading(true)
    setSuppressionError(null)
    setSuppressionResults([])

    try {
      const response = await fetch(`/api/sendgrid/suppressions?email=${encodeURIComponent(suppressionEmail.trim())}`)
      if (!response.ok) {
        throw new Error("Failed to search suppressions")
      }
      const data = await response.json()

      const results: SuppressionResult[] = []

      // Add bounces
      if (data.bounces?.length) {
        data.bounces.forEach((b: { email: string; reason: string; created: number }) => {
          results.push({ email: b.email, type: "bounce", reason: b.reason, created: b.created })
        })
      }

      // Add blocks
      if (data.blocks?.length) {
        data.blocks.forEach((b: { email: string; reason: string; created: number }) => {
          results.push({ email: b.email, type: "block", reason: b.reason, created: b.created })
        })
      }

      // Add invalid emails
      if (data.invalidEmails?.length) {
        data.invalidEmails.forEach((i: { email: string; reason: string; created: number }) => {
          results.push({ email: i.email, type: "invalid", reason: i.reason, created: i.created })
        })
      }

      // Add spam reports
      if (data.spamReports?.length) {
        data.spamReports.forEach((s: { email: string; created: number }) => {
          results.push({ email: s.email, type: "spam", created: s.created })
        })
      }

      setSuppressionResults(results)
    } catch (err) {
      setSuppressionError(err instanceof Error ? err.message : "Failed to search")
    } finally {
      setSuppressionLoading(false)
    }
  }

  const removeSuppression = async (email: string, type: "bounce" | "block" | "invalid" | "spam") => {
    setRemovingEmail(`${email}-${type}`)
    try {
      const response = await fetch(`/api/sendgrid/suppressions?email=${encodeURIComponent(email)}&type=${type}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to remove suppression")
      }
      // Remove from results
      setSuppressionResults((prev) => prev.filter((r) => !(r.email === email && r.type === type)))
    } catch (err) {
      setSuppressionError(err instanceof Error ? err.message : "Failed to remove")
    } finally {
      setRemovingEmail(null)
    }
  }

  // Load all global suppressions
  const loadGlobalSuppressions = async () => {
    setGlobalSuppressionsLoading(true)
    try {
      const response = await fetch("/api/sendgrid/suppressions?type=all")
      if (!response.ok) throw new Error("Failed to load suppressions")
      const data = await response.json()
      setGlobalSuppressions({
        bounces: data.bounces || [],
        blocks: data.blocks || [],
        invalidEmails: data.invalidEmails || [],
        spamReports: data.spamReports || [],
      })
    } catch (err) {
      console.error("Failed to load global suppressions:", err)
    } finally {
      setGlobalSuppressionsLoading(false)
    }
  }

  // Toggle selection for bulk operations
  const toggleSuppressionSelection = (email: string) => {
    setSelectedSuppressions((prev) => {
      const next = new Set(prev)
      if (next.has(email)) {
        next.delete(email)
      } else {
        next.add(email)
      }
      return next
    })
  }

  // Select/deselect all in current tab
  const toggleSelectAll = () => {
    if (!globalSuppressions) return
    const currentList = globalSuppressionTab === "bounces" ? globalSuppressions.bounces
      : globalSuppressionTab === "blocks" ? globalSuppressions.blocks
      : globalSuppressionTab === "invalid" ? globalSuppressions.invalidEmails
      : globalSuppressions.spamReports
    const allEmails = currentList.map(s => s.email)
    const allSelected = allEmails.every(e => selectedSuppressions.has(e))

    if (allSelected) {
      setSelectedSuppressions(prev => {
        const next = new Set(prev)
        allEmails.forEach(e => next.delete(e))
        return next
      })
    } else {
      setSelectedSuppressions(prev => {
        const next = new Set(prev)
        allEmails.forEach(e => next.add(e))
        return next
      })
    }
  }

  // Bulk remove selected suppressions
  const bulkRemoveSuppressions = async () => {
    if (selectedSuppressions.size === 0) return
    setBulkRemoving(true)

    const type = globalSuppressionTab === "bounces" ? "bounce"
      : globalSuppressionTab === "blocks" ? "block"
      : globalSuppressionTab === "invalid" ? "invalid"
      : "spam"

    try {
      const promises = Array.from(selectedSuppressions).map(email =>
        fetch(`/api/sendgrid/suppressions?email=${encodeURIComponent(email)}&type=${type}`, {
          method: "DELETE",
        })
      )
      await Promise.all(promises)

      // Refresh the list
      await loadGlobalSuppressions()
      setSelectedSuppressions(new Set())
    } catch (err) {
      console.error("Bulk remove failed:", err)
    } finally {
      setBulkRemoving(false)
    }
  }

  useEffect(() => {
    // Use HubSpot ID for the API call
    fetch(`/api/operator-hub/${operator.hubspotId}/emails`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch emails")
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [operator.hubspotId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  const stats = data?.stats || {
    totalEmails: 0,
    totalCalls: 0,
    totalMeetings: 0,
    emailsLast30Days: 0,
    emailsLast7Days: 0,
  }

  // Combine all activities into a unified timeline
  const allActivities: Array<{
    id: string
    type: "email" | "call" | "meeting" | "note"
    title: string
    description?: string
    timestamp: string
  }> = []

  if (data) {
    // Add emails
    data.emails.forEach((email) => {
      allActivities.push({
        id: email.id,
        type: "email",
        title: email.subject || "No subject",
        timestamp: email.timestamp,
      })
    })

    // Add calls
    data.calls.forEach((call) => {
      allActivities.push({
        id: call.id,
        type: "call",
        title: `Call - ${call.disposition || "Completed"}`,
        description: call.duration > 0 ? `${Math.round(call.duration / 60)} min` : undefined,
        timestamp: call.timestamp,
      })
    })

    // Add meetings
    data.meetings.forEach((meeting) => {
      allActivities.push({
        id: meeting.id,
        type: "meeting",
        title: meeting.title || "Meeting",
        timestamp: meeting.startTime,
      })
    })

    // Add notes
    data.notes.forEach((note) => {
      allActivities.push({
        id: note.id,
        type: "note",
        title: "Note",
        description: note.body?.slice(0, 100) + (note.body?.length > 100 ? "..." : ""),
        timestamp: note.timestamp,
      })
    })
  }

  // Sort by timestamp descending
  allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Filter activities - convert plural filter to singular activity type
  const filterTypeMap: Record<typeof filter, "email" | "call" | "meeting" | "note" | null> = {
    all: null,
    emails: "email",
    calls: "call",
    meetings: "meeting",
    notes: "note",
  }
  const filterType = filterTypeMap[filter]

  // Filter by type and search query
  const filteredActivities = allActivities.filter((a) => {
    // Type filter
    if (filterType !== null && a.type !== filterType) return false

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = a.title.toLowerCase().includes(query)
      const matchesDescription = a.description?.toLowerCase().includes(query)
      return matchesTitle || matchesDescription
    }

    return true
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "email":
        return Mail
      case "call":
        return Phone
      case "meeting":
        return Calendar
      case "note":
        return FileText
      default:
        return Clock
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "email":
        return "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
      case "call":
        return "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
      case "meeting":
        return "bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400"
      case "note":
        return "bg-bg-tertiary text-content-secondary"
      default:
        return "bg-bg-tertiary text-content-tertiary"
    }
  }

  return (
    <div className="space-y-6">
      {/* Communication Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Emails"
          value={stats.totalEmails.toString()}
          icon={Mail}
          subtext={`${stats.emailsLast7Days} last 7 days`}
        />
        <StatCard label="Calls" value={stats.totalCalls.toString()} icon={Phone} />
        <StatCard label="Meetings" value={stats.totalMeetings.toString()} icon={Calendar} />
        <StatCard
          label="Recent Activity"
          value={stats.emailsLast30Days.toString()}
          icon={Clock}
          subtext="emails in 30 days"
          variant={
            stats.emailsLast30Days > 5
              ? "success"
              : stats.emailsLast30Days === 0
                ? "warning"
                : "default"
          }
        />
      </div>

      {/* Activity Timeline */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default space-y-3 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-content-primary font-semibold">Communication History</h3>
            <div className="flex gap-1">
              {[
                { key: "all", label: "All" },
                { key: "emails", label: "Emails" },
                { key: "calls", label: "Calls" },
                { key: "meetings", label: "Meetings" },
                { key: "notes", label: "Notes" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key as typeof filter)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                    filter === f.key
                      ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                      : "text-content-secondary hover:bg-bg-secondary"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search emails, calls, meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border-default bg-bg-secondary text-content-primary placeholder:text-content-tertiary focus:border-primary-500 focus:ring-primary-500 w-full rounded-lg border py-2 pr-4 pl-9 text-sm focus:ring-1 focus:outline-none"
            />
            <svg
              className="text-content-tertiary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-content-tertiary hover:text-content-secondary absolute top-1/2 right-3 -translate-y-1/2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-content-tertiary text-xs">
              Found {filteredActivities.length} result{filteredActivities.length !== 1 ? "s" : ""}{" "}
              for &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
            <h3 className="text-content-primary text-lg font-medium">No Communication History</h3>
            <p className="text-content-secondary mx-auto mt-2 max-w-md">
              {error ? error : "No communication history found for this operator in HubSpot."}
            </p>
          </div>
        ) : (
          <div className="divide-border-default divide-y">
            {filteredActivities.slice(0, 25).map((activity) => {
              const ActivityIcon = getActivityIcon(activity.type)
              return (
                <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-4 p-4">
                  <div className={cn("rounded-lg p-2", getActivityColor(activity.type))}>
                    <ActivityIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-content-primary truncate text-sm font-medium">
                        {activity.title}
                      </p>
                      <span className="text-content-tertiary shrink-0 text-xs">
                        {new Date(activity.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year:
                            new Date(activity.timestamp).getFullYear() !== new Date().getFullYear()
                              ? "numeric"
                              : undefined,
                        })}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-content-secondary mt-1 text-sm">{activity.description}</p>
                    )}
                    <span className="text-content-tertiary mt-1 text-xs capitalize">
                      {activity.type}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {filteredActivities.length > 25 && (
          <div className="border-border-default border-t px-4 py-3 text-center">
            <p className="text-content-secondary text-sm">
              Showing 25 of {filteredActivities.length} activities
            </p>
          </div>
        )}
      </div>

      {/* SendGrid Email Deliverability */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default border-b px-4 py-3">
          <h3 className="text-content-primary font-semibold">Email Deliverability</h3>
          <p className="text-content-secondary mt-1 text-sm">
            Check if an email address is on SendGrid suppression lists (bounces, blocks, spam reports)
          </p>
        </div>

        <div className="p-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email address to check..."
              value={suppressionEmail}
              onChange={(e) => setSuppressionEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchSuppression()}
              className="input-sf flex-1 py-2"
            />
            <button
              onClick={searchSuppression}
              disabled={suppressionLoading || !suppressionEmail.trim()}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                suppressionLoading || !suppressionEmail.trim()
                  ? "cursor-not-allowed bg-bg-tertiary text-content-tertiary"
                  : "bg-primary-600 hover:bg-primary-700 text-white"
              )}
            >
              {suppressionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Check
            </button>
          </div>

          {/* Error Message */}
          {suppressionError && (
            <div className="bg-error-50 dark:bg-error-950/30 border-error-200 dark:border-error-800 mt-3 rounded-lg border p-3">
              <p className="text-error-700 dark:text-error-400 text-sm">{suppressionError}</p>
            </div>
          )}

          {/* Results */}
          {suppressionResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-content-secondary text-sm font-medium">
                Found {suppressionResults.length} suppression{suppressionResults.length !== 1 ? "s" : ""}:
              </p>
              <div className="divide-border-default divide-y rounded-lg border">
                {suppressionResults.map((result) => (
                  <div
                    key={`${result.email}-${result.type}`}
                    className="flex items-center justify-between gap-4 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs font-medium uppercase",
                            result.type === "bounce"
                              ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                              : result.type === "block"
                                ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                                : result.type === "spam"
                                  ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                  : "bg-bg-tertiary text-content-secondary"
                          )}
                        >
                          {result.type}
                        </span>
                        <span className="text-content-primary text-sm font-medium">
                          {result.email}
                        </span>
                      </div>
                      {result.reason && (
                        <p className="text-content-tertiary mt-1 truncate text-xs">
                          {result.reason}
                        </p>
                      )}
                      <p className="text-content-tertiary mt-0.5 text-xs">
                        Added: {new Date(result.created * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSuppression(result.email, result.type)}
                      disabled={removingEmail === `${result.email}-${result.type}`}
                      className={cn(
                        "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        removingEmail === `${result.email}-${result.type}`
                          ? "cursor-not-allowed bg-bg-tertiary text-content-tertiary"
                          : "bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/30 dark:text-error-400 dark:hover:bg-error-900/50"
                      )}
                    >
                      {removingEmail === `${result.email}-${result.type}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results message */}
          {suppressionResults.length === 0 && suppressionEmail && !suppressionLoading && !suppressionError && (
            <div className="bg-success-50 dark:bg-success-950/30 mt-4 rounded-lg p-4 text-center">
              <Check className="text-success-600 dark:text-success-400 mx-auto mb-2 h-8 w-8" />
              <p className="text-success-700 dark:text-success-400 text-sm font-medium">
                Email not found on any suppression list
              </p>
              <p className="text-success-600 dark:text-success-500 mt-1 text-xs">
                {suppressionEmail} can receive emails normally
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Global Suppression Reports (Admin Only) */}
      {isAdmin && (
        <div className="card-sf overflow-hidden">
          <div className="border-border-default flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="text-content-primary font-semibold">Suppression Reports</h3>
              <p className="text-content-secondary mt-1 text-sm">
                View and manage all email suppressions across the system
              </p>
            </div>
            <button
              onClick={loadGlobalSuppressions}
              disabled={globalSuppressionsLoading}
              className="btn-sf-secondary inline-flex items-center gap-2 text-sm"
            >
              {globalSuppressionsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {globalSuppressions ? "Refresh" : "Load Reports"}
            </button>
          </div>

          {globalSuppressions && (
            <div className="p-4">
              {/* Tabs */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-1">
                  {[
                    { key: "bounces", label: "Bounces", count: globalSuppressions.bounces.length },
                    { key: "blocks", label: "Blocks", count: globalSuppressions.blocks.length },
                    { key: "invalid", label: "Invalid", count: globalSuppressions.invalidEmails.length },
                    { key: "spam", label: "Spam", count: globalSuppressions.spamReports.length },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setGlobalSuppressionTab(tab.key as typeof globalSuppressionTab)
                        setSelectedSuppressions(new Set())
                      }}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        globalSuppressionTab === tab.key
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                          : "text-content-secondary hover:bg-bg-secondary"
                      )}
                    >
                      {tab.label}
                      <span className="text-content-tertiary ml-1.5 text-xs">({tab.count})</span>
                    </button>
                  ))}
                </div>

                {/* Bulk Actions */}
                {selectedSuppressions.size > 0 && (
                  <button
                    onClick={bulkRemoveSuppressions}
                    disabled={bulkRemoving}
                    className="bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/30 dark:text-error-400 dark:hover:bg-error-900/50 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                  >
                    {bulkRemoving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Remove {selectedSuppressions.size} Selected
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="border-border-default overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-bg-secondary">
                    <tr>
                      <th className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={(() => {
                            const list = globalSuppressionTab === "bounces" ? globalSuppressions.bounces
                              : globalSuppressionTab === "blocks" ? globalSuppressions.blocks
                              : globalSuppressionTab === "invalid" ? globalSuppressions.invalidEmails
                              : globalSuppressions.spamReports
                            return list.length > 0 && list.every(s => selectedSuppressions.has(s.email))
                          })()}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="text-content-secondary px-3 py-2 text-left font-medium">Email</th>
                      <th className="text-content-secondary px-3 py-2 text-left font-medium">Reason</th>
                      <th className="text-content-secondary px-3 py-2 text-left font-medium">Date</th>
                      <th className="text-content-secondary w-20 px-3 py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-default divide-y">
                    {(() => {
                      const list = globalSuppressionTab === "bounces" ? globalSuppressions.bounces
                        : globalSuppressionTab === "blocks" ? globalSuppressions.blocks
                        : globalSuppressionTab === "invalid" ? globalSuppressions.invalidEmails
                        : globalSuppressions.spamReports

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-content-tertiary px-3 py-8 text-center">
                              No {globalSuppressionTab} found
                            </td>
                          </tr>
                        )
                      }

                      return list.slice(0, 50).map((item) => (
                        <tr key={item.email} className="hover:bg-bg-secondary">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedSuppressions.has(item.email)}
                              onChange={() => toggleSuppressionSelection(item.email)}
                              className="rounded"
                            />
                          </td>
                          <td className="text-content-primary px-3 py-2 font-medium">{item.email}</td>
                          <td className="text-content-secondary max-w-xs truncate px-3 py-2">
                            {"reason" in item ? item.reason : "ip" in item ? `IP: ${item.ip || "N/A"}` : "—"}
                          </td>
                          <td className="text-content-tertiary px-3 py-2">
                            {new Date(item.created * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => removeSuppression(
                                item.email,
                                globalSuppressionTab === "bounces" ? "bounce"
                                  : globalSuppressionTab === "blocks" ? "block"
                                  : globalSuppressionTab === "invalid" ? "invalid"
                                  : "spam"
                              )}
                              disabled={removingEmail === `${item.email}-${globalSuppressionTab.slice(0, -1)}`}
                              className="text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300 text-xs font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
                {(() => {
                  const list = globalSuppressionTab === "bounces" ? globalSuppressions.bounces
                    : globalSuppressionTab === "blocks" ? globalSuppressions.blocks
                    : globalSuppressionTab === "invalid" ? globalSuppressions.invalidEmails
                    : globalSuppressions.spamReports
                  return list.length > 50 && (
                    <div className="border-border-default border-t px-3 py-2 text-center">
                      <p className="text-content-tertiary text-xs">
                        Showing 50 of {list.length} records
                      </p>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {!globalSuppressions && !globalSuppressionsLoading && (
            <div className="p-8 text-center">
              <Mail className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
              <p className="text-content-secondary text-sm">
                Click "Load Reports" to view all suppression lists
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Trips Tab
// ============================================================================

interface TripsApiResponse {
  operatorId: string
  trips: Array<{
    trip_id: string
    request_id: string
    status: string
    pickup_location: string | null
    dropoff_location: string | null
    scheduled_at: string | null
    completed_at: string | null
    driver_name: string | null
    passenger_name: string | null
    total_amount: number | null
  }>
  analytics: Array<{
    month: string
    total_requests: number
    completed_requests: number
    cancelled_requests: number
    total_revenue: number
  }>
  summary: {
    totalTrips: number
    completedTrips: number
    cancelledTrips: number
    completionRate: number
    totalRevenue: number
  }
}

function TripsTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TripsApiResponse | null>(null)

  useEffect(() => {
    if (!operator.operatorId) {
      setLoading(false)
      return
    }

    fetch(`/api/operator-hub/${operator.operatorId}/trips`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch trips")
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [operator.operatorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card-sf p-8 text-center">
        <Car className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
        <h3 className="text-content-primary text-lg font-medium">Trips & Requests</h3>
        <p className="text-content-secondary mx-auto mt-2 max-w-md">
          {error || "No trip data available for this operator."}
        </p>
      </div>
    )
  }

  const { trips, analytics, summary } = data

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Trips"
          value={summary.totalTrips.toString()}
          icon={Car}
          subtext="All time"
        />
        <StatCard
          label="Completed"
          value={summary.completedTrips.toString()}
          icon={Check}
          variant="success"
          subtext={`${summary.completionRate.toFixed(1)}% rate`}
        />
        <StatCard
          label="Cancelled"
          value={summary.cancelledTrips.toString()}
          icon={AlertTriangle}
          variant={summary.cancelledTrips > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Total Revenue"
          value={`$${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
      </div>

      {/* Monthly Analytics */}
      {analytics.length > 0 && (
        <div className="card-sf overflow-hidden">
          <div className="border-border-default border-b px-4 py-3">
            <h3 className="text-content-primary font-semibold">Monthly Analytics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-bg-secondary">
                <tr className="border-border-default border-b">
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Month
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                    Requests
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                    Completed
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                    Cancelled
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.slice(0, 12).map((row) => (
                  <tr key={row.month} className="border-border-default border-b">
                    <td className="text-content-primary px-4 py-3 text-sm font-medium">
                      {row.month}
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-right text-sm">
                      {row.total_requests}
                    </td>
                    <td className="text-success-600 dark:text-success-400 px-4 py-3 text-right text-sm">
                      {row.completed_requests}
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-right text-sm">
                      {row.cancelled_requests}
                    </td>
                    <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                      ${row.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Trips */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default border-b px-4 py-3">
          <h3 className="text-content-primary font-semibold">Recent Trips</h3>
        </div>
        {trips.length === 0 ? (
          <div className="p-8 text-center">
            <Car className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
            <p className="text-content-secondary">No trips found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-bg-secondary">
                <tr className="border-border-default border-b">
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Date
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Passenger
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Driver
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Route
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-center text-xs font-semibold uppercase">
                    Status
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-right text-xs font-semibold uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {trips.slice(0, 25).map((trip) => (
                  <tr key={trip.trip_id} className="border-border-default border-b">
                    <td className="text-content-secondary px-4 py-3 text-sm">
                      {trip.scheduled_at ? new Date(trip.scheduled_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-content-primary px-4 py-3 text-sm">
                      {trip.passenger_name || "—"}
                    </td>
                    <td className="text-content-secondary px-4 py-3 text-sm">
                      {trip.driver_name || "—"}
                    </td>
                    <td className="text-content-secondary max-w-[200px] truncate px-4 py-3 text-sm">
                      {trip.pickup_location && trip.dropoff_location
                        ? `${trip.pickup_location.split(",")[0]} → ${trip.dropoff_location.split(",")[0]}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          trip.status === "completed"
                            ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                            : trip.status === "cancelled"
                              ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                              : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                        )}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                      {trip.total_amount
                        ? `$${trip.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {trips.length > 25 && (
          <div className="border-border-default border-t px-4 py-3 text-center">
            <p className="text-content-secondary text-sm">Showing 25 of {trips.length} trips</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Feedback Tab
// ============================================================================

interface FeedbackApiResponse {
  operatorId: string
  feedback: Array<{
    feedback_id: string
    title: string | null
    description: string | null
    product_type: string | null
    path: string | null
    created_at: string
    user_first_name: string | null
    user_last_name: string | null
    user_email: string | null
  }>
  count: number
}

function FeedbackTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FeedbackApiResponse | null>(null)

  useEffect(() => {
    if (!operator.operatorId) {
      setLoading(false)
      return
    }

    fetch(`/api/operator-hub/${operator.operatorId}/feedback`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch feedback")
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [operator.operatorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !data || data.feedback.length === 0) {
    return (
      <div className="card-sf p-8 text-center">
        <MessageSquare className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
        <h3 className="text-content-primary text-lg font-medium">Customer Feedback</h3>
        <p className="text-content-secondary mx-auto mt-2 max-w-md">
          {error || "No customer feedback has been submitted yet."}
        </p>
        <p className="text-content-tertiary mt-4 text-sm">
          Feedback from the customer portal will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Feedback" value={data.count.toString()} icon={MessageSquare} />
        <StatCard
          label="Product Types"
          value={[
            ...new Set(data.feedback.map((f) => f.product_type).filter(Boolean)),
          ].length.toString()}
          icon={Tag}
        />
        <StatCard
          label="Latest"
          value={
            data.feedback[0] ? new Date(data.feedback[0].created_at).toLocaleDateString() : "—"
          }
          icon={Calendar}
        />
      </div>

      {/* Feedback List */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default border-b px-4 py-3">
          <h3 className="text-content-primary font-semibold">Customer Feedback</h3>
        </div>
        <div className="divide-border-default divide-y">
          {data.feedback.map((item) => (
            <div key={item.feedback_id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-content-primary font-medium">
                      {item.title || "Untitled Feedback"}
                    </h4>
                    {item.product_type && (
                      <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded-full px-2 py-0.5 text-xs font-medium">
                        {item.product_type}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-content-secondary mt-1 text-sm">{item.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                    <span className="text-content-tertiary">
                      {item.user_first_name || item.user_last_name
                        ? `${item.user_first_name || ""} ${item.user_last_name || ""}`.trim()
                        : item.user_email || "Anonymous"}
                    </span>
                    {item.path && (
                      <span className="text-content-tertiary">
                        Path: <code className="bg-bg-tertiary rounded px-1">{item.path}</code>
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-content-tertiary shrink-0 text-xs">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// History Tab
// ============================================================================

interface HistoryEntry {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  metadata: {
    eventType: string
    planName: string | null
    previousPlan: string | null
    amount: number | null
    notes: string | null
  }
}

interface HistoryApiResponse {
  operatorId: string
  history: HistoryEntry[]
  count: number
}

function HistoryTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<HistoryApiResponse | null>(null)

  useEffect(() => {
    if (!operator.operatorId) {
      setLoading(false)
      return
    }

    fetch(`/api/operator-hub/${operator.operatorId}/history`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch history")
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [operator.operatorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    )
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "subscription":
        return <CreditCard className="h-4 w-4" />
      case "plan_change":
        return <TrendingUp className="h-4 w-4" />
      case "payment":
        return <DollarSign className="h-4 w-4" />
      case "member":
        return <Users className="h-4 w-4" />
      case "settings":
        return <Settings className="h-4 w-4" />
      default:
        return <History className="h-4 w-4" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case "subscription":
        return "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
      case "plan_change":
        return "bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400"
      case "payment":
        return "bg-info-100 text-info-600 dark:bg-info-900/30 dark:text-info-400"
      case "member":
        return "bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400"
      default:
        return "bg-surface-muted text-content-secondary"
    }
  }

  if (error || !data || data.history.length === 0) {
    return (
      <div className="card-sf p-8 text-center">
        <History className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
        <h3 className="text-content-primary text-lg font-medium">Change History</h3>
        <p className="text-content-secondary mx-auto mt-2 max-w-md">
          {error || "No history records found for this operator."}
        </p>
        <p className="text-content-tertiary mt-4 text-sm">
          Subscription changes, plan updates, and other events will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Events"
          value={data.count.toString()}
          icon={History}
          subtext="All time"
        />
        <StatCard
          label="Subscription Events"
          value={data.history
            .filter((h) => h.type === "subscription" || h.type === "plan_change")
            .length.toString()}
          icon={CreditCard}
        />
        <StatCard
          label="Recent Activity"
          value={data.history[0] ? new Date(data.history[0].timestamp).toLocaleDateString() : "—"}
          icon={Calendar}
          subtext="Last event"
        />
      </div>

      {/* Timeline */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default border-b px-4 py-3">
          <h3 className="text-content-primary font-semibold">Activity Timeline</h3>
        </div>
        <div className="divide-border-default divide-y">
          {data.history.slice(0, 50).map((entry) => (
            <div key={entry.id} className="flex gap-4 px-4 py-4">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  getEventColor(entry.type)
                )}
              >
                {getEventIcon(entry.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-content-primary font-medium">{entry.title}</p>
                    {entry.description && (
                      <p className="text-content-secondary mt-0.5 text-sm">{entry.description}</p>
                    )}
                  </div>
                  <span className="text-content-tertiary shrink-0 text-xs">
                    {new Date(entry.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year:
                        new Date(entry.timestamp).getFullYear() !== new Date().getFullYear()
                          ? "numeric"
                          : undefined,
                    })}
                  </span>
                </div>
                {entry.metadata.amount && entry.metadata.amount > 0 && (
                  <span className="text-content-secondary mt-1 inline-block text-sm">
                    ${(entry.metadata.amount / 100).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {data.history.length > 50 && (
          <div className="border-border-default border-t px-4 py-3 text-center">
            <p className="text-content-secondary text-sm">
              Showing 50 of {data.history.length} events
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function OperatorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const operatorId = params.operatorId as string

  const [operator, setOperator] = useState<OperatorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  useEffect(() => {
    if (!operatorId) return

    // Fetch operator data from existing API
    fetch(`/api/integrations/accounts/${operatorId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Operator not found")
        return res.json()
      })
      .then((data) => {
        // Map API response to our OperatorData type
        setOperator({
          id: data.id,
          hubspotId: data.id,
          operatorId: data.operatorId || null,
          stripeAccountId: data.stripeAccountId || null,
          name: data.name,
          domain: data.domain,
          plan: data.plan,
          planCode: data.planCode,
          mrr: data.mrr,
          subscriptionStatus: data.subscriptionStatus || "active",
          healthScore: data.healthScore,
          numericHealthScore: data.numericHealthScore || null,
          paymentHealth: data.paymentHealth?.paymentStatus || null,
          riskSignals: data.riskSignals || [],
          positiveSignals: data.positiveSignals || [],
          totalTrips: data.totalTrips,
          tripsLast30Days: data.tripsLast30Days,
          vehiclesTotal: data.vehiclesTotal,
          driversCount: data.driversCount,
          membersCount: data.membersCount,
          setupScore: data.setupScore,
          daysSinceLastLogin: data.daysSinceLastLogin,
          engagementStatus: data.engagementStatus,
          lastTripCreatedAt: data.lastTripCreatedAt,
          city: data.city,
          state: data.state,
          country: data.country,
          ownerName: data.ownerName,
          ownerEmail: data.ownerEmail,
          contacts: data.contacts || [],
          lastSyncedAt: data.lastSyncedAt,
        })
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [operatorId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !operator) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="text-warning-500 mb-4 h-12 w-12" />
          <h2 className="text-content-primary text-xl font-semibold">Operator not found</h2>
          <p className="text-content-secondary mt-2">
            {error || "Unable to load operator details"}
          </p>
          <button
            onClick={() => router.back()}
            className="btn-primary mt-6 inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/matrix"
          className="text-content-secondary hover:text-content-primary inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Operator Hub
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-bg-tertiary flex h-14 w-14 items-center justify-center rounded-xl">
              <Building2 className="text-content-secondary h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-content-primary text-2xl font-bold">{operator.name}</h1>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    getHealthColor(operator.healthScore)
                  )}
                >
                  {operator.healthScore || "Unknown"}
                </span>
              </div>
              {operator.domain && (
                <a
                  href={`https://${operator.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 mt-1 flex items-center gap-1 text-sm"
                >
                  {operator.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {/* IDs */}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                {operator.operatorId && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-content-tertiary">Operator:</span>
                    <code className="bg-bg-tertiary rounded px-1.5 py-0.5 font-mono">
                      {operator.operatorId.slice(0, 8)}...
                    </code>
                    <CopyButton text={operator.operatorId} label="Operator ID" />
                  </div>
                )}
                {operator.stripeAccountId && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-content-tertiary">Stripe:</span>
                    <code className="bg-bg-tertiary rounded px-1.5 py-0.5 font-mono">
                      {operator.stripeAccountId.slice(0, 12)}...
                    </code>
                    <CopyButton text={operator.stripeAccountId} label="Stripe ID" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Last synced */}
          {operator.lastSyncedAt && (
            <div className="text-content-tertiary flex items-center gap-1.5 text-xs">
              <RefreshCw className="h-3 w-3" />
              Synced {new Date(operator.lastSyncedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-border-default border-b">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "text-content-secondary hover:text-content-primary border-transparent"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "overview" && <OverviewTab operator={operator} />}
          {activeTab === "payments" && <PaymentsTab operator={operator} />}
          {activeTab === "risk" && <RiskTab operator={operator} />}
          {activeTab === "quotes" && <QuotesTab operator={operator} />}
          {activeTab === "features" && <FeaturesTab operator={operator} />}
          {activeTab === "activity" && <ActivityTab operator={operator} />}
          {activeTab === "trips" && <TripsTab operator={operator} />}
          {activeTab === "tickets" && <TicketsTab operator={operator} />}
          {activeTab === "emails" && <EmailsTab operator={operator} />}
          {activeTab === "feedback" && <FeedbackTab operator={operator} />}
          {activeTab === "history" && <HistoryTab operator={operator} />}
        </div>
      </div>
    </DashboardLayout>
  )
}
