import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { getSkills } from "@/lib/skills"
import {
  Sparkles,
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  BarChart3,
  ChevronRight,
} from "lucide-react"

// Map skill slugs to icons
const skillIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "customer-health": MessageSquare,
  "customer-health-summary": MessageSquare,
  "portfolio-health": BarChart3,
  "churn-risk": AlertTriangle,
  "renewal-prep": FileText,
  "success-story": TrendingUp,
}

// Map skill slugs to colors
const skillColors: Record<string, { bg: string; icon: string }> = {
  "customer-health": {
    bg: "bg-blue-100 dark:bg-blue-950",
    icon: "text-blue-600 dark:text-blue-400",
  },
  "customer-health-summary": {
    bg: "bg-blue-100 dark:bg-blue-950",
    icon: "text-blue-600 dark:text-blue-400",
  },
  "portfolio-health": {
    bg: "bg-purple-100 dark:bg-purple-950",
    icon: "text-purple-600 dark:text-purple-400",
  },
  "churn-risk": {
    bg: "bg-red-100 dark:bg-red-950",
    icon: "text-red-600 dark:text-red-400",
  },
  "renewal-prep": {
    bg: "bg-amber-100 dark:bg-amber-950",
    icon: "text-amber-600 dark:text-amber-400",
  },
  "success-story": {
    bg: "bg-emerald-100 dark:bg-emerald-950",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
}

const defaultColors = {
  bg: "bg-zinc-100 dark:bg-zinc-800",
  icon: "text-zinc-600 dark:text-zinc-400",
}

export default function SkillsPage() {
  const skills = getSkills()

  // Group skills by category
  const accountSkills = skills.filter((s) =>
    ["customer-health", "customer-health-summary", "churn-risk", "renewal-prep"].includes(s.slug)
  )
  const portfolioSkills = skills.filter((s) =>
    ["portfolio-health"].includes(s.slug)
  )
  const otherSkills = skills.filter(
    (s) => !accountSkills.includes(s) && !portfolioSkills.includes(s)
  )

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Skills
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            AI-powered tools to help you manage customer success
          </p>
        </div>

        {/* Account Skills */}
        {accountSkills.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Account Skills
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {accountSkills.map((skill) => {
                const Icon = skillIcons[skill.slug] || Sparkles
                const colors = skillColors[skill.slug] || defaultColors

                return (
                  <Link
                    key={skill.slug}
                    href={`/skills/${skill.slug}`}
                    className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <div className={`rounded-lg p-3 ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {skill.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
                      </div>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {skill.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Portfolio Skills */}
        {portfolioSkills.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Portfolio Skills
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {portfolioSkills.map((skill) => {
                const Icon = skillIcons[skill.slug] || Sparkles
                const colors = skillColors[skill.slug] || defaultColors

                return (
                  <Link
                    key={skill.slug}
                    href={`/skills/${skill.slug}`}
                    className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <div className={`rounded-lg p-3 ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {skill.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
                      </div>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {skill.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Other Skills */}
        {otherSkills.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Other Skills
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherSkills.map((skill) => {
                const Icon = skillIcons[skill.slug] || Sparkles
                const colors = skillColors[skill.slug] || defaultColors

                return (
                  <Link
                    key={skill.slug}
                    href={`/skills/${skill.slug}`}
                    className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <div className={`rounded-lg p-3 ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {skill.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
                      </div>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {skill.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {skills.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Sparkles className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No skills found
            </h3>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Add skills to /factory/skills/ to get started
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
