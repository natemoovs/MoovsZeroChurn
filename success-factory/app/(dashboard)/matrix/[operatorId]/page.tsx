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
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

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

type TabId = "overview" | "payments" | "risk" | "features" | "activity"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "risk", label: "Risk", icon: Shield },
  { id: "features", label: "Features", icon: Settings },
  { id: "activity", label: "Activity", icon: BarChart3 },
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
      {copied ? <Check className="h-3 w-3 text-success-500" /> : <Copy className="h-3 w-3" />}
      <span className="sr-only">Copy {label}</span>
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

function OverviewTab({ operator }: { operator: OperatorData }) {
  const location = [operator.city, operator.state, operator.country].filter(Boolean).join(", ")

  return (
    <div className="space-y-6">
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
          subtext={operator.tripsLast30Days ? `${operator.tripsLast30Days} last 30 days` : undefined}
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
            <span className="text-content-primary flex-1 text-sm font-medium">Full Account View</span>
            <ChevronRight className="text-content-tertiary h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function PaymentsTab({ operator }: { operator: OperatorData }) {
  const [loading, setLoading] = useState(true)
  const [charges, setCharges] = useState<PlatformCharge[]>([])
  const [summary, setSummary] = useState<MonthlyChargeSummary[]>([])

  useEffect(() => {
    // TODO: Fetch from Snowflake API when credentials are configured
    // For now, show placeholder
    setLoading(false)
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
      {/* Payment Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Volume" value="—" icon={DollarSign} subtext="All time" />
        <StatCard label="This Month" value="—" icon={Calendar} />
        <StatCard label="Success Rate" value="—" icon={Check} />
        <StatCard label="Failed Payments" value="—" icon={AlertTriangle} />
      </div>

      {/* Placeholder for charges table */}
      <div className="card-sf p-8 text-center">
        <CreditCard className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
        <h3 className="text-content-primary text-lg font-medium">Payment History</h3>
        <p className="text-content-secondary mt-2 max-w-md mx-auto">
          Configure Snowflake credentials to view platform charges, payment history, and monthly
          summaries for this operator.
        </p>
        <p className="text-content-tertiary mt-4 text-sm">
          Required: SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD
        </p>
      </div>
    </div>
  )
}

function RiskTab({ operator }: { operator: OperatorData }) {
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
        <StatCard label="Risk Score" value="—" icon={AlertTriangle} subtext="Avg transaction risk" />
        <StatCard label="Failed Payments" value="—" icon={CreditCard} subtext="Last 90 days" />
        <StatCard label="Disputes" value="—" icon={FileText} />
      </div>

      {/* Placeholder */}
      <div className="card-sf p-8 text-center">
        <Shield className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
        <h3 className="text-content-primary text-lg font-medium">Risk Overview</h3>
        <p className="text-content-secondary mt-2 max-w-md mx-auto">
          Configure Snowflake credentials to view detailed risk analysis, bank account information,
          and dispute history.
        </p>
      </div>
    </div>
  )
}

function FeaturesTab({ operator }: { operator: OperatorData }) {
  return (
    <div className="space-y-6">
      {/* Feature Usage Stats */}
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
        <StatCard label="Vehicles" value={operator.vehiclesTotal?.toString() || "—"} icon={Car} />
        <StatCard label="Drivers" value={operator.driversCount?.toString() || "—"} icon={Users} />
        <StatCard
          label="Members"
          value={operator.membersCount?.toString() || "—"}
          icon={Users}
        />
      </div>

      {/* Placeholder */}
      <div className="card-sf p-8 text-center">
        <Settings className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
        <h3 className="text-content-primary text-lg font-medium">Feature Configuration</h3>
        <p className="text-content-secondary mt-2 max-w-md mx-auto">
          Configure PostgreSQL read-only credentials to view operator settings, feature flags, promo
          codes, and zones.
        </p>
        <p className="text-content-tertiary mt-4 text-sm">Required: MOOVS_POSTGRES_URL</p>
      </div>
    </div>
  )
}

function ActivityTab({ operator }: { operator: OperatorData }) {
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
        <StatCard label="Engagement" value={operator.engagementStatus || "—"} icon={BarChart3} />
        <StatCard label="Emails Sent" value="—" icon={Mail} subtext="Last 30 days" />
      </div>

      {/* Placeholder */}
      <div className="card-sf p-8 text-center">
        <BarChart3 className="text-content-tertiary mx-auto mb-4 h-12 w-12" />
        <h3 className="text-content-primary text-lg font-medium">Activity & Communication</h3>
        <p className="text-content-secondary mt-2 max-w-md mx-auto">
          Configure SendGrid and Snowflake to view email history, SMS logs, and detailed activity
          timeline.
        </p>
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
          paymentHealth: data.paymentHealth,
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
          <p className="text-content-secondary mt-2">{error || "Unable to load operator details"}</p>
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
        </div>
      </div>
    </DashboardLayout>
  )
}
