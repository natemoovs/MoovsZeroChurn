"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { HealthBadge } from "@/components/health-badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Calendar,
  Users,
  Mail,
  Phone,
  Globe,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  MessageSquare,
  FileText,
  ExternalLink,
} from "lucide-react"

interface AccountDetail {
  companyId: string
  companyName: string
  domain: string | null
  healthScore: "green" | "yellow" | "red" | "unknown"
  mrr: number | null
  plan: string | null
  paymentStatus: string
  customerSince: string | null
  contactCount: number
  riskSignals: string[]
  positiveSignals: string[]
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch account details from portfolio API and find this account
    fetch("/api/integrations/portfolio?segment=all")
      .then((res) => res.json())
      .then((data) => {
        const found = data.summaries?.find(
          (s: AccountDetail) => s.companyId === params.id
        )
        setAccount(found || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      </DashboardLayout>
    )
  }

  if (!account) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Account not found
          </h1>
          <p className="mt-2 text-zinc-500">
            The account you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => router.push("/accounts")} className="mt-4">
            Back to Accounts
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts
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
                  {account.companyName}
                </h1>
                <HealthBadge score={account.healthScore} size="lg" />
              </div>
              {account.domain && (
                <a
                  href={`https://${account.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <Globe className="h-4 w-4" />
                  {account.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Link href={`/skills/customer-health?customer=${encodeURIComponent(account.companyName)}`}>
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Prep Call
              </Button>
            </Link>
            <Button size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Run Skill
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">MRR</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {account.mrr ? `$${account.mrr.toLocaleString()}` : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-950">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Plan</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {account.plan || "Unknown"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-950">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Contacts</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {account.contactCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-950">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Customer Since</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {account.customerSince
                    ? new Date(account.customerSince).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Health Signals */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Risk Signals */}
          {account.riskSignals.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Risk Signals
                </h2>
              </div>
              <ul className="space-y-2">
                {account.riskSignals.map((signal, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Positive Signals */}
          {account.positiveSignals.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  Positive Signals
                </h2>
              </div>
              <ul className="space-y-2">
                {account.positiveSignals.map((signal, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-200"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Related Skills */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Available Actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={`/skills/customer-health?customer=${encodeURIComponent(account.companyName)}`}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-zinc-700 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20"
            >
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                <MessageSquare className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Health Summary
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Prep for a call
                </p>
              </div>
            </Link>

            <Link
              href={`/skills/renewal-prep?customer=${encodeURIComponent(account.companyName)}`}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-zinc-700 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20"
            >
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Renewal Prep
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Plan renewal strategy
                </p>
              </div>
            </Link>

            <Link
              href={`/skills/churn-risk?customer=${encodeURIComponent(account.companyName)}`}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-zinc-700 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20"
            >
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                <AlertTriangle className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Churn Analysis
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Assess risk factors
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
