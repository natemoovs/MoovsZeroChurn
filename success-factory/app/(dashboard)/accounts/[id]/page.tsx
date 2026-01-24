"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { HealthBadge } from "@/components/health-badge"
import { OnboardingProgress } from "@/components/onboarding-progress"
import { ActivityTimeline } from "@/components/activity-timeline"
import { StakeholderMap } from "@/components/stakeholder-map"
import { NPSSummary } from "@/components/nps-summary"
import {
  ArrowLeft,
  Building2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  PhoneCall,
  Video,
  Briefcase,
  ExternalLink,
  Sparkles,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Route,
  ChevronDown,
  Database,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface HealthSnapshot {
  id: string
  healthScore: string
  mrr: number | null
  totalTrips: number | null
  daysSinceLastLogin: number | null
  riskSignals: string[]
  positiveSignals: string[]
  createdAt: string
}

interface HealthHistory {
  companyId: string
  snapshots: HealthSnapshot[]
  trend: "improving" | "declining" | "stable" | "unknown"
  current: {
    healthScore: string
    mrr: number | null
    riskSignals: string[]
    positiveSignals: string[]
    asOf: string
  } | null
  distribution: {
    green: number
    yellow: number
    red: number
    unknown: number
  }
  changes: Array<{
    from: string
    to: string
    date: string
  }>
  totalSnapshots: number
}

interface JourneyStageHistory {
  id: string
  fromStage: string | null
  toStage: string
  changedBy: string | null
  reason: string | null
  createdAt: string
}

interface CustomerJourney {
  id: string
  companyId: string
  companyName: string
  stage: string
  previousStage: string | null
  stageChangedAt: string
  notes: string | null
  history: JourneyStageHistory[]
}

const JOURNEY_STAGES = [
  { id: "onboarding", label: "Onboarding", color: "bg-blue-500" },
  { id: "adoption", label: "Adoption", color: "bg-purple-500" },
  { id: "growth", label: "Growth", color: "bg-emerald-500" },
  { id: "maturity", label: "Maturity", color: "bg-teal-500" },
  { id: "renewal", label: "Renewal", color: "bg-amber-500" },
  { id: "at_risk", label: "At Risk", color: "bg-red-500" },
  { id: "churned", label: "Churned", color: "bg-zinc-500" },
] as const

interface AccountDetail {
  id: string
  name: string
  domain: string | null
  industry: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
  country: string | null
  description: string | null
  lifecycleStage: string | null
  customerSince: string | null
  lastModified: string | null
  healthScore: "green" | "yellow" | "red" | "unknown"
  riskSignals: string[]
  positiveSignals: string[]
  mrr: number | null
  plan: string | null
  customerSegment: string | null
  totalTrips: number | null
  daysSinceLastLogin: number | null
  churnStatus: string | null
  contacts: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    jobTitle: string | null
    lastModified: string | null
  }>
  deals: Array<{
    id: string
    name: string
    amount: number | null
    stage: string | null
    closeDate: string | null
    createdAt: string | null
  }>
  timeline: Array<{
    id: string
    type: "note" | "email" | "call" | "meeting" | "deal" | "health_change"
    title: string
    description?: string
    timestamp: string
  }>
  hasHubSpotRecord: boolean
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [healthHistory, setHealthHistory] = useState<HealthHistory | null>(null)
  const [journey, setJourney] = useState<CustomerJourney | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    // Fetch account details, health history, and journey in parallel
    Promise.all([
      fetch(`/api/integrations/accounts/${id}`).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch account")
        return res.json()
      }),
      fetch(`/api/health-history/${id}?days=30`).then((res) => {
        if (!res.ok) return null
        return res.json()
      }).catch(() => null),
      fetch(`/api/journey/${id}`).then((res) => {
        if (!res.ok) return null
        return res.json()
      }).catch(() => null),
    ])
      .then(([accountData, historyData, journeyData]) => {
        setAccount(accountData)
        if (historyData) setHealthHistory(historyData)
        if (journeyData?.journey) setJourney(journeyData.journey)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <DashboardLayout>
        <AccountDetailSkeleton />
      </DashboardLayout>
    )
  }

  if (error || !account) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Account not found
          </h2>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            {error || "Unable to load account details"}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const location = [account.city, account.state, account.country]
    .filter(Boolean)
    .join(", ")

  const handleJourneyUpdate = async (newStage: string, reason?: string) => {
    try {
      const res = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: account.id,
          companyName: account.name,
          stage: newStage,
          reason,
          changedBy: "manual",
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        // Refetch journey with history
        const journeyRes = await fetch(`/api/journey/${account.id}`)
        if (journeyRes.ok) {
          const journeyData = await journeyRes.json()
          if (journeyData?.journey) setJourney(journeyData.journey)
        }
      }
    } catch (err) {
      console.error("Failed to update journey:", err)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back button */}
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to accounts
        </Link>

        {/* No HubSpot record indicator */}
        {!account.hasHubSpotRecord && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Metabase data only
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This operator doesn&apos;t have a HubSpot company record. Contacts, deals, and activity timeline may be limited.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <Building2 className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {account.name}
                </h1>
                <HealthBadge score={account.healthScore} size="lg" />
              </div>
              {account.domain && (
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                  {account.domain}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                {account.plan && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium dark:bg-zinc-800">
                    {account.plan}
                  </span>
                )}
                {account.customerSegment && (
                  <span>{account.customerSegment}</span>
                )}
                {account.industry && <span>{account.industry}</span>}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Link
              href={`/skills/customer-health?company=${encodeURIComponent(account.name)}`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Sparkles className="h-4 w-4" />
              Generate Brief
            </Link>
            {account.website && (
              <a
                href={account.website.startsWith("http") ? account.website : `https://${account.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <ExternalLink className="h-4 w-4" />
                Website
              </a>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Monthly Revenue"
            value={account.mrr ? `$${account.mrr.toLocaleString()}` : "—"}
            icon={DollarSign}
            variant="default"
          />
          <MetricCard
            label="Total Trips"
            value={account.totalTrips?.toLocaleString() || "—"}
            icon={TrendingUp}
            variant={account.totalTrips && account.totalTrips > 20 ? "success" : "default"}
          />
          <MetricCard
            label="Last Login"
            value={
              account.daysSinceLastLogin !== null
                ? account.daysSinceLastLogin === 0
                  ? "Today"
                  : `${account.daysSinceLastLogin}d ago`
                : "—"
            }
            icon={Clock}
            variant={
              account.daysSinceLastLogin !== null && account.daysSinceLastLogin > 30
                ? "danger"
                : "default"
            }
          />
          <MetricCard
            label="Contacts"
            value={account.contacts.length.toString()}
            icon={Users}
            variant="default"
          />
        </div>

        {/* Signals */}
        {(account.riskSignals.length > 0 || account.positiveSignals.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {account.riskSignals.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-900 dark:text-red-200">
                    Risk Signals
                  </h3>
                </div>
                <ul className="space-y-2">
                  {account.riskSignals.map((signal, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {account.positiveSignals.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">
                    Positive Signals
                  </h3>
                </div>
                <ul className="space-y-2">
                  {account.positiveSignals.map((signal, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Customer Journey Stage */}
        <JourneyStageCard
          journey={journey}
          companyId={account.id}
          companyName={account.name}
          onUpdate={handleJourneyUpdate}
        />

        {/* Health Score Trend */}
        {healthHistory && healthHistory.snapshots.length > 0 && (
          <HealthTrendCard history={healthHistory} />
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Company Info & Contacts */}
          <div className="space-y-6 lg:col-span-1">
            {/* Company Info */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
                Company Info
              </h2>
              <dl className="space-y-3 text-sm">
                {account.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="mt-0.5 h-4 w-4 text-zinc-400" />
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Website</dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        <a
                          href={account.website.startsWith("http") ? account.website : `https://${account.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          {account.website}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
                {account.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-zinc-400" />
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Phone</dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {account.phone}
                      </dd>
                    </div>
                  </div>
                )}
                {location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-zinc-400" />
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Location</dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {location}
                      </dd>
                    </div>
                  </div>
                )}
                {account.customerSince && (
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-4 w-4 text-zinc-400" />
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Customer Since
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {new Date(account.customerSince).toLocaleDateString()}
                      </dd>
                    </div>
                  </div>
                )}
                {account.lifecycleStage && (
                  <div className="flex items-start gap-3">
                    <RefreshCw className="mt-0.5 h-4 w-4 text-zinc-400" />
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Lifecycle Stage
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100 capitalize">
                        {account.lifecycleStage}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
              {account.description && (
                <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {account.description}
                  </p>
                </div>
              )}
            </div>

            {/* Onboarding Progress */}
            <OnboardingProgress companyId={account.id} />

            {/* Stakeholder Map */}
            <StakeholderMap companyId={account.id} />

            {/* Contacts */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
                Contacts ({account.contacts.length})
              </h2>
              {account.contacts.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No contacts found
                </p>
              ) : (
                <div className="space-y-3">
                  {account.contacts.slice(0, 5).map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {(contact.firstName?.[0] || "") +
                          (contact.lastName?.[0] || "") || "?"}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {[contact.firstName, contact.lastName]
                            .filter(Boolean)
                            .join(" ") || "Unknown"}
                        </p>
                        {contact.jobTitle && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {contact.jobTitle}
                          </p>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="block truncate text-sm text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            {contact.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {account.contacts.length > 5 && (
                    <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                      +{account.contacts.length - 5} more contacts
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Deals */}
            {account.deals.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
                  Deals ({account.deals.length})
                </h2>
                <div className="space-y-3">
                  {account.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                    >
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {deal.name}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {deal.stage || "Unknown stage"}
                        </p>
                      </div>
                      {deal.amount && (
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          ${deal.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <Link
                  href={`/skills/customer-health?company=${encodeURIComponent(account.name)}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  <MessageSquare className="h-5 w-5 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Prep for Call
                  </span>
                </Link>
                <Link
                  href={`/skills/renewal-prep?company=${encodeURIComponent(account.name)}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  <FileText className="h-5 w-5 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Renewal Strategy
                  </span>
                </Link>
                <Link
                  href={`/skills/churn-risk?company=${encodeURIComponent(account.name)}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  <AlertTriangle className="h-5 w-5 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Churn Analysis
                  </span>
                </Link>
              </div>
            </div>

            {/* NPS Summary */}
            <NPSSummary companyId={account.id} />
          </div>

          {/* Right Column - Activity Timeline */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
                Activity Timeline
              </h2>
              <ActivityTimeline companyId={account.id} limit={30} showFilters={true} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string
  value: string
  icon: React.ElementType
  variant?: "default" | "success" | "danger"
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        <Icon
          className={cn(
            "h-5 w-5",
            variant === "success" && "text-emerald-500",
            variant === "danger" && "text-red-500",
            variant === "default" && "text-zinc-400"
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold",
          variant === "success" && "text-emerald-600 dark:text-emerald-400",
          variant === "danger" && "text-red-600 dark:text-red-400",
          variant === "default" && "text-zinc-900 dark:text-zinc-100"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function TimelineItem({
  event,
}: {
  event: {
    id: string
    type: "note" | "email" | "call" | "meeting" | "deal" | "health_change"
    title: string
    description?: string
    timestamp: string
  }
}) {
  const icons = {
    note: FileText,
    email: Mail,
    call: PhoneCall,
    meeting: Video,
    deal: Briefcase,
    health_change: TrendingUp,
  }

  const colors = {
    note: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    email: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    call: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    meeting: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    deal: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    health_change: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }

  const Icon = icons[event.type]

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative flex gap-4 pb-6">
      <div
        className={cn(
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full",
          colors[event.type]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {event.title}
          </p>
          <span className="whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
            {formatDate(event.timestamp)}
          </span>
        </div>
        {event.description && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {event.description}
          </p>
        )}
      </div>
    </div>
  )
}

function HealthTrendCard({ history }: { history: HealthHistory }) {
  const { snapshots, trend, distribution, changes } = history
  const totalSnapshots = distribution.green + distribution.yellow + distribution.red + distribution.unknown

  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus
  const trendColor = trend === "improving"
    ? "text-emerald-600 dark:text-emerald-400"
    : trend === "declining"
    ? "text-red-600 dark:text-red-400"
    : "text-zinc-500 dark:text-zinc-400"
  const trendBg = trend === "improving"
    ? "bg-emerald-100 dark:bg-emerald-900/30"
    : trend === "declining"
    ? "bg-red-100 dark:bg-red-900/30"
    : "bg-zinc-100 dark:bg-zinc-800"

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-zinc-400" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Health Score Trend
          </h2>
        </div>
        <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium", trendBg, trendColor)}>
          <TrendIcon className="h-4 w-4" />
          <span className="capitalize">{trend}</span>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="mb-6">
        <div className="flex items-end gap-1" style={{ height: "60px" }}>
          {snapshots.slice(-30).map((snapshot, i) => {
            const colors = {
              green: "bg-emerald-500",
              yellow: "bg-yellow-500",
              red: "bg-red-500",
              unknown: "bg-zinc-300 dark:bg-zinc-600",
            }
            const heights = {
              green: "100%",
              yellow: "66%",
              red: "33%",
              unknown: "20%",
            }
            const score = snapshot.healthScore as keyof typeof colors
            return (
              <div
                key={snapshot.id || i}
                className="flex-1 min-w-1 rounded-t transition-all hover:opacity-80"
                style={{ height: heights[score] }}
                title={`${new Date(snapshot.createdAt).toLocaleDateString()}: ${score}`}
              >
                <div className={cn("h-full w-full rounded-t", colors[score])} />
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Distribution */}
      <div className="mb-4">
        <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          {distribution.green > 0 && (
            <div
              className="bg-emerald-500"
              style={{ width: `${(distribution.green / totalSnapshots) * 100}%` }}
            />
          )}
          {distribution.yellow > 0 && (
            <div
              className="bg-yellow-500"
              style={{ width: `${(distribution.yellow / totalSnapshots) * 100}%` }}
            />
          )}
          {distribution.red > 0 && (
            <div
              className="bg-red-500"
              style={{ width: `${(distribution.red / totalSnapshots) * 100}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{distribution.green} green</span>
          <span>{distribution.yellow} yellow</span>
          <span>{distribution.red} red</span>
        </div>
      </div>

      {/* Recent Changes */}
      {changes.length > 0 && (
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Recent Changes
          </h3>
          <div className="space-y-2">
            {changes.slice(-3).reverse().map((change, i) => {
              const isDowngrade =
                (change.from === "green" && (change.to === "yellow" || change.to === "red")) ||
                (change.from === "yellow" && change.to === "red")
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      change.from === "green" ? "bg-emerald-500" :
                      change.from === "yellow" ? "bg-yellow-500" :
                      change.from === "red" ? "bg-red-500" : "bg-zinc-400"
                    )} />
                    <span className="text-zinc-500 dark:text-zinc-400">→</span>
                    <span className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      change.to === "green" ? "bg-emerald-500" :
                      change.to === "yellow" ? "bg-yellow-500" :
                      change.to === "red" ? "bg-red-500" : "bg-zinc-400"
                    )} />
                    <span className={isDowngrade ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {change.from} → {change.to}
                    </span>
                  </div>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {new Date(change.date).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function JourneyStageCard({
  journey,
  companyId,
  companyName,
  onUpdate,
}: {
  journey: CustomerJourney | null
  companyId: string
  companyName: string
  onUpdate: (stage: string, reason?: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const currentStage = journey?.stage || "onboarding"
  const currentStageInfo = JOURNEY_STAGES.find((s) => s.id === currentStage) || JOURNEY_STAGES[0]

  const handleStageChange = async (newStage: string) => {
    if (newStage === currentStage) {
      setIsOpen(false)
      return
    }
    setUpdating(true)
    await onUpdate(newStage)
    setUpdating(false)
    setIsOpen(false)
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Route className="h-5 w-5 text-zinc-400" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Customer Journey
          </h2>
        </div>

        {/* Stage Selector */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={updating}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700",
              updating && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", currentStageInfo.color)} />
            <span className="text-zinc-900 dark:text-zinc-100">{currentStageInfo.label}</span>
            <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
              {JOURNEY_STAGES.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => handleStageChange(stage.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700",
                    stage.id === currentStage && "bg-zinc-50 dark:bg-zinc-700"
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", stage.color)} />
                  <span className="text-zinc-900 dark:text-zinc-100">{stage.label}</span>
                  {stage.id === currentStage && (
                    <CheckCircle className="ml-auto h-4 w-4 text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Journey Progress */}
      <div className="mt-4">
        <div className="flex items-center gap-1">
          {JOURNEY_STAGES.slice(0, -1).map((stage, i) => {
            const isActive = stage.id === currentStage
            const isPast = JOURNEY_STAGES.findIndex((s) => s.id === currentStage) > i
            const isChurned = currentStage === "churned"
            const isAtRisk = currentStage === "at_risk"

            return (
              <div key={stage.id} className="flex flex-1 items-center">
                <div
                  className={cn(
                    "h-2 flex-1 rounded-full transition-all",
                    isPast || isActive
                      ? isChurned
                        ? "bg-zinc-400"
                        : isAtRisk
                        ? "bg-red-400"
                        : stage.color
                      : "bg-zinc-200 dark:bg-zinc-700"
                  )}
                />
                {i < JOURNEY_STAGES.length - 2 && (
                  <div className="h-1 w-1" />
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Onboarding</span>
          <span>Maturity</span>
          <span>Renewal</span>
        </div>
      </div>

      {/* Journey History */}
      {journey?.history && journey.history.length > 0 && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Recent Changes
          </h3>
          <div className="space-y-2">
            {journey.history.slice(0, 3).map((h) => {
              const fromStage = JOURNEY_STAGES.find((s) => s.id === h.fromStage)
              const toStage = JOURNEY_STAGES.find((s) => s.id === h.toStage)
              return (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {fromStage && (
                      <>
                        <span className={cn("h-2 w-2 rounded-full", fromStage.color)} />
                        <span className="text-zinc-500 dark:text-zinc-400">→</span>
                      </>
                    )}
                    <span className={cn("h-2 w-2 rounded-full", toStage?.color || "bg-zinc-400")} />
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {fromStage ? `${fromStage.label} → ` : ""}{toStage?.label}
                    </span>
                  </div>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {new Date(h.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AccountDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-96 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 lg:col-span-2" />
      </div>
    </div>
  )
}
