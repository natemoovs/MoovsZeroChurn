"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import {
  LayoutDashboard,
  Users,
  Brain,
  Activity,
  Zap,
  TrendingUp,
  BarChart3,
  PieChart,
  UsersRound,
  CheckSquare,
  CalendarClock,
  Sparkles,
  History,
  Settings,
  LayoutGrid,
  Database,
  RefreshCw,
  Search,
  Filter,
  Bell,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface Section {
  id: string
  title: string
  icon: React.ElementType
  description: string
  features: {
    name: string
    description: string
  }[]
  tips?: string[]
}

const sections: Section[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    description: "Your command center for customer health at a glance.",
    features: [
      { name: "Portfolio Health Bar", description: "Visual breakdown of healthy (green), monitor (yellow), and at-risk (red) accounts" },
      { name: "Key Metrics", description: "Total MRR, account counts, and health distribution" },
      { name: "At-Risk Accounts", description: "Quick list of accounts needing immediate attention" },
      { name: "Recent Activity", description: "Latest changes and events across your portfolio" },
    ],
    tips: [
      "Click on any metric card to drill down into that segment",
      "The health bar is clickable - tap a section to filter accounts",
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    icon: Users,
    description: "Browse, search, and filter all customers in your portfolio.",
    features: [
      { name: "Health Filters", description: "Filter by All, At Risk, Monitor, or Healthy status" },
      { name: "Search", description: "Find accounts by name - just start typing" },
      { name: "Account Cards", description: "Each card shows health score, MRR, plan, and key signals" },
      { name: "Quick Actions", description: "Click any account to view full details" },
    ],
    tips: [
      "Use the search bar to quickly find specific customers",
      "Sort by MRR to prioritize high-value accounts",
    ],
  },
  {
    id: "account-detail",
    title: "Account Detail",
    icon: Users,
    description: "Deep dive into a single customer's health, usage, and history.",
    features: [
      { name: "Health Signals", description: "Positive signals (green) and risk signals (red) with specific details" },
      { name: "Usage & Adoption", description: "Vehicles, drivers, members, setup score, trips, and tenure" },
      { name: "Customer Journey", description: "Track where they are: Onboarding → Adoption → Growth → Maturity" },
      { name: "Company Info", description: "Website, phone, location, customer since date, lifecycle stage" },
      { name: "Generate Brief", description: "AI-powered customer summary for calls or QBRs" },
    ],
    tips: [
      "The Customer Journey dropdown lets you manually override the auto-detected phase",
      "Setup Score shows as a percentage (e.g., 25/30 = 83%)",
    ],
  },
  {
    id: "matrix",
    title: "Moovs Matrix",
    icon: LayoutGrid,
    description: "Visual customer segmentation matrix from Retool.",
    features: [
      { name: "Embedded Dashboard", description: "Full Retool dashboard for advanced segmentation analysis" },
      { name: "Interactive Filters", description: "Filter and slice data directly in the embedded view" },
    ],
  },
  {
    id: "predictions",
    title: "Predictions",
    icon: Brain,
    description: "AI-powered churn risk predictions and expansion opportunities.",
    features: [
      { name: "Churn Risk Scores", description: "ML-based probability scores for each account" },
      { name: "Risk Factors", description: "Specific signals contributing to churn risk" },
      { name: "Expansion Signals", description: "Accounts showing signs of growth potential" },
    ],
  },
  {
    id: "benchmarks",
    title: "Benchmarks",
    icon: Activity,
    description: "Compare customer metrics against portfolio averages.",
    features: [
      { name: "Usage Benchmarks", description: "How accounts compare on trips, vehicles, engagement" },
      { name: "Health Benchmarks", description: "Portfolio-wide health score distribution" },
    ],
  },
  {
    id: "engagement",
    title: "Engagement",
    icon: Zap,
    description: "Track customer engagement and activity levels.",
    features: [
      { name: "Engagement Status", description: "Active This Week, Active This Month, Inactive classifications" },
      { name: "Last Login Tracking", description: "Days since last customer login" },
      { name: "Trip Activity", description: "Recent trip counts and trends" },
    ],
  },
  {
    id: "expansion",
    title: "Expansion",
    icon: TrendingUp,
    description: "Identify upsell and expansion opportunities.",
    features: [
      { name: "Growth Signals", description: "Accounts adding vehicles, drivers, or increasing usage" },
      { name: "Plan Upgrade Candidates", description: "Customers who may benefit from higher tiers" },
    ],
  },
  {
    id: "cohorts",
    title: "Cohorts",
    icon: BarChart3,
    description: "Analyze customer groups by signup date or characteristics.",
    features: [
      { name: "Cohort Analysis", description: "Track retention and health by customer cohort" },
      { name: "Trend Analysis", description: "See how different cohorts perform over time" },
    ],
  },
  {
    id: "roi",
    title: "ROI Dashboard",
    icon: PieChart,
    description: "Measure the impact of your customer success efforts.",
    features: [
      { name: "Retention Metrics", description: "Track saves, churn prevention, and retention rates" },
      { name: "Revenue Impact", description: "MRR saved through CS interventions" },
    ],
  },
  {
    id: "team",
    title: "CSM Workload",
    icon: UsersRound,
    description: "View account distribution across the CS team.",
    features: [
      { name: "CSM Assignment", description: "See which accounts are assigned to each CSM" },
      { name: "Workload Balance", description: "MRR and account count per team member" },
      { name: "Health by CSM", description: "Portfolio health breakdown for each CSM" },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: CheckSquare,
    description: "Manage your to-do list and follow-ups.",
    features: [
      { name: "Task Creation", description: "Create tasks linked to specific accounts" },
      { name: "Priority Levels", description: "Urgent, High, Medium, Low priorities" },
      { name: "Due Dates", description: "Set and track task deadlines" },
      { name: "Status Tracking", description: "Pending, In Progress, Completed states" },
      { name: "Notion Sync", description: "Tasks sync to Notion for team visibility" },
    ],
    tips: [
      "Tasks created from account pages auto-link to that customer",
      "Overdue tasks appear highlighted for easy identification",
    ],
  },
  {
    id: "playbooks",
    title: "Playbooks",
    icon: Zap,
    description: "Automated workflows triggered by customer signals.",
    features: [
      { name: "Trigger Conditions", description: "Auto-fire based on health changes, payment issues, etc." },
      { name: "Action Templates", description: "Pre-defined response actions for common scenarios" },
      { name: "Execution History", description: "Track which playbooks ran and when" },
    ],
  },
  {
    id: "renewals",
    title: "Renewals",
    icon: CalendarClock,
    description: "Track upcoming contract renewals.",
    features: [
      { name: "Renewal Calendar", description: "See renewals coming up in 30/60/90 days" },
      { name: "Risk Assessment", description: "Health score context for each renewal" },
      { name: "MRR at Risk", description: "Total revenue in upcoming renewal window" },
    ],
  },
  {
    id: "skills",
    title: "Skills",
    icon: Sparkles,
    description: "AI-powered tools for common CSM tasks.",
    features: [
      { name: "Portfolio Health Review", description: "Generate health overview for Enterprise, Mid-Market, or SMB segments" },
      { name: "Customer Health Summary", description: "Prep document for customer calls or QBRs" },
      { name: "Churn Risk Analysis", description: "Deep dive into at-risk accounts with intervention plans" },
      { name: "Renewal Prep", description: "Comprehensive renewal strategy document" },
      { name: "Bug Report", description: "Document customer-reported issues for the dev team" },
      { name: "Success Story", description: "Draft case studies from customer wins" },
    ],
    tips: [
      "Skills use real data from your synced customer database",
      "Customer fields show a searchable dropdown of actual customers",
      "Portfolio reviews pull from Metabase billing data, not CRM leads",
    ],
  },
  {
    id: "history",
    title: "History",
    icon: History,
    description: "View past AI generations and outputs.",
    features: [
      { name: "Generation Log", description: "All AI-generated content with timestamps" },
      { name: "Quick Access", description: "Re-view or copy past outputs" },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    description: "Configure data sync and integrations.",
    features: [
      { name: "Customer Data Sync", description: "Sync data from Metabase (primary), enriched with CRM and Stripe data" },
      { name: "Sync Status", description: "See last sync time and record counts" },
      { name: "Manual Sync", description: "Trigger a fresh data sync on demand" },
      { name: "Debug Info", description: "View sync statistics and any errors" },
    ],
    tips: [
      "Data syncs automatically via daily cron job",
      "Manual sync is useful after bulk data changes",
    ],
  },
]

const dataSourcesSection = {
  title: "Data Sources",
  description: "Where your data comes from and how it flows.",
  sources: [
    {
      name: "Metabase (Card 1469)",
      description: "Primary source of truth for customer data",
      data: ["Company names", "MRR", "Plan/subscription info", "Vehicle counts", "Driver counts", "Trip data", "Setup scores", "Engagement status"],
    },
    {
      name: "Lago Billing",
      description: "Subscription and billing lifecycle",
      data: ["Plan codes (VIP, Pro, Standard)", "Subscription status", "Billing events (churn, expansion, etc.)"],
    },
    {
      name: "HubSpot CRM",
      description: "Contact and deal enrichment",
      data: ["Contact information", "Deal history", "Company owners", "Activity timeline"],
    },
    {
      name: "Stripe",
      description: "Payment status",
      data: ["Payment success/failure", "Invoice status"],
    },
  ],
}

const healthScoreSection = {
  title: "Health Score System",
  description: "How customer health is calculated.",
  scores: [
    {
      level: "Healthy (Green)",
      color: "bg-success-500",
      criteria: [
        "Active paid subscription",
        "Payments current",
        "Recent engagement (login activity)",
        "Good setup completion (83%+)",
        "No churn signals",
      ],
    },
    {
      level: "Monitor (Yellow)",
      color: "bg-warning-500",
      criteria: [
        "Minor payment delays",
        "No engagement in 30+ days",
        "Low setup completion (50-82%)",
        "Single point of contact",
      ],
    },
    {
      level: "At Risk (Red)",
      color: "bg-error-500",
      criteria: [
        "Payment failures",
        "No engagement 60+ days",
        "Very low setup (<50%)",
        "Churn status detected",
        "No fleet setup despite usage",
      ],
    },
  ],
}

function SectionCard({ section, isOpen, onToggle }: { section: Section; isOpen: boolean; onToggle: () => void }) {
  const Icon = section.icon

  return (
    <div className="card-sf overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
            <Icon className="text-primary-600 dark:text-primary-400 h-5 w-5" />
          </div>
          <div>
            <h3 className="text-content-primary font-semibold">{section.title}</h3>
            <p className="text-content-secondary text-sm">{section.description}</p>
          </div>
        </div>
        <ChevronDown className={cn(
          "text-content-tertiary h-5 w-5 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="border-border-default border-t px-4 pb-4">
          <div className="mt-4 space-y-3">
            {section.features.map((feature, i) => (
              <div key={i} className="flex gap-3">
                <div className="bg-success-500 mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                <div>
                  <span className="text-content-primary font-medium">{feature.name}</span>
                  <span className="text-content-secondary"> — {feature.description}</span>
                </div>
              </div>
            ))}
          </div>

          {section.tips && section.tips.length > 0 && (
            <div className="bg-info-50 dark:bg-info-950/30 mt-4 rounded-lg p-3">
              <p className="text-info-700 dark:text-info-300 text-sm font-medium">Tips:</p>
              <ul className="text-info-600 dark:text-info-400 mt-1 space-y-1 text-sm">
                {section.tips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["dashboard"]))

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-content-primary text-2xl font-bold sm:text-3xl">
            Help & Documentation
          </h1>
          <p className="text-content-secondary mt-2">
            Everything you need to know about using Success Factory
          </p>
        </div>

        {/* Quick Start */}
        <div className="card-sf p-6">
          <h2 className="text-content-primary mb-4 text-lg font-semibold">Quick Start</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-bg-secondary rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Search className="text-primary-500 h-5 w-5" />
                <span className="text-content-primary font-medium">1. Browse Accounts</span>
              </div>
              <p className="text-content-secondary mt-1 text-sm">
                Visit the Accounts page to see all your customers with health scores and MRR.
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Filter className="text-primary-500 h-5 w-5" />
                <span className="text-content-primary font-medium">2. Filter At-Risk</span>
              </div>
              <p className="text-content-secondary mt-1 text-sm">
                Use the "At Risk" filter to focus on accounts that need immediate attention.
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary-500 h-5 w-5" />
                <span className="text-content-primary font-medium">3. Use Skills</span>
              </div>
              <p className="text-content-secondary mt-1 text-sm">
                Generate portfolio reviews, customer briefs, and more with AI-powered Skills.
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="text-primary-500 h-5 w-5" />
                <span className="text-content-primary font-medium">4. Data Sync</span>
              </div>
              <p className="text-content-secondary mt-1 text-sm">
                Data syncs automatically every day. Manual sync available in Settings if needed.
              </p>
            </div>
          </div>
        </div>

        {/* Health Score System */}
        <div className="card-sf p-6">
          <h2 className="text-content-primary mb-2 text-lg font-semibold">{healthScoreSection.title}</h2>
          <p className="text-content-secondary mb-4">{healthScoreSection.description}</p>

          <div className="space-y-4">
            {healthScoreSection.scores.map((score, i) => (
              <div key={i} className="flex gap-4">
                <div className={cn("mt-1 h-4 w-4 flex-shrink-0 rounded-full", score.color)} />
                <div>
                  <h4 className="text-content-primary font-medium">{score.level}</h4>
                  <ul className="text-content-secondary mt-1 space-y-0.5 text-sm">
                    {score.criteria.map((c, j) => (
                      <li key={j}>• {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Sources */}
        <div className="card-sf p-6">
          <h2 className="text-content-primary mb-2 text-lg font-semibold">{dataSourcesSection.title}</h2>
          <p className="text-content-secondary mb-4">{dataSourcesSection.description}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            {dataSourcesSection.sources.map((source, i) => (
              <div key={i} className="bg-bg-secondary rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Database className="text-content-tertiary h-4 w-4" />
                  <h4 className="text-content-primary font-medium">{source.name}</h4>
                </div>
                <p className="text-content-secondary mt-1 text-sm">{source.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {source.data.slice(0, 4).map((d, j) => (
                    <span key={j} className="bg-bg-tertiary text-content-secondary rounded px-2 py-0.5 text-xs">
                      {d}
                    </span>
                  ))}
                  {source.data.length > 4 && (
                    <span className="text-content-tertiary text-xs">+{source.data.length - 4} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Page Reference */}
        <div>
          <h2 className="text-content-primary mb-4 text-lg font-semibold">Page Reference</h2>
          <div className="space-y-3">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                isOpen={openSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-content-tertiary pb-8 text-center text-sm">
          <p>Success Factory v1.0 — Built for Moovs CSM Team</p>
          <p className="mt-1">
            Questions? Contact the product team or check the{" "}
            <a href="https://github.com/anthropics/claude-code/issues" className="text-primary-500 hover:underline">
              GitHub repo
            </a>
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
