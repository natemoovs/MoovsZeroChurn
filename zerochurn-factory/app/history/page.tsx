"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getHistory, deleteHistoryItem, clearHistory, type HistoryItem } from "@/lib/history"

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setHistory(getHistory())
  }, [])

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
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              &larr; Back to skills
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Generation History
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Your recent generations (stored locally)
            </p>
          </div>
          {history.length > 0 && (
            <Button variant="outline" onClick={handleClearAll}>
              Clear All
            </Button>
          )}
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-[200px] items-center justify-center">
              <p className="text-zinc-500">No history yet. Generate something to see it here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.skillName}</CardTitle>
                      <p className="text-sm text-zinc-500">{formatDate(item.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.feedback && (
                        <span className="text-lg">{item.feedback === 'up' ? '👍' : '👎'}</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        {expandedId === item.id ? "Collapse" : "Expand"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandedId === item.id && (
                  <CardContent>
                    <div className="mb-4 rounded-md bg-zinc-100 p-4 dark:bg-zinc-900">
                      <pre className="whitespace-pre-wrap text-sm">{item.result}</pre>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(item.result)}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </Button>
                      <Link href={`/skill/${item.skillSlug}`}>
                        <Button variant="outline" size="sm">
                          Run Again
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
