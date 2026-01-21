"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { HealthBadge } from "@/components/health-badge"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

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
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    fetch(`/api/integrations/accounts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch account")
        return res.json()
      })
      .then((data) => {
        setAccount(data)
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
          </div>

          {/* Right Column - Timeline */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
                Activity Timeline
              </h2>
              {account.timeline.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-zinc-500 dark:text-zinc-400">
                    No activity recorded yet
                  </p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-700" />

                  {account.timeline.map((event) => (
                    <TimelineItem key={event.id} event={event} />
                  ))}
                </div>
              )}
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
