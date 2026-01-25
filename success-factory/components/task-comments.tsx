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

export function TaskComments({ taskId, notionPageId, notionUrl, className }: TaskCommentsProps) {
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
    <div className={cn("border-border-default border-t", className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-content-secondary hover:bg-surface-hover hover:text-content-primary flex w-full items-center gap-2 px-4 py-2 text-sm"
      >
        <MessageSquare className="h-4 w-4" />
        <span>
          {expanded ? "Hide Comments" : "Comments"}
          {comments.length > 0 && !expanded && (
            <span className="text-content-tertiary ml-1">({comments.length})</span>
          )}
        </span>
        {notionUrl && (
          <a
            href={notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-success-600 hover:text-success-700 dark:text-success-400 dark:hover:text-success-300 ml-auto flex items-center gap-1 text-xs"
          >
            View in Notion
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </button>

      {/* Comments Panel */}
      {expanded && (
        <div className="border-border-default bg-bg-tertiary border-t p-4">
          {/* Error Message */}
          {error && (
            <div className="bg-error-50 text-error-600 dark:bg-error-900/20 dark:text-error-400 mb-3 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="text-content-tertiary h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              {/* Comments List */}
              <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-content-secondary py-2 text-center text-sm">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-bg-elevated rounded-lg p-3 shadow-sm">
                      <div className="mb-1 flex items-center gap-2">
                        {comment.author.avatar ? (
                          <img
                            src={comment.author.avatar}
                            alt={comment.author.name}
                            className="h-5 w-5 rounded-full"
                          />
                        ) : (
                          <div className="bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
                            {comment.author.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-content-secondary text-sm font-medium">
                          {comment.author.name}
                        </span>
                        <span className="text-content-tertiary text-xs">
                          {new Date(comment.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-content-secondary text-sm whitespace-pre-wrap">
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
                  className="border-border-default bg-bg-elevated text-content-primary focus:border-success-500 focus:ring-success-500 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="bg-success-600 hover:bg-success-700 flex items-center justify-center rounded-lg px-3 py-2 text-white disabled:opacity-50"
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
