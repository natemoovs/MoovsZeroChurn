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
  Bug,
  MessageCircle,
  Activity,
  ClipboardList,
} from "lucide-react"

// Map skill slugs to icons
const skillIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "customer-health": MessageSquare,
  "customer-health-summary": MessageSquare,
  "portfolio-health": BarChart3,
  "pipeline-health": Activity,
  "churn-risk": AlertTriangle,
  "renewal-prep": FileText,
  "success-story": TrendingUp,
  "bug": Bug,
  "feedback": MessageCircle,
}

// Map skill slugs to colors
const skillColors: Record<string, { bg: string; icon: string }> = {
  "customer-health": {
    bg: "bg-primary-100 dark:bg-primary-950",
    icon: "text-primary-600 dark:text-primary-400",
  },
  "customer-health-summary": {
    bg: "bg-primary-100 dark:bg-primary-950",
    icon: "text-primary-600 dark:text-primary-400",
  },
  "portfolio-health": {
    bg: "bg-purple-100 dark:bg-purple-950",
    icon: "text-purple-600 dark:text-purple-400",
  },
  "pipeline-health": {
    bg: "bg-indigo-100 dark:bg-indigo-950",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  "churn-risk": {
    bg: "bg-error-100 dark:bg-error-950",
    icon: "text-error-600 dark:text-error-400",
  },
  "renewal-prep": {
    bg: "bg-warning-100 dark:bg-warning-950",
    icon: "text-warning-600 dark:text-warning-400",
  },
  "success-story": {
    bg: "bg-success-100 dark:bg-success-950",
    icon: "text-success-600 dark:text-success-400",
  },
  "bug": {
    bg: "bg-orange-100 dark:bg-orange-950",
    icon: "text-orange-600 dark:text-orange-400",
  },
  "feedback": {
    bg: "bg-cyan-100 dark:bg-cyan-950",
    icon: "text-cyan-600 dark:text-cyan-400",
  },
}

const defaultColors = {
  bg: "bg-bg-secondary",
  icon: "text-content-secondary",
}

export default function SkillsPage() {
  const skills = getSkills()

  // Group skills by category
  const accountSkills = skills.filter((s) =>
    ["customer-health", "customer-health-summary", "churn-risk", "renewal-prep"].includes(s.slug)
  )
  const portfolioSkills = skills.filter((s) =>
    ["portfolio-health", "pipeline-health"].includes(s.slug)
  )
  const captureSkills = skills.filter((s) =>
    ["bug", "feedback"].includes(s.slug)
  )
  const otherSkills = skills.filter(
    (s) => !accountSkills.includes(s) && !portfolioSkills.includes(s) && !captureSkills.includes(s)
  )

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-content-primary">
            Skills
          </h1>
          <p className="mt-1 text-content-secondary">
            AI-powered tools to help you manage customer success
          </p>
        </div>

        {/* Account Skills */}
        {accountSkills.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-content-tertiary" />
              <h2 className="text-lg font-semibold text-content-primary">
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
                    className="card-sf group flex items-start gap-4 p-5 shadow-sm transition-all hover:border-border-hover hover:shadow-md"
                  >
                    <div className={`rounded-lg p-3 ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-content-primary">
                          {skill.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-content-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-content-secondary" />
                      </div>
                      <p className="mt-1 text-sm text-content-secondary">
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
              <BarChart3 className="h-5 w-5 text-content-tertiary" />
              <h2 className="text-lg font-semibold text-content-primary">
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
                    className="card-sf group flex items-start gap-4 p-5 shadow-sm transition-all hover:border-border-hover hover:shadow-md"
                  >
                    <div className={`rounded-lg p-3 ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-content-primary">
                          {skill.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-content-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-content-secondary" />
                      </div>
                      <p className="mt-1 text-sm text-content-secondary">
                        {skill.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Capture Skills */}
        {captureSkills.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-content-tertiary" />
              <h2 className="text-lg font-semibold text-content-primary">
                Capture Skills
              </h2>
            </div>
            <p className="text-sm text-content-secondary">
              Log bugs and feedback from customer interactions
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {captureSkills.map((skill) => {
                const Icon = skillIcons[skill.slug] || Sparkles
                const colors = skillColors[skill.slug] || defaultColors

                return (
                  <Link
                    key={skill.slug}
                    href={`/skills/${skill.slug}`}
                    className="card-sf group flex items-start gap-4 p-5 shadow-sm transition-all hover:border-border-hover hover:shadow-md"
                  >
                    <div className={`rounded-lg p-3 ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-content-primary">
                          {skill.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-content-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-content-secondary" />
                      </div>
                      <p className="mt-1 text-sm text-content-secondary">
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
              <Sparkles className="h-5 w-5 text-content-tertiary" />
              <h2 className="text-lg font-semibold text-content-primary">
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
                    className="card-sf group flex items-start gap-4 p-5 shadow-sm transition-all hover:border-border-hover hover:shadow-md"
                  >
                    <div className={`rounded-lg p-3 ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-content-primary">
                          {skill.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-content-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-content-secondary" />
                      </div>
                      <p className="mt-1 text-sm text-content-secondary">
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
          <div className="card-sf p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary">
              <Sparkles className="h-6 w-6 text-content-tertiary" />
            </div>
            <h3 className="text-lg font-medium text-content-primary">
              No skills found
            </h3>
            <p className="mt-1 text-content-secondary">
              Add skills to /factory/skills/ to get started
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
