"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Send, Loader2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Comment {
  id: string
  text: string
  createdAt: string
  author: {
    id: string
    name: string
    avatar?: string | null
  }
}

interface TaskCommentsProps {
  taskId: string
  notionPageId?: string
  notionUrl?: string
  className?: string
}

export function TaskComments({
  taskId,
  notionPageId,
  notionUrl,
  className,
}: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (expanded && notionPageId) {
      fetchComments()
    }
  }, [expanded, notionPageId, taskId])

  async function fetchComments() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setComments(data.comments || [])
      }
    } catch (err) {
      setError("Failed to load comments")
      console.error("Failed to fetch comments:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newComment.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        toast.error("Failed to add comment")
      } else if (data.comment) {
        setComments([...comments, data.comment])
        setNewComment("")
        toast.success("Comment added")
      }
    } catch (err) {
      setError("Failed to add comment")
      toast.error("Failed to add comment")
      console.error("Failed to add comment:", err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!notionPageId) {
    return null
  }

  return (
    <div className={cn("border-t border-zinc-200 dark:border-zinc-700", className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <MessageSquare className="h-4 w-4" />
        <span>
          {expanded ? "Hide Comments" : "Comments"}
          {comments.length > 0 && !expanded && (
            <span className="ml-1 text-zinc-400">({comments.length})</span>
          )}
        </span>
        {notionUrl && (
          <a
            href={notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            View in Notion
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </button>

      {/* Comments Panel */}
      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
          {/* Error Message */}
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* Comments List */}
              <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="py-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No comments yet
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg bg-white p-3 shadow-sm dark:bg-zinc-900"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {comment.author.avatar ? (
                          <img
                            src={comment.author.avatar}
                            alt={comment.author.name}
                            className="h-5 w-5 rounded-full"
                          />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            {comment.author.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {new Date(comment.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                        {comment.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}
