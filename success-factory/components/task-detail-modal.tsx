"use client"

import { useState, useEffect } from "react"
import {
  X,
  ExternalLink,
  Send,
  Calendar,
  User,
  Tag,
  Clock,
  FileText,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Search,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface NotionProperty {
  type: string
  value: unknown
  color?: string
}

interface NotionComment {
  id: string
  content: string
  createdTime: string
  createdBy: {
    id: string
    name?: string
    avatar?: string
  }
}

interface NotionBlock {
  type: string
  content: string
  hasChildren?: boolean
}

interface NotionPageData {
  id: string
  url: string
  createdTime: string
  lastEditedTime: string
  properties: Record<string, NotionProperty>
  content: NotionBlock[]
  comments: NotionComment[]
}

interface Company {
  id: string
  hubspotId: string
  name: string
  domain?: string | null
}

interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  notionPageId: string
  taskTitle: string
  taskId: string
  companyId?: string
  companyName?: string
  onUpdate?: () => void
}

export function TaskDetailModal({
  isOpen,
  onClose,
  notionPageId,
  taskTitle,
  taskId,
  companyId: initialCompanyId,
  companyName: initialCompanyName,
  onUpdate,
}: TaskDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [pageData, setPageData] = useState<NotionPageData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState("")
  const [postingComment, setPostingComment] = useState(false)
  const [showAllProperties, setShowAllProperties] = useState(false)

  // Company association state
  const [showCompanySearch, setShowCompanySearch] = useState(false)
  const [companySearchQuery, setCompanySearchQuery] = useState("")
  const [companySearchResults, setCompanySearchResults] = useState<Company[]>([])
  const [searchingCompanies, setSearchingCompanies] = useState(false)
  const [currentCompanyName, setCurrentCompanyName] = useState(initialCompanyName || "")
  const [updatingCompany, setUpdatingCompany] = useState(false)

  useEffect(() => {
    if (isOpen && notionPageId) {
      fetchPageData()
    }
  }, [isOpen, notionPageId])

  async function fetchPageData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/integrations/notion/pages/${notionPageId}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setPageData(data)
      }
    } catch (err) {
      setError("Failed to load task details")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handlePostComment() {
    if (!newComment.trim() || postingComment) return

    setPostingComment(true)
    try {
      const res = await fetch(`/api/integrations/notion/pages/${notionPageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      })
      const data = await res.json()
      if (data.success && pageData) {
        setPageData({
          ...pageData,
          comments: [...pageData.comments, data.comment],
        })
        setNewComment("")
      }
    } catch (err) {
      console.error("Failed to post comment:", err)
    } finally {
      setPostingComment(false)
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      await fetch(`/api/integrations/notion/pages/${notionPageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: {
            Status: { status: { name: newStatus } },
          },
        }),
      })
      fetchPageData()
      onUpdate?.()
    } catch (err) {
      console.error("Failed to update status:", err)
    }
  }

  // Company search with debounce
  useEffect(() => {
    if (!companySearchQuery.trim()) {
      setCompanySearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingCompanies(true)
      try {
        const res = await fetch(`/api/companies?search=${encodeURIComponent(companySearchQuery)}&limit=10`)
        const data = await res.json()
        setCompanySearchResults(data.companies || [])
      } catch (err) {
        console.error("Failed to search companies:", err)
      } finally {
        setSearchingCompanies(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [companySearchQuery])

  async function updateCompany(company: Company) {
    if (!taskId) return

    setUpdatingCompany(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/company`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.hubspotId,
          companyName: company.name,
        }),
      })

      if (res.ok) {
        setCurrentCompanyName(company.name)
        setShowCompanySearch(false)
        setCompanySearchQuery("")
        onUpdate?.()
      }
    } catch (err) {
      console.error("Failed to update company:", err)
    } finally {
      setUpdatingCompany(false)
    }
  }

  if (!isOpen) return null

  // Key properties to show prominently
  const keyProps = ["Status", "Assignee", "Assigned To", "Priority", "Due", "Due Date", "Tags", "Project", "Team"]
  const titleProp = Object.entries(pageData?.properties || {}).find(([, v]) => v.type === "title")
  const statusProp = pageData?.properties["Status"]
  const assigneeProp = pageData?.properties["Assignee"] || pageData?.properties["Assigned To"]
  const priorityProp = pageData?.properties["Priority"]
  const dueProp = pageData?.properties["Due"] || pageData?.properties["Due Date"]
  const tagsProp = pageData?.properties["Tags"]

  const otherProps = Object.entries(pageData?.properties || {}).filter(
    ([key, val]) => !keyProps.includes(key) && val.type !== "title"
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div className="relative w-full max-w-3xl rounded-2xl bg-bg-elevated shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border-default bg-bg-elevated p-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-content-primary pr-8">
              {titleProp ? String(titleProp[1].value) : taskTitle}
            </h2>
            {pageData && (
              <p className="mt-1 text-xs text-content-secondary">
                Last edited {formatDistanceToNow(new Date(pageData.lastEditedTime), { addSuffix: true })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pageData?.url && (
              <a
                href={pageData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg border border-border-default px-3 py-1.5 text-sm text-content-secondary hover:bg-surface-hover"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Notion
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-content-tertiary hover:bg-surface-hover hover:text-content-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-content-tertiary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-2 h-8 w-8 text-error-500" />
              <p className="text-error-600 dark:text-error-400">{error}</p>
              <button
                onClick={fetchPageData}
                className="mt-4 rounded-lg bg-bg-tertiary px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
              >
                Retry
              </button>
            </div>
          ) : pageData ? (
            <div className="space-y-6">
              {/* Status Actions */}
              {statusProp && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-content-secondary mr-2">Status:</span>
                  {["Not Started", "In Progress", "Done"].map((status) => {
                    const currentStatus = String(statusProp.value || "").toLowerCase()
                    // Handle both "Done" and "Completed" as completed states
                    const isCompleteStatus = ["done", "completed"].includes(currentStatus)
                    const isActive = status === "Done"
                      ? isCompleteStatus
                      : currentStatus === status.toLowerCase()
                    return (
                      <button
                        key={status}
                        onClick={() => !isActive && updateStatus(status)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                          isActive
                            ? status === "Done"
                              ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                              : status === "In Progress"
                              ? "bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400"
                              : "bg-bg-tertiary text-content-secondary"
                            : "border border-border-default text-content-secondary hover:bg-surface-hover"
                        )}
                      >
                        {status === "Done" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : status === "In Progress" ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                        {status}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Company Association */}
              <div className="rounded-lg border border-border-default p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-content-tertiary" />
                    <div>
                      <p className="text-xs text-content-secondary">Company</p>
                      <p className="text-sm font-medium text-content-primary">
                        {currentCompanyName || initialCompanyName || "No company linked"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCompanySearch(!showCompanySearch)}
                    className="rounded-lg border border-border-default px-3 py-1.5 text-sm text-content-secondary hover:bg-surface-hover"
                  >
                    {showCompanySearch ? "Cancel" : "Change"}
                  </button>
                </div>

                {/* Company Search */}
                {showCompanySearch && (
                  <div className="mt-3 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
                      <input
                        type="text"
                        value={companySearchQuery}
                        onChange={(e) => setCompanySearchQuery(e.target.value)}
                        placeholder="Search companies..."
                        className="w-full rounded-lg border border-border-default bg-bg-elevated py-2 pl-9 pr-3 text-sm text-content-primary outline-none focus:border-success-500 focus:ring-1 focus:ring-success-500"
                        autoFocus
                      />
                      {searchingCompanies && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-content-tertiary" />
                      )}
                    </div>

                    {/* Search Results */}
                    {companySearchResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border-default bg-bg-elevated">
                        {companySearchResults.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => updateCompany(company)}
                            disabled={updatingCompany}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-hover disabled:opacity-50"
                          >
                            <div>
                              <p className="text-sm font-medium text-content-primary">
                                {company.name}
                              </p>
                              {company.domain && (
                                <p className="text-xs text-content-secondary">{company.domain}</p>
                              )}
                            </div>
                            {updatingCompany ? (
                              <Loader2 className="h-4 w-4 animate-spin text-content-tertiary" />
                            ) : (
                              <Check className="h-4 w-4 text-success-500 opacity-0 group-hover:opacity-100" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {companySearchQuery && !searchingCompanies && companySearchResults.length === 0 && (
                      <p className="text-center text-sm text-content-secondary py-2">
                        No companies found
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Key Properties */}
              <div className="grid gap-3 sm:grid-cols-2">
                {assigneeProp && (
                  <PropertyCard
                    icon={User}
                    label="Assignee"
                    value={formatPropertyValue(assigneeProp)}
                  />
                )}
                {priorityProp && (
                  <PropertyCard
                    icon={AlertCircle}
                    label="Priority"
                    value={formatPropertyValue(priorityProp)}
                    color={priorityProp.color}
                  />
                )}
                {dueProp && (
                  <PropertyCard
                    icon={Calendar}
                    label="Due Date"
                    value={formatPropertyValue(dueProp)}
                  />
                )}
                {tagsProp && (
                  <PropertyCard
                    icon={Tag}
                    label="Tags"
                    value={formatPropertyValue(tagsProp)}
                  />
                )}
              </div>

              {/* Other Properties (collapsible) */}
              {otherProps.length > 0 && (
                <div className="rounded-lg border border-border-default">
                  <button
                    onClick={() => setShowAllProperties(!showAllProperties)}
                    className="flex w-full items-center justify-between p-3 text-sm font-medium text-content-secondary hover:bg-surface-hover"
                  >
                    <span>{showAllProperties ? "Hide" : "Show"} all properties ({otherProps.length})</span>
                    {showAllProperties ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {showAllProperties && (
                    <div className="border-t border-border-default p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {otherProps.map(([key, prop]) => (
                          <div key={key} className="text-sm">
                            <span className="text-content-secondary">{key}: </span>
                            <span className="text-content-primary">
                              {formatPropertyValue(prop) || "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Page Content */}
              {pageData.content.length > 0 && (
                <div className="rounded-lg border border-border-default p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-content-secondary">
                    <FileText className="h-4 w-4" />
                    Content
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {pageData.content.map((block, i) => (
                      <ContentBlock key={i} block={block} />
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="rounded-lg border border-border-default p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-content-secondary">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({pageData.comments.length})
                </div>

                {/* Comment List */}
                {pageData.comments.length > 0 ? (
                  <div className="mb-4 space-y-3">
                    {pageData.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-lg bg-bg-tertiary p-3"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          {comment.createdBy.avatar ? (
                            <img
                              src={comment.createdBy.avatar}
                              alt=""
                              className="h-6 w-6 rounded-full"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-tertiary text-xs font-medium text-content-secondary">
                              {comment.createdBy.name?.[0] || "?"}
                            </div>
                          )}
                          <span className="text-sm font-medium text-content-primary">
                            {comment.createdBy.name || "Unknown"}
                          </span>
                          <span className="text-xs text-content-secondary">
                            {formatDistanceToNow(new Date(comment.createdTime), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-content-secondary whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-content-secondary">No comments yet</p>
                )}

                {/* New Comment */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePostComment()}
                    placeholder="Add a comment..."
                    className="flex-1 rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm placeholder:text-content-tertiary focus:border-success-500 focus:outline-none focus:ring-1 focus:ring-success-500"
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || postingComment}
                    className="flex items-center gap-1 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-50"
                  >
                    {postingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PropertyCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-default p-3">
      <Icon className="h-4 w-4 text-content-tertiary" />
      <div>
        <p className="text-xs text-content-secondary">{label}</p>
        <p className={cn(
          "text-sm font-medium text-content-primary",
          color && `text-${color}-600`
        )}>
          {value || "—"}
        </p>
      </div>
    </div>
  )
}

function ContentBlock({ block }: { block: NotionBlock }) {
  switch (block.type) {
    case "paragraph":
      return block.content ? <p>{block.content}</p> : <br />
    case "heading_1":
      return <h1 className="text-xl font-bold">{block.content}</h1>
    case "heading_2":
      return <h2 className="text-lg font-bold">{block.content}</h2>
    case "heading_3":
      return <h3 className="text-base font-bold">{block.content}</h3>
    case "bulleted_list_item":
      return <li className="ml-4 list-disc">{block.content}</li>
    case "numbered_list_item":
      return <li className="ml-4 list-decimal">{block.content}</li>
    case "to_do":
      return <li className="ml-4 list-none">{block.content}</li>
    case "toggle":
      return <details><summary>{block.content}</summary></details>
    case "code":
      return <pre className="rounded bg-bg-tertiary p-2 text-xs"><code>{block.content}</code></pre>
    case "quote":
      return <blockquote className="border-l-2 border-border-default pl-4 italic">{block.content}</blockquote>
    case "divider":
      return <hr />
    case "callout":
      return <div className="rounded-lg bg-bg-tertiary p-3">{block.content}</div>
    default:
      return block.content ? <p>{block.content}</p> : null
  }
}

function formatPropertyValue(prop: NotionProperty): string {
  switch (prop.type) {
    case "title":
    case "rich_text":
    case "number":
    case "url":
    case "email":
    case "phone_number":
    case "checkbox":
    case "unique_id":
      return String(prop.value ?? "")
    case "select":
    case "status":
      return String(prop.value ?? "")
    case "multi_select":
      return (prop.value as Array<{ name: string }>)?.map(s => s.name).join(", ") || ""
    case "date":
      const date = prop.value as { start: string; end?: string } | null
      if (!date) return ""
      return date.end ? `${date.start} → ${date.end}` : date.start
    case "people":
      return (prop.value as Array<{ name?: string; email?: string }>)?.map(p => p.name || p.email || "Unknown").join(", ") || ""
    case "created_time":
    case "last_edited_time":
      return prop.value ? new Date(prop.value as string).toLocaleString() : ""
    case "created_by":
      return (prop.value as { name?: string })?.name || ""
    default:
      return String(prop.value ?? "")
  }
}
