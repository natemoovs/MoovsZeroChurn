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
    <div className={cn("border-t border-border-default", className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-content-secondary hover:bg-surface-hover hover:text-content-primary"
      >
        <MessageSquare className="h-4 w-4" />
        <span>
          {expanded ? "Hide Comments" : "Comments"}
          {comments.length > 0 && !expanded && (
            <span className="ml-1 text-content-tertiary">({comments.length})</span>
          )}
        </span>
        {notionUrl && (
          <a
            href={notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex items-center gap-1 text-xs text-success-600 hover:text-success-700 dark:text-success-400 dark:hover:text-success-300"
          >
            View in Notion
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </button>

      {/* Comments Panel */}
      {expanded && (
        <div className="border-t border-border-default bg-bg-tertiary p-4">
          {/* Error Message */}
          {error && (
            <div className="mb-3 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-900/20 dark:text-error-400">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-content-tertiary" />
            </div>
          ) : (
            <>
              {/* Comments List */}
              <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="py-2 text-center text-sm text-content-secondary">
                    No comments yet
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg bg-bg-elevated p-3 shadow-sm"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {comment.author.avatar ? (
                          <img
                            src={comment.author.avatar}
                            alt={comment.author.name}
                            className="h-5 w-5 rounded-full"
                          />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success-100 text-xs font-medium text-success-700 dark:bg-success-900 dark:text-success-300">
                            {comment.author.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-medium text-content-secondary">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-content-tertiary">
                          {new Date(comment.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-content-secondary whitespace-pre-wrap">
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
                  className="flex-1 rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-content-primary outline-none focus:border-success-500 focus:ring-1 focus:ring-success-500"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center justify-center rounded-lg bg-success-600 px-3 py-2 text-white hover:bg-success-700 disabled:opacity-50"
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
