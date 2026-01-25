"use client"

import { useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Search,
} from "lucide-react"
import { getHistory, deleteHistoryItem, clearHistory, type HistoryItem } from "@/lib/history"
import { cn } from "@/lib/utils"

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>(() => getHistory())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const handleDelete = (id: string) => {
    deleteHistoryItem(id)
    setHistory(getHistory())
  }

  const handleClearAll = () => {
    if (confirm("Clear all history? This cannot be undone.")) {
      clearHistory()
      setHistory([])
    }
  }

  const handleCopy = async (result: string) => {
    await navigator.clipboard.writeText(result)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return "Today at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (days === 1) {
      return "Yesterday at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const filteredHistory = history.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return item.skillName.toLowerCase().includes(query) || item.result.toLowerCase().includes(query)
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-content-primary text-2xl font-bold">History</h1>
            <p className="text-content-secondary mt-1">Your recent generations (stored locally)</p>
          </div>
          {history.length > 0 && (
            <Button variant="outline" onClick={handleClearAll}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>

        {/* Search */}
        {history.length > 0 && (
          <div className="relative max-w-md">
            <Search className="text-content-tertiary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border-default bg-bg-primary placeholder:text-content-tertiary focus:border-success-500 focus:ring-success-500/20 h-10 w-full rounded-lg border pr-4 pl-10 text-sm transition-colors outline-none focus:ring-2"
            />
          </div>
        )}

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <div className="card-sf p-12 text-center">
            <div className="bg-bg-secondary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Clock className="text-content-tertiary h-6 w-6" />
            </div>
            <h3 className="text-content-primary text-lg font-medium">
              {searchQuery ? "No matching results" : "No history yet"}
            </h3>
            <p className="text-content-secondary mt-1">
              {searchQuery ? "Try a different search term" : "Generate something to see it here"}
            </p>
            {!searchQuery && (
              <Link href="/skills">
                <Button className="mt-4">Browse Skills</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div key={item.id} className="card-sf shadow-sm">
                {/* Header */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-bg-secondary flex h-10 w-10 items-center justify-center rounded-lg">
                      <Clock className="text-content-secondary h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-content-primary font-medium">{item.skillName}</h3>
                      <p className="text-content-secondary text-sm">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.feedback && (
                      <span
                        className={cn(
                          "rounded-full p-1",
                          item.feedback === "up"
                            ? "bg-success-100 text-success-600 dark:bg-success-950 dark:text-success-400"
                            : "bg-error-100 text-error-600 dark:bg-error-950 dark:text-error-400"
                        )}
                      >
                        {item.feedback === "up" ? (
                          <ThumbsUp className="h-4 w-4" />
                        ) : (
                          <ThumbsDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                    {expandedId === item.id ? (
                      <ChevronUp className="text-content-tertiary h-5 w-5" />
                    ) : (
                      <ChevronDown className="text-content-tertiary h-5 w-5" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === item.id && (
                  <div className="border-border-default border-t p-4">
                    <div className="bg-bg-secondary mb-4 rounded-lg p-4">
                      <pre className="text-content-primary max-h-96 overflow-auto text-sm whitespace-pre-wrap">
                        {item.result}
                      </pre>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopy(item.result)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                      <Link href={`/skills/${item.skillSlug}`}>
                        <Button variant="outline" size="sm">
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Run Again
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-error-600 hover:bg-error-50 hover:text-error-700 dark:text-error-400 dark:hover:bg-error-950 dark:hover:text-error-300"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
