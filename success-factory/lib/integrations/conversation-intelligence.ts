/**
 * Conversation Intelligence Integration
 *
 * Analyzes call notes and transcripts from HubSpot to:
 * - Extract action items and commitments
 * - Analyze sentiment and topics
 * - Identify risks and opportunities
 * - Create follow-up tasks automatically
 *
 * Primary source: HubSpot engagements (calls, meetings, notes)
 */

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { complete } from "@/lib/ai"

// Note: HubSpot engagement fetching requires HubSpot client setup
// For now, we primarily support manual call logging and transcript analysis

type Provider = "hubspot" | "manual"

interface CallRecord {
  id: string
  provider: Provider
  externalId: string
  companyId: string
  contactEmail?: string
  contactName?: string
  title: string
  date: Date
  duration: number // seconds
  participants: string[]
  transcript?: string
  summary?: string
  sentiment?: "positive" | "neutral" | "negative"
  topics?: string[]
  actionItems?: string[]
  nextSteps?: string[]
  metadata?: Record<string, unknown>
}

interface CallInsights {
  summary: string
  sentiment: "positive" | "neutral" | "negative"
  sentimentScore: number // -1 to 1
  topics: string[]
  actionItems: string[]
  risks: string[]
  opportunities: string[]
  nextSteps: string[]
  keyQuotes: string[]
}

interface HubSpotEngagement {
  id: string
  type: "CALL" | "MEETING" | "NOTE" | "EMAIL"
  timestamp: number
  metadata: {
    title?: string
    body?: string
    durationMilliseconds?: number
    toNumber?: string
    fromNumber?: string
    status?: string
  }
  associations: {
    companyIds?: number[]
    contactIds?: number[]
  }
}

/**
 * Fetch recent calls/meetings from HubSpot for a company
 * Note: This requires HubSpot API client setup. Returns empty for now.
 * Use manual call logging via logManualCall() for call transcript analysis.
 */
export async function getHubSpotEngagements(
  _hubspotCompanyId: string,
  _options: { daysBack?: number; types?: string[] } = {}
): Promise<HubSpotEngagement[]> {
  // HubSpot engagement fetching requires direct API integration
  // For now, use manual call logging or sync engagements through external process
  console.log("[Conversation Intelligence] HubSpot engagement sync not configured. Use manual call logging.")
  return []
}

/**
 * Analyze call/meeting transcript using AI
 */
export async function analyzeCallTranscript(
  transcript: string,
  context: {
    companyName: string
    contactName?: string
    meetingType?: string
    healthScore?: string
  }
): Promise<CallInsights> {
  const prompt = `Analyze this customer call/meeting notes and extract insights.

Company: ${context.companyName}
Contact: ${context.contactName || "Unknown"}
Meeting Type: ${context.meetingType || "Unknown"}
Current Health Score: ${context.healthScore || "Unknown"}

Notes/Transcript:
${transcript.slice(0, 8000)} ${transcript.length > 8000 ? "...[truncated]" : ""}

Provide a JSON response with:
{
  "summary": "2-3 sentence summary of the call",
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": number between -1 and 1,
  "topics": ["list", "of", "main", "topics"],
  "actionItems": ["specific action items mentioned"],
  "risks": ["any concerns or risks identified"],
  "opportunities": ["expansion or upsell opportunities"],
  "nextSteps": ["agreed next steps"],
  "keyQuotes": ["important quotes from customer"]
}

Return ONLY valid JSON.`

  try {
    const response = await complete("general", prompt, { maxTokens: 1000 })

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const insights = JSON.parse(jsonMatch[0]) as CallInsights
      return insights
    }

    throw new Error("No JSON found in response")
  } catch (error) {
    console.error("[Conversation Intelligence] AI analysis error:", error)

    // Return default insights
    return {
      summary: "Call analysis pending manual review.",
      sentiment: "neutral",
      sentimentScore: 0,
      topics: [],
      actionItems: [],
      risks: [],
      opportunities: [],
      nextSteps: [],
      keyQuotes: [],
    }
  }
}

/**
 * Store call record and insights
 */
export async function storeCallRecord(
  call: Omit<CallRecord, "id">,
  insights?: CallInsights
): Promise<string> {
  // Get company name for task creation
  const company = await prisma.hubSpotCompany.findUnique({
    where: { id: call.companyId },
    select: { name: true },
  })
  const companyName = company?.name || "Unknown Company"

  // Store as activity event with rich metadata
  const activity = await prisma.activityEvent.create({
    data: {
      companyId: call.companyId,
      source: call.provider,
      eventType: "call_recorded",
      title: call.title,
      description: insights?.summary || call.summary || "Call recorded",
      importance:
        insights?.sentiment === "negative"
          ? "high"
          : insights?.sentiment === "positive"
            ? "low"
            : "medium",
      metadata: {
        externalId: call.externalId,
        duration: call.duration,
        participants: call.participants,
        contactEmail: call.contactEmail,
        contactName: call.contactName,
        sentiment: insights?.sentiment || call.sentiment,
        sentimentScore: insights?.sentimentScore,
        topics: insights?.topics || call.topics,
        actionItems: insights?.actionItems || call.actionItems,
        risks: insights?.risks,
        opportunities: insights?.opportunities,
        nextSteps: insights?.nextSteps || call.nextSteps,
        keyQuotes: insights?.keyQuotes,
        hasTranscript: !!call.transcript,
      },
      occurredAt: call.date,
    },
  })

  // Create tasks for action items
  if (insights?.actionItems && insights.actionItems.length > 0) {
    await prisma.task.createMany({
      data: insights.actionItems.slice(0, 3).map((item, index) => ({
        companyId: call.companyId,
        companyName,
        title: item,
        description: `Action item from call: ${call.title}`,
        priority: index === 0 ? "high" : "medium",
        status: "pending",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: { source: "conversation_intelligence", callId: activity.id },
      })),
    })
  }

  // Create tasks for identified risks
  if (insights?.risks && insights.risks.length > 0) {
    await prisma.task.create({
      data: {
        companyId: call.companyId,
        companyName,
        title: `Risk identified: ${insights.risks[0].slice(0, 50)}...`,
        description: `From call: ${call.title}\n\nRisks mentioned:\n${insights.risks.map((r) => `• ${r}`).join("\n")}`,
        priority: "high",
        status: "pending",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        metadata: { source: "conversation_intelligence" },
      },
    })
  }

  // Log expansion opportunities
  if (insights?.opportunities && insights.opportunities.length > 0) {
    await prisma.activityEvent.create({
      data: {
        companyId: call.companyId,
        source: "conversation_intelligence",
        eventType: "expansion_signal",
        title: "Expansion opportunity mentioned in call",
        description: insights.opportunities.join("; "),
        importance: "high",
        metadata: { callId: activity.id, opportunities: insights.opportunities },
        occurredAt: new Date(),
      },
    })
  }

  console.log(
    `[Conversation Intelligence] Stored call record for ${call.companyId}:`,
    {
      id: activity.id,
      sentiment: insights?.sentiment,
      actionItems: insights?.actionItems?.length || 0,
      risks: insights?.risks?.length || 0,
    }
  )

  return activity.id
}

/**
 * Sync and analyze recent calls from HubSpot for a company
 */
export async function syncAndAnalyzeCallsForCompany(
  companyId: string,
  hubspotCompanyId: string,
  options: { daysBack?: number; analyze?: boolean } = {}
): Promise<{ synced: number; analyzed: number }> {
  const { daysBack = 30, analyze = true } = options

  // Get company details for context
  const company = await prisma.hubSpotCompany.findUnique({
    where: { id: companyId },
    select: { name: true, healthScore: true },
  })

  if (!company) {
    return { synced: 0, analyzed: 0 }
  }

  // Fetch engagements from HubSpot
  const engagements = await getHubSpotEngagements(hubspotCompanyId, {
    daysBack,
    types: ["CALL", "MEETING"],
  })

  console.log(
    `[Conversation Intelligence] Found ${engagements.length} engagements for ${company.name}`
  )

  let synced = 0
  let analyzed = 0

  for (const eng of engagements) {
    // Check if already processed
    const existing = await prisma.activityEvent.findFirst({
      where: {
        companyId,
        eventType: "call_recorded",
        metadata: { path: ["externalId"], equals: eng.id },
      },
    })

    if (existing) {
      continue
    }

    const transcript = eng.metadata.body || ""

    // Analyze if there's meaningful content
    let insights: CallInsights | undefined
    if (analyze && transcript.length > 50) {
      insights = await analyzeCallTranscript(transcript, {
        companyName: company.name,
        meetingType: eng.type,
        healthScore: company.healthScore || undefined,
      })
      analyzed++
    }

    // Store the record
    await storeCallRecord(
      {
        provider: "hubspot",
        externalId: eng.id,
        companyId,
        title: eng.metadata.title || `${eng.type} - ${new Date(eng.timestamp).toLocaleDateString()}`,
        date: new Date(eng.timestamp),
        duration: (eng.metadata.durationMilliseconds || 0) / 1000,
        participants: [],
        transcript,
        summary: insights?.summary,
        sentiment: insights?.sentiment,
        topics: insights?.topics,
        actionItems: insights?.actionItems,
        nextSteps: insights?.nextSteps,
      },
      insights
    )

    synced++
  }

  return { synced, analyzed }
}

/**
 * Manual call logging (for teams that don't use HubSpot for calls)
 */
export async function logManualCall(params: {
  companyId: string
  title: string
  date: Date
  duration: number
  participants: string[]
  notes: string
  contactEmail?: string
  contactName?: string
}): Promise<{ callId: string; insights: CallInsights }> {
  const company = await prisma.hubSpotCompany.findUnique({
    where: { id: params.companyId },
    select: { name: true, healthScore: true },
  })

  // Analyze notes as pseudo-transcript
  const insights = await analyzeCallTranscript(params.notes, {
    companyName: company?.name || "Unknown",
    contactName: params.contactName,
    healthScore: company?.healthScore || undefined,
  })

  const callId = await storeCallRecord(
    {
      provider: "manual",
      externalId: `manual-${Date.now()}`,
      companyId: params.companyId,
      contactEmail: params.contactEmail,
      contactName: params.contactName,
      title: params.title,
      date: params.date,
      duration: params.duration,
      participants: params.participants,
      transcript: params.notes,
      summary: insights.summary,
      sentiment: insights.sentiment,
      topics: insights.topics,
      actionItems: insights.actionItems,
      nextSteps: insights.nextSteps,
    },
    insights
  )

  return { callId, insights }
}

/**
 * Get call history for a company
 */
export async function getCallHistory(
  companyId: string,
  limit = 10
): Promise<
  Array<{
    id: string
    title: string
    date: Date
    duration: number
    sentiment: string
    summary: string
    actionItems: string[]
  }>
> {
  const activities = await prisma.activityEvent.findMany({
    where: {
      companyId,
      eventType: "call_recorded",
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
  })

  return activities.map((a) => {
    const meta = a.metadata as Record<string, unknown>
    return {
      id: a.id,
      title: a.title,
      date: a.occurredAt,
      duration: (meta?.duration as number) || 0,
      sentiment: (meta?.sentiment as string) || "neutral",
      summary: a.description || "",
      actionItems: (meta?.actionItems as string[]) || [],
    }
  })
}

/**
 * Batch analyze unprocessed calls (run periodically)
 */
export async function analyzeUnprocessedCalls(limit = 20): Promise<{
  processed: number
  errors: number
}> {
  // Find calls without sentiment analysis
  const unprocessed = await prisma.activityEvent.findMany({
    where: {
      eventType: "call_recorded",
      OR: [
        { metadata: { path: ["sentiment"], equals: Prisma.JsonNull } },
        { metadata: { path: ["analyzed"], equals: false } },
      ],
    },
    take: limit,
  })

  let processed = 0
  let errors = 0

  for (const call of unprocessed) {
    try {
      const meta = call.metadata as Record<string, unknown>
      const transcript = (meta?.transcript as string) || call.description

      if (!transcript || transcript.length < 50) {
        continue
      }

      // Fetch company info for context
      const company = await prisma.hubSpotCompany.findUnique({
        where: { id: call.companyId },
        select: { name: true, healthScore: true },
      })

      const insights = await analyzeCallTranscript(transcript, {
        companyName: company?.name || "Unknown",
        healthScore: company?.healthScore || undefined,
      })

      // Update the activity with insights
      await prisma.activityEvent.update({
        where: { id: call.id },
        data: {
          description: insights.summary,
          importance:
            insights.sentiment === "negative"
              ? "high"
              : insights.sentiment === "positive"
                ? "low"
                : "medium",
          metadata: {
            ...meta,
            analyzed: true,
            sentiment: insights.sentiment,
            sentimentScore: insights.sentimentScore,
            topics: insights.topics,
            risks: insights.risks,
            opportunities: insights.opportunities,
          },
        },
      })

      processed++
    } catch (error) {
      console.error(`[Conversation Intelligence] Error analyzing call ${call.id}:`, error)
      errors++
    }
  }

  return { processed, errors }
}
