"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Trophy,
  Medal,
  TrendingUp,
  Users,
  DollarSign,
  Heart,
  Star,
  Flame,
  Target,
  Award,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CSMStats {
  email: string
  name: string
  accountCount: number
  totalMrr: number
  healthyAccounts: number
  atRiskAccounts: number
  savedAccounts: number
  expansionRevenue: number
  tasksCompleted: number
  avgResponseTime: number
  npsImprovement: number
}

interface LeaderboardData {
  csms: CSMStats[]
  period: string
  highlights: {
    topSaver: string
    topExpander: string
    mostResponsive: string
    healthChampion: string
  }
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month")

  useEffect(() => {
    fetchLeaderboard()
  }, [period])

  async function fetchLeaderboard() {
    setLoading(true)
    try {
      const res = await fetch(`/api/leaderboard?period=${period}`)
      const data = await res.json()
      setData(data)
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const metrics = [
    { key: "savedAccounts", label: "Saves", icon: Heart, color: "text-error-500" },
    { key: "expansionRevenue", label: "Expansion $", icon: TrendingUp, color: "text-success-500" },
    { key: "healthyAccounts", label: "Healthy", icon: Star, color: "text-success-500" },
    { key: "tasksCompleted", label: "Tasks Done", icon: Target, color: "text-info-500" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-content-primary">
              <Trophy className="h-7 w-7 text-warning-500" />
              CSM Leaderboard
            </h1>
            <p className="mt-1 text-content-secondary">
              Track team performance and celebrate wins
            </p>
          </div>

          {/* Period Toggle */}
          <div className="flex gap-1 rounded-lg bg-bg-secondary p-1">
            {(["week", "month", "quarter"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  period === p
                    ? "bg-bg-elevated text-content-primary shadow"
                    : "text-content-secondary hover:text-content-primary"
                )}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Highlights */}
        {data?.highlights && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HighlightCard
              icon={Heart}
              label="Top Saver"
              value={data.highlights.topSaver}
              color="red"
            />
            <HighlightCard
              icon={TrendingUp}
              label="Top Expander"
              value={data.highlights.topExpander}
              color="green"
            />
            <HighlightCard
              icon={Flame}
              label="Most Responsive"
              value={data.highlights.mostResponsive}
              color="orange"
            />
            <HighlightCard
              icon={Star}
              label="Health Champion"
              value={data.highlights.healthChampion}
              color="emerald"
            />
          </div>
        )}

        {/* Leaderboard Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 shimmer rounded-xl"
              />
            ))}
          </div>
        ) : data?.csms && data.csms.length > 0 ? (
          <div className="overflow-hidden card-sf">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default bg-bg-secondary">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-secondary">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-content-secondary">
                    CSM
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-content-secondary">
                    Accounts
                  </th>
                  {metrics.map((m) => (
                    <th
                      key={m.key}
                      className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-content-secondary"
                    >
                      {m.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-content-secondary">
                    MRR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {data.csms.map((csm, index) => (
                  <tr
                    key={csm.email}
                    className={cn(
                      "transition-colors hover:bg-surface-hover",
                      index === 0 && "bg-warning-50/50 dark:bg-warning-900/10"
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        {index === 0 ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600">
                            <Trophy className="h-4 w-4 text-white" />
                          </div>
                        ) : index === 1 ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500">
                            <Medal className="h-4 w-4 text-white" />
                          </div>
                        ) : index === 2 ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800">
                            <Medal className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-content-tertiary">
                            {index + 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white">
                          {csm.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-content-primary">
                            {csm.name}
                          </p>
                          <p className="text-xs text-content-secondary">{csm.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-content-tertiary" />
                        <span className="font-medium text-content-primary">
                          {csm.accountCount}
                        </span>
                      </div>
                    </td>
                    {metrics.map((m) => (
                      <td key={m.key} className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <m.icon className={cn("h-4 w-4", m.color)} />
                          <span className="font-medium text-content-primary">
                            {m.key === "expansionRevenue"
                              ? `$${((csm[m.key as keyof CSMStats] as number) / 1000).toFixed(0)}k`
                              : csm[m.key as keyof CSMStats]}
                          </span>
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-4 w-4 text-success-500" />
                        <span className="font-bold text-content-primary">
                          {(csm.totalMrr / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-sf p-12 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-content-tertiary" />
            <h3 className="text-lg font-semibold text-content-primary">
              No data yet
            </h3>
            <p className="mt-2 text-content-secondary">
              Leaderboard will populate as CSMs complete tasks and save accounts
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function HighlightCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: "red" | "green" | "orange" | "emerald"
}) {
  const colors = {
    red: "from-red-500 to-rose-600",
    green: "from-green-500 to-emerald-600",
    orange: "from-orange-500 to-amber-600",
    emerald: "from-emerald-500 to-teal-600",
  }

  return (
    <div className="card-sf p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br",
            colors[color]
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-content-secondary">{label}</p>
          <p className="font-semibold text-content-primary">{value}</p>
        </div>
      </div>
    </div>
  )
}
