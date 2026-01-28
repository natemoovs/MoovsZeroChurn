"use client"

import { useState, useEffect } from "react"
import { Upload, ListPlus, RefreshCw, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface HubSpotActionsProps {
  selectedIds?: string[]
  entityType: "accounts" | "deals"
  onComplete?: () => void
}

interface ActionResult {
  success: boolean
  message: string
  details?: string
}

interface Pipeline {
  id: string
  name: string
}

export function HubSpotActions({ selectedIds = [], entityType, onComplete }: HubSpotActionsProps) {
  const [showModal, setShowModal] = useState(false)
  const [action, setAction] = useState<"list" | "sync" | "enrich" | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [listName, setListName] = useState("")
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>("all")
  const [pipelinesLoading, setPipelinesLoading] = useState(false)

  // Fetch pipelines when modal opens for deals
  useEffect(() => {
    if (showModal && entityType === "deals" && pipelines.length === 0) {
      fetchPipelines()
    }
  }, [showModal, entityType, pipelines.length])

  async function fetchPipelines() {
    setPipelinesLoading(true)
    try {
      const res = await fetch("/api/pipelines")
      const data = await res.json()
      setPipelines(data.pipelines || [])
    } catch (error) {
      console.error("Failed to fetch pipelines:", error)
    } finally {
      setPipelinesLoading(false)
    }
  }

  const handleAction = async () => {
    if (!action) return
    setLoading(true)
    setResult(null)

    try {
      let response: Response
      let data: Record<string, unknown>

      switch (action) {
        case "list":
          if (!listName.trim()) {
            setResult({ success: false, message: "Please enter a list name" })
            setLoading(false)
            return
          }
          response = await fetch("/api/hubspot/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: listName,
              companyIds: selectedIds,
            }),
          })
          data = await response.json()
          if (data.success) {
            setResult({
              success: true,
              message: `Created list "${listName}" with ${data.companiesAdded} companies`,
              details: data.hubspotUrl as string,
            })
          } else {
            setResult({ success: false, message: data.error as string })
          }
          break

        case "sync":
          response = await fetch("/api/hubspot/sync-scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyIds: selectedIds.length > 0 ? selectedIds : undefined,
              syncHealth: true,
              syncPropensity: true,
            }),
          })
          data = await response.json()
          if (data.success) {
            setResult({
              success: true,
              message: `Synced scores for ${data.synced} companies`,
              details: data.failed ? `${data.failed} failed` : undefined,
            })
          } else {
            setResult({ success: false, message: data.error as string })
          }
          break

        case "enrich":
          response = await fetch("/api/hubspot/deals/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dealIds: selectedIds.length > 0 ? selectedIds : undefined,
              pipelineId: selectedPipeline !== "all" ? selectedPipeline : undefined,
            }),
          })
          data = await response.json()
          if (data.success) {
            setResult({
              success: true,
              message: `Enriched ${data.enriched} deals`,
              details: data.failed ? `${data.failed} failed` : undefined,
            })
          } else {
            setResult({ success: false, message: data.error as string })
          }
          break
      }

      if (onComplete) onComplete()
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setAction(null)
    setResult(null)
    setListName("")
    setSelectedPipeline("all")
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setAction("list")
            setShowModal(true)
          }}
          className="btn-secondary flex items-center gap-2"
          title="Create HubSpot List"
        >
          <ListPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Create List</span>
        </button>

        {entityType === "accounts" && (
          <button
            onClick={() => {
              setAction("sync")
              setShowModal(true)
            }}
            className="btn-secondary flex items-center gap-2"
            title="Sync Scores to HubSpot"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Sync Scores</span>
          </button>
        )}

        {entityType === "deals" && (
          <button
            onClick={() => {
              setAction("enrich")
              setShowModal(true)
            }}
            className="btn-secondary flex items-center gap-2"
            title="Enrich Deals in HubSpot"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Enrich Deals</span>
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-primary border-border-default m-4 w-full max-w-md rounded-xl border shadow-xl">
            {/* Header */}
            <div className="border-border-default flex items-center justify-between border-b p-4">
              <h3 className="text-content-primary text-lg font-semibold">
                {action === "list" && "Create HubSpot List"}
                {action === "sync" && "Sync Scores to HubSpot"}
                {action === "enrich" && "Enrich Deals in HubSpot"}
              </h3>
              <button
                onClick={closeModal}
                className="text-content-tertiary hover:text-content-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {result ? (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-4",
                    result.success ? "bg-success-500/10" : "bg-error-500/10"
                  )}
                >
                  {result.success ? (
                    <CheckCircle className="text-success-500 mt-0.5 h-5 w-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="text-error-500 mt-0.5 h-5 w-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={result.success ? "text-success-600" : "text-error-600"}>
                      {result.message}
                    </p>
                    {result.details && (
                      <p className="text-content-secondary mt-1 text-sm">
                        {result.details.startsWith("http") ? (
                          <a
                            href={result.details}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-primary underline"
                          >
                            View in HubSpot
                          </a>
                        ) : (
                          result.details
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {action === "list" && (
                    <div className="space-y-4">
                      <p className="text-content-secondary text-sm">
                        Create a new list in HubSpot with{" "}
                        {selectedIds.length > 0 ? `${selectedIds.length} selected` : "all"}{" "}
                        companies.
                      </p>
                      <div>
                        <label className="text-content-secondary mb-1 block text-sm">
                          List Name
                        </label>
                        <input
                          type="text"
                          value={listName}
                          onChange={(e) => setListName(e.target.value)}
                          placeholder="e.g., At Risk Q1 2024"
                          className="input-sf w-full"
                        />
                      </div>
                    </div>
                  )}

                  {action === "sync" && (
                    <div className="space-y-4">
                      <p className="text-content-secondary text-sm">
                        Sync health scores and propensity scores to HubSpot company properties for{" "}
                        {selectedIds.length > 0 ? `${selectedIds.length} selected` : "all"}{" "}
                        companies.
                      </p>
                      <div className="bg-bg-secondary rounded-lg p-3 text-sm">
                        <p className="text-content-primary font-medium">Properties synced:</p>
                        <ul className="text-content-secondary mt-2 list-inside list-disc space-y-1">
                          <li>success_factory_health_score</li>
                          <li>success_factory_propensity_score</li>
                          <li>success_factory_churn_risk</li>
                          <li>success_factory_expansion_potential</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {action === "enrich" && (
                    <div className="space-y-4">
                      <p className="text-content-secondary text-sm">
                        Push multi-threading scores, competitor info, and risk flags to HubSpot
                        deals.
                      </p>
                      <div>
                        <label className="text-content-secondary mb-1 block text-sm">
                          Pipeline Filter
                        </label>
                        <select
                          value={selectedPipeline}
                          onChange={(e) => setSelectedPipeline(e.target.value)}
                          disabled={pipelinesLoading}
                          className="border-border-default bg-bg-elevated text-content-primary focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                        >
                          <option value="all">All Pipelines</option>
                          <option value="moovs">Moovs Only</option>
                          <option value="swoop">Swoop Only</option>
                          {pipelines.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="bg-bg-secondary rounded-lg p-3 text-sm">
                        <p className="text-content-primary font-medium">Properties enriched:</p>
                        <ul className="text-content-secondary mt-2 list-inside list-disc space-y-1">
                          <li>success_factory_multi_threading_score</li>
                          <li>success_factory_contact_count</li>
                          <li>success_factory_competitor</li>
                          <li>success_factory_risk_flags</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-border-default flex justify-end gap-3 border-t p-4">
              <button onClick={closeModal} className="btn-secondary">
                {result ? "Close" : "Cancel"}
              </button>
              {!result && (
                <button onClick={handleAction} disabled={loading} className="btn-primary">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {action === "list" && "Create List"}
                      {action === "sync" && "Sync Scores"}
                      {action === "enrich" && "Enrich Deals"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
