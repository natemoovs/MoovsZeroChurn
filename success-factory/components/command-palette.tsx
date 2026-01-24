"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
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
  Search,
  Building2,
  FileText,
  ArrowRight,
} from "lucide-react"

// Navigation pages
const pages = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", keywords: ["home", "overview"] },
  { href: "/accounts", icon: Users, label: "Accounts", keywords: ["customers", "companies"] },
  { href: "/predictions", icon: Brain, label: "Predictions", keywords: ["ai", "forecast", "churn"] },
  { href: "/benchmarks", icon: Activity, label: "Benchmarks", keywords: ["metrics", "compare"] },
  { href: "/engagement", icon: Zap, label: "Engagement", keywords: ["activity", "usage"] },
  { href: "/expansion", icon: TrendingUp, label: "Expansion", keywords: ["upsell", "growth", "revenue"] },
  { href: "/cohorts", icon: BarChart3, label: "Cohorts", keywords: ["segments", "groups"] },
  { href: "/roi", icon: PieChart, label: "ROI Dashboard", keywords: ["return", "value"] },
  { href: "/team", icon: UsersRound, label: "CSM Workload", keywords: ["workload", "capacity"] },
  { href: "/tasks", icon: CheckSquare, label: "Tasks", keywords: ["todo", "actions"] },
  { href: "/playbooks", icon: Zap, label: "Playbooks", keywords: ["automation", "workflows"] },
  { href: "/renewals", icon: CalendarClock, label: "Renewals", keywords: ["contracts", "dates"] },
  { href: "/skills", icon: Sparkles, label: "Skills", keywords: ["ai", "tools", "generate"] },
  { href: "/history", icon: History, label: "History", keywords: ["past", "log"] },
  { href: "/settings", icon: Settings, label: "Settings", keywords: ["preferences", "config"] },
]

interface Account {
  id: string
  name: string
  healthScore: string
}

interface Task {
  id: string
  title: string
  companyName: string
  status: string
}

interface Skill {
  slug: string
  name: string
  description: string
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)

  // Toggle the menu when Cmd+K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Search for accounts, tasks, and skills when query changes
  const searchData = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAccounts([])
      setTasks([])
      return
    }

    setLoading(true)
    try {
      // Search accounts and tasks in parallel
      const [accountsRes, tasksRes, skillsRes] = await Promise.all([
        fetch(`/api/customer/search?q=${encodeURIComponent(query)}&limit=5`).catch(() => null),
        fetch(`/api/tasks?search=${encodeURIComponent(query)}&limit=5`).catch(() => null),
        fetch("/api/skills").catch(() => null),
      ])

      if (accountsRes?.ok) {
        const data = await accountsRes.json()
        setAccounts(data.companies || [])
      }

      if (tasksRes?.ok) {
        const data = await tasksRes.json()
        setTasks((data.tasks || []).slice(0, 5))
      }

      if (skillsRes?.ok && skills.length === 0) {
        const data = await skillsRes.json()
        setSkills(data.skills || [])
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }, [skills.length])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchData(search)
    }, 200)
    return () => clearTimeout(timer)
  }, [search, searchData])

  // Filter skills client-side
  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5)

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Menu"
      className="fixed inset-0 z-[100]"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[20%] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Search className="h-5 w-5 text-zinc-400" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search accounts, tasks, pages..."
            className="flex-1 bg-transparent py-4 text-base outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
          <kbd className="hidden rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-500 sm:inline-block dark:bg-zinc-800 dark:text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-zinc-500">
            {loading ? "Searching..." : "No results found."}
          </Command.Empty>

          {/* Accounts */}
          {accounts.length > 0 && (
            <Command.Group heading="Accounts" className="px-2 py-1.5 text-xs font-medium text-zinc-500">
              {accounts.map((account) => (
                <Command.Item
                  key={account.id}
                  value={`account-${account.name}`}
                  onSelect={() => runCommand(() => router.push(`/accounts/${account.id}`))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-900 dark:text-zinc-300 dark:aria-selected:bg-emerald-950 dark:aria-selected:text-emerald-100"
                >
                  <Building2 className="h-4 w-4 text-zinc-400" />
                  <span className="flex-1">{account.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      account.healthScore === "green"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : account.healthScore === "yellow"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : account.healthScore === "red"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {account.healthScore}
                  </span>
                  <ArrowRight className="h-4 w-4 text-zinc-300" />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <Command.Group heading="Tasks" className="px-2 py-1.5 text-xs font-medium text-zinc-500">
              {tasks.map((task) => (
                <Command.Item
                  key={task.id}
                  value={`task-${task.title}`}
                  onSelect={() => runCommand(() => router.push("/tasks"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-900 dark:text-zinc-300 dark:aria-selected:bg-emerald-950 dark:aria-selected:text-emerald-100"
                >
                  <CheckSquare className="h-4 w-4 text-zinc-400" />
                  <div className="flex-1 truncate">
                    <span>{task.title}</span>
                    <span className="ml-2 text-xs text-zinc-400">{task.companyName}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-300" />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Skills */}
          {filteredSkills.length > 0 && search.length >= 2 && (
            <Command.Group heading="Skills" className="px-2 py-1.5 text-xs font-medium text-zinc-500">
              {filteredSkills.map((skill) => (
                <Command.Item
                  key={skill.slug}
                  value={`skill-${skill.name}`}
                  onSelect={() => runCommand(() => router.push(`/skills/${skill.slug}`))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-900 dark:text-zinc-300 dark:aria-selected:bg-emerald-950 dark:aria-selected:text-emerald-100"
                >
                  <Sparkles className="h-4 w-4 text-zinc-400" />
                  <div className="flex-1">
                    <span>{skill.name}</span>
                    <span className="ml-2 text-xs text-zinc-400 truncate">{skill.description}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-300" />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Pages */}
          <Command.Group heading="Pages" className="px-2 py-1.5 text-xs font-medium text-zinc-500">
            {pages.map((page) => (
              <Command.Item
                key={page.href}
                value={`page-${page.label} ${page.keywords.join(" ")}`}
                onSelect={() => runCommand(() => router.push(page.href))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-900 dark:text-zinc-300 dark:aria-selected:bg-emerald-950 dark:aria-selected:text-emerald-100"
              >
                <page.icon className="h-4 w-4 text-zinc-400" />
                <span className="flex-1">{page.label}</span>
                <ArrowRight className="h-4 w-4 text-zinc-300" />
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">↵</kbd>
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">⌘K</kbd>
            to open
          </span>
        </div>
      </div>
    </Command.Dialog>
  )
}
