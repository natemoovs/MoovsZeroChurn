/**
 * HubSpot Deal Sync Service
 *
 * Syncs pipelines, stages, and deals from HubSpot with stage history tracking
 * for deal velocity analytics.
 */

import { prisma } from "@/lib/prisma"

const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN
const BASE_URL = "https://api.hubapi.com"

// Rate limiting
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 150

async function rateLimitedDelay(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

function getHeaders(): HeadersInit {
  if (!HUBSPOT_API_KEY) {
    throw new Error("HUBSPOT_ACCESS_TOKEN environment variable is not set")
  }
  return {
    Authorization: `Bearer ${HUBSPOT_API_KEY}`,
    "Content-Type": "application/json",
  }
}

async function hubspotFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  await rateLimitedDelay()

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  if (response.status === 429 && retries > 0) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "1", 10)
    const waitTime = Math.max(retryAfter * 1000, 1000) * (4 - retries)
    console.log(`HubSpot rate limited, waiting ${waitTime}ms before retry`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
    return hubspotFetch<T>(endpoint, options, retries - 1)
  }

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`HubSpot API Error: ${error.message || response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// Types
// ============================================================================

interface HubSpotPipeline {
  id: string
  label: string
  displayOrder: number
  stages: HubSpotStage[]
}

interface HubSpotStage {
  id: string
  label: string
  displayOrder: number
  metadata: {
    probability?: string
    isClosed?: string
  }
}

interface HubSpotDeal {
  id: string
  properties: {
    dealname: string
    amount?: string
    dealstage?: string
    pipeline?: string
    closedate?: string
    createdate?: string
    hs_lastmodifieddate?: string
    hubspot_owner_id?: string
    dealtype?: string
    hs_priority?: string
    hs_deal_stage_probability?: string
    hs_closed_won_date?: string
    hs_closed_lost_date?: string
    closed_lost_reason?: string
    notes_last_updated?: string
    [key: string]: string | undefined
  }
  associations?: {
    companies?: { results: Array<{ id: string; type: string }> }
    contacts?: { results: Array<{ id: string; type: string }> }
  }
}

interface HubSpotOwner {
  id: string
  email: string
  firstName: string
  lastName: string
}

// ============================================================================
// Pipeline & Stage Sync
// ============================================================================

/**
 * Sync all deal pipelines and stages from HubSpot
 */
export async function syncPipelines(): Promise<{ pipelines: number; stages: number }> {
  console.log("Syncing HubSpot pipelines...")

  const response = await hubspotFetch<{ results: HubSpotPipeline[] }>("/crm/v3/pipelines/deals")

  let pipelineCount = 0
  let stageCount = 0

  for (const hsPipeline of response.results) {
    // Upsert pipeline
    const pipeline = await prisma.pipeline.upsert({
      where: { hubspotId: hsPipeline.id },
      create: {
        hubspotId: hsPipeline.id,
        name: hsPipeline.label,
        displayOrder: hsPipeline.displayOrder,
        isActive: true,
      },
      update: {
        name: hsPipeline.label,
        displayOrder: hsPipeline.displayOrder,
      },
    })
    pipelineCount++

    // Upsert stages
    for (const hsStage of hsPipeline.stages) {
      const probability = hsStage.metadata.probability
        ? parseFloat(hsStage.metadata.probability) / 100
        : null
      const isClosed = hsStage.metadata.isClosed === "true"
      // Determine if won based on stage name or probability
      const isWon =
        isClosed &&
        (hsStage.label.toLowerCase().includes("won") ||
          hsStage.label.toLowerCase().includes("closed won") ||
          probability === 1)

      await prisma.pipelineStage.upsert({
        where: { hubspotId: hsStage.id },
        create: {
          hubspotId: hsStage.id,
          pipelineId: pipeline.id,
          label: hsStage.label,
          displayOrder: hsStage.displayOrder,
          probability,
          isClosed,
          isWon,
        },
        update: {
          label: hsStage.label,
          displayOrder: hsStage.displayOrder,
          probability,
          isClosed,
          isWon,
        },
      })
      stageCount++
    }
  }

  console.log(`Synced ${pipelineCount} pipelines with ${stageCount} stages`)
  return { pipelines: pipelineCount, stages: stageCount }
}

// ============================================================================
// Deal Sync
// ============================================================================

/**
 * Get HubSpot owner details
 */
async function getOwner(ownerId: string): Promise<HubSpotOwner | null> {
  try {
    return await hubspotFetch<HubSpotOwner>(`/crm/v3/owners/${ownerId}`)
  } catch {
    return null
  }
}

/**
 * Sync all deals from HubSpot with stage history tracking
 */
export async function syncDeals(options?: {
  fullSync?: boolean // If true, sync all deals; if false, only recent
  since?: Date // Only sync deals modified after this date
}): Promise<{ synced: number; stageChanges: number; errors: number }> {
  console.log("Syncing HubSpot deals...")

  // First ensure pipelines are synced
  await syncPipelines()

  // Build stage lookup map
  const stages = await prisma.pipelineStage.findMany({
    include: { pipeline: true },
  })
  const stageMap = new Map(stages.map((s) => [s.hubspotId, s]))
  const pipelineMap = new Map(stages.map((s) => [s.pipeline.hubspotId, s.pipeline]))

  // Owner cache
  const ownerCache = new Map<string, HubSpotOwner | null>()

  const properties = [
    "dealname",
    "amount",
    "dealstage",
    "pipeline",
    "closedate",
    "createdate",
    "hs_lastmodifieddate",
    "hubspot_owner_id",
    "dealtype",
    "hs_priority",
    "hs_deal_stage_probability",
    "hs_closed_won_date",
    "hs_closed_lost_date",
    "closed_lost_reason",
  ]

  let synced = 0
  let stageChanges = 0
  let errors = 0
  let after: string | undefined

  // Paginate through all deals
  while (true) {
    const body: Record<string, unknown> = {
      properties,
      associations: ["companies", "contacts"],
      limit: 100,
    }

    // Filter by modified date if provided
    if (options?.since && !options.fullSync) {
      body.filterGroups = [
        {
          filters: [
            {
              propertyName: "hs_lastmodifieddate",
              operator: "GTE",
              value: options.since.getTime().toString(),
            },
          ],
        },
      ]
    }

    if (after) {
      body.after = after
    }

    const result = await hubspotFetch<{
      results: HubSpotDeal[]
      paging?: { next?: { after: string } }
    }>("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify(body),
    })

    for (const hsDeal of result.results) {
      try {
        const stageChange = await syncDeal(hsDeal, stageMap, pipelineMap, ownerCache)
        synced++
        if (stageChange) stageChanges++
      } catch (error) {
        console.error(`Error syncing deal ${hsDeal.id}:`, error)
        errors++
      }
    }

    if (!result.paging?.next?.after) break
    after = result.paging.next.after
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  console.log(`Synced ${synced} deals with ${stageChanges} stage changes (${errors} errors)`)
  return { synced, stageChanges, errors }
}

/**
 * Sync a single deal and track stage changes
 */
async function syncDeal(
  hsDeal: HubSpotDeal,
  stageMap: Map<string, Awaited<ReturnType<typeof prisma.pipelineStage.findFirst>>>,
  pipelineMap: Map<string, Awaited<ReturnType<typeof prisma.pipeline.findFirst>>>,
  ownerCache: Map<string, HubSpotOwner | null>
): Promise<boolean> {
  const props = hsDeal.properties

  // Get stage and pipeline
  const stage = props.dealstage ? stageMap.get(props.dealstage) : null
  const pipeline = props.pipeline ? pipelineMap.get(props.pipeline) : null

  // Get owner info
  let ownerName: string | undefined
  let ownerEmail: string | undefined
  if (props.hubspot_owner_id) {
    if (!ownerCache.has(props.hubspot_owner_id)) {
      ownerCache.set(props.hubspot_owner_id, await getOwner(props.hubspot_owner_id))
    }
    const owner = ownerCache.get(props.hubspot_owner_id)
    if (owner) {
      ownerName = `${owner.firstName} ${owner.lastName}`.trim()
      ownerEmail = owner.email
    }
  }

  // Get company association
  const companyAssoc = hsDeal.associations?.companies?.results?.[0]
  let companyId: string | undefined
  let companyName: string | undefined
  if (companyAssoc) {
    const company = await prisma.hubSpotCompany.findFirst({
      where: { hubspotId: companyAssoc.id },
      select: { id: true, name: true },
    })
    if (company) {
      companyId = company.id
      companyName = company.name
    }
  }

  // Calculate velocity metrics
  const createDate = props.createdate ? new Date(props.createdate) : null
  const closeDate = props.closedate ? new Date(props.closedate) : null
  const actualCloseDate = props.hs_closed_won_date
    ? new Date(props.hs_closed_won_date)
    : props.hs_closed_lost_date
      ? new Date(props.hs_closed_lost_date)
      : null

  const isClosed = stage?.isClosed ?? false
  const isWon = stage?.isWon ?? false
  const endDate = actualCloseDate || (isClosed ? new Date() : new Date())
  const daysInPipeline = createDate
    ? Math.floor((endDate.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Check if deal exists and if stage changed
  const existingDeal = await prisma.deal.findUnique({
    where: { hubspotId: hsDeal.id },
    select: { id: true, stageId: true, stageName: true },
  })

  const stageChanged = existingDeal && stage && existingDeal.stageId !== stage.id

  // Upsert deal
  const deal = await prisma.deal.upsert({
    where: { hubspotId: hsDeal.id },
    create: {
      hubspotId: hsDeal.id,
      name: props.dealname || "Unnamed Deal",
      amount: props.amount ? parseFloat(props.amount) : null,
      pipelineId: pipeline?.id,
      stageId: stage?.id,
      stageName: stage?.label,
      createDate,
      closeDate,
      actualCloseDate,
      ownerId: props.hubspot_owner_id,
      ownerName,
      ownerEmail,
      companyId,
      companyHubspotId: companyAssoc?.id,
      companyName,
      dealType: props.dealtype,
      priority: props.hs_priority,
      isClosed,
      isWon,
      lostReason: props.closed_lost_reason,
      daysInPipeline,
      hubspotCreatedAt: props.createdate ? new Date(props.createdate) : null,
      hubspotUpdatedAt: props.hs_lastmodifieddate ? new Date(props.hs_lastmodifieddate) : null,
    },
    update: {
      name: props.dealname || "Unnamed Deal",
      amount: props.amount ? parseFloat(props.amount) : null,
      pipelineId: pipeline?.id,
      stageId: stage?.id,
      stageName: stage?.label,
      closeDate,
      actualCloseDate,
      ownerId: props.hubspot_owner_id,
      ownerName,
      ownerEmail,
      companyId,
      companyHubspotId: companyAssoc?.id,
      companyName,
      dealType: props.dealtype,
      priority: props.hs_priority,
      isClosed,
      isWon,
      lostReason: props.closed_lost_reason,
      daysInPipeline,
      hubspotUpdatedAt: props.hs_lastmodifieddate ? new Date(props.hs_lastmodifieddate) : null,
      lastSyncedAt: new Date(),
    },
  })

  // Track stage change if it happened
  if (stageChanged && stage) {
    // Calculate days in previous stage
    const lastStageChange = await prisma.dealStageHistory.findFirst({
      where: { dealId: deal.id },
      orderBy: { changedAt: "desc" },
    })
    const daysInPreviousStage = lastStageChange
      ? Math.floor((Date.now() - lastStageChange.changedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null

    await prisma.dealStageHistory.create({
      data: {
        dealId: deal.id,
        fromStageId: existingDeal.stageId,
        fromStageName: existingDeal.stageName,
        toStageId: stage.id,
        toStageName: stage.label,
        daysInPreviousStage,
        source: "sync",
      },
    })

    // Update stage count on deal
    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stageCount: { increment: 1 },
        daysInCurrentStage: 0,
      },
    })

    return true
  }

  // If new deal, create initial stage history entry
  if (!existingDeal && stage) {
    await prisma.dealStageHistory.create({
      data: {
        dealId: deal.id,
        toStageId: stage.id,
        toStageName: stage.label,
        source: "sync",
      },
    })
  }

  return false
}

// ============================================================================
// Contact Multi-Threading Sync
// ============================================================================

/**
 * Sync contacts associated with deals and calculate multi-threading scores
 */
export async function syncDealContacts(): Promise<{ deals: number; contacts: number }> {
  console.log("Syncing deal contacts for multi-threading scores...")

  const deals = await prisma.deal.findMany({
    where: { isClosed: false },
    select: { id: true, hubspotId: true },
  })

  let contactCount = 0

  for (const deal of deals) {
    try {
      // Get contacts associated with this deal from HubSpot
      const associations = await hubspotFetch<{
        results: Array<{ id: string; type: string }>
      }>(`/crm/v3/objects/deals/${deal.hubspotId}/associations/contacts`)

      if (associations.results.length === 0) continue

      // Batch read contacts
      const contactIds = associations.results.map((a) => a.id)
      const contactsResponse = await hubspotFetch<{
        results: Array<{
          id: string
          properties: {
            firstname?: string
            lastname?: string
            email?: string
            jobtitle?: string
          }
        }>
      }>("/crm/v3/objects/contacts/batch/read", {
        method: "POST",
        body: JSON.stringify({
          properties: ["firstname", "lastname", "email", "jobtitle"],
          inputs: contactIds.map((id) => ({ id })),
        }),
      })

      // Upsert contacts
      for (const contact of contactsResponse.results) {
        const name =
          [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(" ") ||
          "Unknown"
        const email = contact.properties.email
        const title = contact.properties.jobtitle?.toLowerCase() || ""

        // Infer role from title
        let role = "user"
        if (
          title.includes("ceo") ||
          title.includes("chief") ||
          title.includes("president") ||
          title.includes("founder")
        ) {
          role = "executive_sponsor"
        } else if (
          title.includes("vp") ||
          title.includes("vice president") ||
          title.includes("director")
        ) {
          role = "decision_maker"
        } else if (title.includes("manager") || title.includes("lead")) {
          role = "influencer"
        }

        if (email) {
          await prisma.dealContact.upsert({
            where: {
              dealId_email: { dealId: deal.id, email },
            },
            create: {
              dealId: deal.id,
              hubspotContactId: contact.id,
              name,
              email,
              title: contact.properties.jobtitle,
              role,
            },
            update: {
              name,
              title: contact.properties.jobtitle,
              role,
            },
          })
          contactCount++
        }
      }

      // Calculate multi-threading score for this deal
      await calculateMultiThreadingScore(deal.id)
    } catch (error) {
      console.error(`Error syncing contacts for deal ${deal.hubspotId}:`, error)
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  console.log(`Synced ${contactCount} contacts across ${deals.length} deals`)
  return { deals: deals.length, contacts: contactCount }
}

/**
 * Calculate multi-threading score for a deal based on contacts
 */
async function calculateMultiThreadingScore(dealId: string): Promise<void> {
  const contacts = await prisma.dealContact.findMany({
    where: { dealId },
  })

  const hasChampion = contacts.some((c) => c.role === "champion")
  const hasDecisionMaker = contacts.some(
    (c) => c.role === "decision_maker" || c.role === "executive_sponsor"
  )
  const hasExecutiveSponsor = contacts.some((c) => c.role === "executive_sponsor")
  const contactCount = contacts.length

  // Score calculation:
  // - Base: 20 points for having any contact
  // - +20 for each additional contact (up to 4 contacts = 80 points)
  // - +10 for champion
  // - +10 for decision maker
  // - +10 for executive sponsor
  // Max score: 100

  let score = 0
  if (contactCount > 0) {
    score += 20 // Base score
    score += Math.min(contactCount - 1, 3) * 20 // Up to 60 for additional contacts
    if (hasChampion) score += 10
    if (hasDecisionMaker) score += 10
    if (hasExecutiveSponsor) score += 10
  }

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      contactCount,
      hasChampion,
      hasDecisionMaker,
      hasExecutiveSponsor,
      multiThreadingScore: Math.min(score, 100),
    },
  })
}

// ============================================================================
// Full Sync Entry Point
// ============================================================================

/**
 * Run a full deal sync including pipelines, deals, and contacts
 */
export async function runFullDealSync(): Promise<{
  pipelines: number
  stages: number
  deals: number
  stageChanges: number
  contacts: number
  errors: number
}> {
  console.log("Starting full deal sync...")

  const pipelineResult = await syncPipelines()
  const dealResult = await syncDeals({ fullSync: true })
  const contactResult = await syncDealContacts()

  return {
    pipelines: pipelineResult.pipelines,
    stages: pipelineResult.stages,
    deals: dealResult.synced,
    stageChanges: dealResult.stageChanges,
    contacts: contactResult.contacts,
    errors: dealResult.errors,
  }
}
