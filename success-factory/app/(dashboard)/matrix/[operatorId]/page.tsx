"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
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
  Link2,
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

interface PlatformCharge {
  id: string
  chargeId: string
  amount: number
  status: string
  createdAt: string
  description: string | null
  customerEmail: string | null
}

interface MonthlyChargeSummary {
  month: string
  totalAmount: number
  chargeCount: number
  successCount: number
  failedCount: number
}

type TabId = "overview" | "payments" | "risk" | "features" | "activity" | "tickets" | "emails"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "risk", label: "Risk", icon: Shield },
  { id: "features", label: "Features", icon: Settings },
  { id: "activity", label: "Activity", icon: BarChart3 },
  { id: "tickets", label: "Tickets", icon: FileText },
  { id: "emails", label: "Emails", icon: Mail },
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
          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
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

  const handlePlanChangeSuccess = () => {
    // Refresh the page to get updated plan info
    window.location.reload()
  }

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
          {operator.domain && (
            <a
              href={`https://${operator.domain}`}
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

function PaymentsTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ChargesApiResponse | null>(null)

  useEffect(() => {
    if (!operator.operatorId) {
      setLoading(false)
      return
    }

    fetch(`/api/operator-hub/${operator.operatorId}/charges`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch charges")
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
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Volume" value="—" icon={DollarSign} subtext="All time" />
          <StatCard label="This Month" value="—" icon={Calendar} />
          <StatCard label="Success Rate" value="—" icon={Check} />
          <StatCard label="Failed Payments" value="—" icon={AlertTriangle} />
        </div>
        <div className="card-sf p-8 text-center">
          <CreditCard className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
          <h3 className="text-content-primary text-lg font-medium">Payment History</h3>
          <p className="text-content-secondary mx-auto mt-2 max-w-md">
            {error || "Configure Metabase to view platform charges and payment history."}
          </p>
          <p className="text-content-tertiary mt-4 text-sm">
            Required: METABASE_URL, METABASE_API_KEY
          </p>
        </div>
      </div>
    )
  }

  const { charges, totals } = data

  return (
    <div className="space-y-6">
      {/* Payment Stats */}
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

      {/* Stripe Connected Account Live Data */}
      {operator.stripeAccountId && operator.operatorId && (
        <StripeLiveDataCard
          stripeAccountId={operator.stripeAccountId}
          operatorId={operator.operatorId}
        />
      )}

      {/* Charges Table */}
      <div className="card-sf overflow-hidden">
        <div className="border-border-default border-b px-4 py-3">
          <h3 className="text-content-primary font-semibold">Recent Charges</h3>
        </div>
        {charges.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
            <p className="text-content-secondary">No charges found for this operator.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-bg-secondary">
                <tr className="border-border-default border-b">
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Date
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Description
                  </th>
                  <th className="text-content-secondary px-4 py-3 text-left text-xs font-semibold uppercase">
                    Customer
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
                {charges.slice(0, 25).map((charge) => (
                  <tr key={charge.charge_id} className="border-border-default border-b">
                    <td className="text-content-secondary px-4 py-3 text-sm">
                      {new Date(charge.created_date).toLocaleDateString()}
                    </td>
                    <td className="text-content-primary max-w-[200px] truncate px-4 py-3 text-sm">
                      {charge.description || "Platform charge"}
                    </td>
                    <td className="text-content-secondary max-w-[200px] truncate px-4 py-3 text-sm">
                      {charge.customer_email || "—"}
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
                    </td>
                    <td className="text-content-primary px-4 py-3 text-right text-sm font-medium">
                      $
                      {charge.total_dollars_charged.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {charges.length > 25 && (
          <div className="border-border-default border-t px-4 py-3 text-center">
            <p className="text-content-secondary text-sm">Showing 25 of {charges.length} charges</p>
          </div>
        )}
      </div>
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

function StripeLiveDataCard({ stripeAccountId, operatorId }: { stripeAccountId: string; operatorId: string }) {
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
              {data.balance.pending > 0 && `${formatCurrency(data.balance.pending, data.balance.currency)} pending • `}
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
              <p className="text-content-tertiary text-xs">Recent Volume ({data.charges.stats.totalCount} charges)</p>
              <p className="text-content-primary text-lg font-semibold">
                {formatCurrency(data.charges.stats.totalVolume, data.charges.stats.currency)}
              </p>
            </div>
          </div>

          {/* Recent Payouts */}
          {data.payouts.length > 0 && (
            <div className="border-border-default border-t px-4 py-3">
              <h4 className="text-content-secondary mb-2 text-xs font-medium uppercase">Recent Payouts</h4>
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
                      <span className="text-content-tertiary text-xs capitalize">{payout.status}</span>
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
              <h4 className="text-content-secondary mb-2 text-xs font-medium uppercase">Recent Charges</h4>
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
                  <p className="text-error-700 dark:text-error-400 text-sm font-medium">Action Required</p>
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

function RiskTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RiskApiResponse | null>(null)

  useEffect(() => {
    if (!operator.operatorId) {
      setLoading(false)
      return
    }

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
  }

  return (
    <div className="space-y-6">
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
  stats: {
    totalPromoCodes: number
    activePromoCodes: number
    totalZones: number
    totalRules: number
    activeRules: number
    totalContacts: number
    totalBankAccounts: number
    totalSubscriptionEvents: number
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
  currentPlan,
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
  const [selectedPlan, setSelectedPlan] = useState<string>("")

  useEffect(() => {
    if (isOpen && operatorId) {
      setLoading(true)
      setError(null)
      fetch(`/api/operator-hub/${operatorId}/subscription`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load subscription data")
          return res.json()
        })
        .then((result) => {
          setData(result)
          setSelectedPlan(result.currentSubscription?.planCode || "")
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    }
  }, [isOpen, operatorId])

  const handleChangePlan = async () => {
    if (!selectedPlan || !data?.currentSubscription) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/operator-hub/${operatorId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: data.currentSubscription.id,
          planCode: selectedPlan,
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
    if (!selectedPlan) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/operator-hub/${operatorId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: selectedPlan,
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

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(cents / 100)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-primary border-border-default w-full max-w-lg rounded-lg border shadow-xl">
        <div className="border-border-default flex items-center justify-between border-b p-4">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
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
                  <h4 className="text-content-secondary mb-2 text-xs font-medium uppercase">Current Plan</h4>
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
                  {data?.currentSubscription ? "Select New Plan" : "Select Plan"}
                </label>
                {data?.availablePlans && data.availablePlans.length > 0 ? (
                  <div className="space-y-2">
                    {data.availablePlans.map((plan) => (
                      <label
                        key={plan.code}
                        className={cn(
                          "border-border-default flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors",
                          selectedPlan === plan.code
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                            : "hover:bg-bg-secondary"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="plan"
                            value={plan.code}
                            checked={selectedPlan === plan.code}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            className="text-primary-600"
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
                    ))}
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
              disabled={saving || !selectedPlan || selectedPlan === data.currentSubscription.planCode}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Change Plan
            </button>
          ) : (
            <button
              onClick={handleCreateSubscription}
              disabled={saving || !selectedPlan}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Subscription
            </button>
          )}
        </div>
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

  const fetchData = async () => {
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
  }

  useEffect(() => {
    fetchData()
  }, [operator.operatorId])

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

        {/* Drivers Section */}
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
              <div className="divide-border-default divide-y">
                {data.drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center gap-4 p-4">
                    <div className="bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                      {driver.firstName?.[0] || "D"}
                      {driver.lastName?.[0] || ""}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary text-sm font-medium">
                        {driver.firstName || driver.lastName
                          ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim()
                          : "Unknown Driver"}
                      </p>
                      <div className="flex gap-3 text-xs">
                        {driver.email && (
                          <span className="text-content-secondary">{driver.email}</span>
                        )}
                        {driver.phone && (
                          <span className="text-content-tertiary">{driver.phone}</span>
                        )}
                      </div>
                    </div>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vehicles Section */}
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
              <div className="divide-border-default divide-y">
                {data.vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center gap-4 p-4">
                    <div className="bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Car className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-content-primary text-sm font-medium">
                        {vehicle.name || vehicle.type || "Unknown Vehicle"}
                      </p>
                      <div className="flex gap-3 text-xs">
                        {vehicle.type && (
                          <span className="text-content-secondary capitalize">{vehicle.type}</span>
                        )}
                        {vehicle.color && (
                          <span className="text-content-tertiary capitalize">{vehicle.color}</span>
                        )}
                        {vehicle.licensePlate && (
                          <span className="text-content-tertiary font-mono">
                            {vehicle.licensePlate}
                          </span>
                        )}
                      </div>
                    </div>
                    {vehicle.capacity && (
                      <span className="text-content-secondary text-sm">
                        {vehicle.capacity} seats
                      </span>
                    )}
                  </div>
                ))}
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

        {/* Bank Accounts Section */}
        {configSection === "bank" && (
          <div>
            {!platformData?.bankAccounts || platformData.bankAccounts.length === 0 ? (
              <div className="p-8 text-center">
                <Landmark className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
                <h3 className="text-content-primary text-lg font-medium">No Bank Accounts</h3>
                <p className="text-content-secondary mx-auto mt-2 max-w-md">
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

function EmailsTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<EmailsApiResponse | null>(null)
  const [filter, setFilter] = useState<"all" | "emails" | "calls" | "meetings" | "notes">("all")
  const [searchQuery, setSearchQuery] = useState("")

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
              className="border-border-default bg-bg-secondary text-content-primary placeholder:text-content-tertiary w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <svg
              className="text-content-tertiary absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
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
                className="text-content-tertiary hover:text-content-secondary absolute right-3 top-1/2 -translate-y-1/2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-content-tertiary text-xs">
              Found {filteredActivities.length} result{filteredActivities.length !== 1 ? "s" : ""} for "{searchQuery}"
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
          {activeTab === "features" && <FeaturesTab operator={operator} />}
          {activeTab === "activity" && <ActivityTab operator={operator} />}
          {activeTab === "tickets" && <TicketsTab operator={operator} />}
          {activeTab === "emails" && <EmailsTab operator={operator} />}
        </div>
      </div>
    </DashboardLayout>
  )
}
