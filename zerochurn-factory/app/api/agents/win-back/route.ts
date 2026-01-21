import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"

/**
 * Win-Back Agent
 *
 * Autonomous agent that runs weekly to:
 * 1. Find churned accounts at key milestones (30, 60, 90 days)
 * 2. Generate personalized win-back outreach
 * 3. Create tasks for CSMs to re-engage
 *
 * The agent uses churn records to track:
 * - Why they left (reason)
 * - What they valued (for personalization)
 * - When they might be ready to return
 *
 * Trigger: Weekly cron (Thursdays 10 AM UTC)
 * POST /api/agents/win-back
 */

// Milestones for outreach (days since churn)
const MILESTONES = [30, 60, 90]
const MILESTONE_WINDOW = 3 // +/- 3 days

interface WinBackCandidate {
  churnRecord: {
    id: string
    companyId: string
    companyName: string
    primaryReason: string
    reasonDetails: string | null
    lostMrr: number | null
    churnDate: Date
    winBackAttempts: number
    winBackStatus: string | null
    featureGaps: string[]
    competitorName: string | null
  }
  daysSinceChurn: number
  milestone: number
  outreachType: "initial" | "follow_up" | "final"
}

export async function POST(request: NextRequest) {
  // Verify cron auth
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    request.headers.get("x-vercel-cron") === "1" ||
    process.env.NODE_ENV === "development"

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[Win-Back Agent] Starting win-back candidate scan...")

  try {
    // Find churn records at milestone intervals
    const candidates = await findWinBackCandidates()

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No win-back candidates found at milestone intervals",
        tasksCreated: 0,
      })
    }

    console.log(`[Win-Back Agent] Found ${candidates.length} win-back candidates`)

    // Initialize Anthropic if available
    const anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null

    const tasksCreated: string[] = []
    const churnRecordsUpdated: string[] = []

    for (const candidate of candidates) {
      try {
        // Check for existing recent win-back task
        const existingTask = await prisma.task.findFirst({
          where: {
            companyId: candidate.churnRecord.companyId,
            title: { contains: "Win-Back" },
            createdAt: {
              gte: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // Within 25 days
            },
          },
        })

        if (existingTask) {
          console.log(`[Win-Back Agent] Skipping ${candidate.churnRecord.companyName} - has recent task`)
          continue
        }

        // Skip if already marked as "not_interested" or "won_back"
        if (
          candidate.churnRecord.winBackStatus === "not_interested" ||
          candidate.churnRecord.winBackStatus === "won_back"
        ) {
          continue
        }

        // Generate personalized outreach
        let outreachContent = ""
        if (anthropic) {
          outreachContent = await generateWinBackOutreach(anthropic, candidate)
        }

        // Create task
        const task = await prisma.task.create({
          data: {
            companyId: candidate.churnRecord.companyId,
            companyName: candidate.churnRecord.companyName,
            title: getTaskTitle(candidate),
            description: buildTaskDescription(candidate, outreachContent),
            priority: getPriority(candidate),
            status: "pending",
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            metadata: {
              source: "win-back-agent",
              churnRecordId: candidate.churnRecord.id,
              milestone: candidate.milestone,
              daysSinceChurn: candidate.daysSinceChurn,
              outreachType: candidate.outreachType,
              lostMrr: candidate.churnRecord.lostMrr,
              churnReason: candidate.churnRecord.primaryReason,
            },
          },
        })

        tasksCreated.push(task.id)

        // Update churn record with attempt count
        await prisma.churnRecord.update({
          where: { id: candidate.churnRecord.id },
          data: {
            winBackAttempts: candidate.churnRecord.winBackAttempts + 1,
            winBackStatus: "in_progress",
          },
        })
        churnRecordsUpdated.push(candidate.churnRecord.id)

        console.log(`[Win-Back Agent] Created task for ${candidate.churnRecord.companyName} (${candidate.milestone}d)`)
      } catch (err) {
        console.error(`[Win-Back Agent] Error processing ${candidate.churnRecord.companyName}:`, err)
      }
    }

    // Calculate potential MRR recovery
    const potentialMrr = candidates
      .filter(c => c.churnRecord.lostMrr)
      .reduce((sum, c) => sum + (c.churnRecord.lostMrr || 0), 0)

    console.log(`[Win-Back Agent] Complete:
    - Candidates found: ${candidates.length}
    - Tasks created: ${tasksCreated.length}
    - Potential MRR: $${potentialMrr.toLocaleString()}`)

    return NextResponse.json({
      success: true,
      summary: {
        candidatesFound: candidates.length,
        tasksCreated: tasksCreated.length,
        potentialMrrRecovery: potentialMrr,
        byMilestone: {
          day30: candidates.filter(c => c.milestone === 30).length,
          day60: candidates.filter(c => c.milestone === 60).length,
          day90: candidates.filter(c => c.milestone === 90).length,
        },
      },
      candidates: candidates.slice(0, 15).map(c => ({
        companyName: c.churnRecord.companyName,
        daysSinceChurn: c.daysSinceChurn,
        milestone: c.milestone,
        outreachType: c.outreachType,
        lostMrr: c.churnRecord.lostMrr,
        churnReason: c.churnRecord.primaryReason,
        previousAttempts: c.churnRecord.winBackAttempts,
      })),
    })
  } catch (error) {
    console.error("[Win-Back Agent] Error:", error)
    return NextResponse.json(
      { error: "Win-back agent failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}

// GET endpoint for status
export async function GET() {
  try {
    // Get win-back stats
    const allChurnRecords = await prisma.churnRecord.count()
    const inProgress = await prisma.churnRecord.count({
      where: { winBackStatus: "in_progress" },
    })
    const wonBack = await prisma.churnRecord.count({
      where: { winBackStatus: "won_back" },
    })
    const notInterested = await prisma.churnRecord.count({
      where: { winBackStatus: "not_interested" },
    })

    // Get recent tasks
    const recentTasks = await prisma.task.findMany({
      where: {
        title: { contains: "Win-Back" },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    // Calculate MRR won back
    const wonBackRecords = await prisma.churnRecord.findMany({
      where: { winBackStatus: "won_back" },
      select: { lostMrr: true },
    })
    const mrrRecovered = wonBackRecords.reduce((sum, r) => sum + (r.lostMrr || 0), 0)

    return NextResponse.json({
      stats: {
        totalChurnRecords: allChurnRecords,
        inProgress,
        wonBack,
        notInterested,
        winBackRate: allChurnRecords > 0 ? Math.round((wonBack / allChurnRecords) * 100) : 0,
        mrrRecovered,
      },
      recentTasks: recentTasks.map(t => ({
        id: t.id,
        companyName: t.companyName,
        status: t.status,
        createdAt: t.createdAt,
        milestone: (t.metadata as Record<string, unknown>)?.milestone,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}

async function findWinBackCandidates(): Promise<WinBackCandidate[]> {
  const now = new Date()
  const candidates: WinBackCandidate[] = []

  // Get all churn records
  const churnRecords = await prisma.churnRecord.findMany({
    where: {
      winBackStatus: {
        notIn: ["won_back", "not_interested"],
      },
    },
    orderBy: { lostMrr: "desc" },
  })

  for (const record of churnRecords) {
    const daysSinceChurn = Math.floor(
      (now.getTime() - record.churnDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Check if at a milestone
    for (const milestone of MILESTONES) {
      const lowerBound = milestone - MILESTONE_WINDOW
      const upperBound = milestone + MILESTONE_WINDOW

      if (daysSinceChurn >= lowerBound && daysSinceChurn <= upperBound) {
        // Determine outreach type
        let outreachType: "initial" | "follow_up" | "final" = "initial"
        if (milestone === 60) outreachType = "follow_up"
        if (milestone === 90) outreachType = "final"

        candidates.push({
          churnRecord: record,
          daysSinceChurn,
          milestone,
          outreachType,
        })
        break // Only match one milestone
      }
    }
  }

  return candidates
}

function getTaskTitle(candidate: WinBackCandidate): string {
  const emoji = candidate.outreachType === "final" ? "🔔" : candidate.outreachType === "follow_up" ? "📞" : "👋"
  const label = candidate.outreachType === "final"
    ? "Final Win-Back"
    : candidate.outreachType === "follow_up"
    ? "Win-Back Follow-Up"
    : "Win-Back Outreach"

  return `${emoji} ${label}: ${candidate.churnRecord.companyName} (${candidate.milestone}d)`
}

function getPriority(candidate: WinBackCandidate): string {
  // Higher MRR = higher priority
  if (candidate.churnRecord.lostMrr && candidate.churnRecord.lostMrr >= 5000) {
    return "high"
  }
  // Final outreach = higher priority
  if (candidate.outreachType === "final") {
    return "medium"
  }
  return "low"
}

function buildTaskDescription(candidate: WinBackCandidate, outreachContent: string): string {
  const lines: string[] = []

  lines.push(`## Win-Back Opportunity`)
  lines.push(`- **Company:** ${candidate.churnRecord.companyName}`)
  lines.push(`- **Days Since Churn:** ${candidate.daysSinceChurn}`)
  lines.push(`- **Milestone:** Day ${candidate.milestone}`)
  lines.push(`- **Outreach Type:** ${candidate.outreachType.replace("_", " ")}`)
  lines.push(`- **Previous Attempts:** ${candidate.churnRecord.winBackAttempts}`)

  if (candidate.churnRecord.lostMrr) {
    lines.push(`- **Lost MRR:** $${candidate.churnRecord.lostMrr.toLocaleString()}`)
  }

  lines.push("")
  lines.push(`## Churn Context`)
  lines.push(`- **Primary Reason:** ${formatChurnReason(candidate.churnRecord.primaryReason)}`)

  if (candidate.churnRecord.reasonDetails) {
    lines.push(`- **Details:** ${candidate.churnRecord.reasonDetails}`)
  }

  if (candidate.churnRecord.competitorName) {
    lines.push(`- **Switched To:** ${candidate.churnRecord.competitorName}`)
  }

  if (candidate.churnRecord.featureGaps.length > 0) {
    lines.push(`- **Feature Gaps:** ${candidate.churnRecord.featureGaps.join(", ")}`)
  }

  lines.push("")
  lines.push(`## Outreach Strategy`)

  switch (candidate.outreachType) {
    case "initial":
      lines.push("This is the first win-back touchpoint (30 days post-churn).")
      lines.push("Goal: Check in, understand their current situation, remind them of value.")
      break
    case "follow_up":
      lines.push("This is a follow-up touchpoint (60 days post-churn).")
      lines.push("Goal: Share relevant updates, address original concerns if possible.")
      break
    case "final":
      lines.push("This is the final win-back attempt (90 days post-churn).")
      lines.push("Goal: Make a compelling offer, understand barriers to return.")
      break
  }

  if (outreachContent) {
    lines.push("")
    lines.push(`## Suggested Outreach`)
    lines.push(outreachContent)
  }

  lines.push("")
  lines.push(`## After Contact`)
  lines.push(`Update the churn record status:`)
  lines.push(`- "won_back" - They're returning!`)
  lines.push(`- "in_progress" - Ongoing conversation`)
  lines.push(`- "not_interested" - They declined`)

  return lines.join("\n")
}

function formatChurnReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    price: "Price/Budget",
    product_fit: "Product Fit",
    support: "Support Issues",
    competitor: "Switched to Competitor",
    business_closed: "Business Closed",
    no_budget: "Budget Cuts",
    internal_change: "Internal Change",
    feature_missing: "Missing Features",
    onboarding_failed: "Onboarding Issues",
    champion_left: "Champion Left",
    other: "Other",
  }
  return reasonMap[reason] || reason
}

async function generateWinBackOutreach(
  anthropic: Anthropic,
  candidate: WinBackCandidate
): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `Write a win-back outreach message for this churned customer:

Company: ${candidate.churnRecord.companyName}
Days Since Churn: ${candidate.daysSinceChurn}
Churn Reason: ${formatChurnReason(candidate.churnRecord.primaryReason)}
${candidate.churnRecord.reasonDetails ? `Details: ${candidate.churnRecord.reasonDetails}` : ""}
${candidate.churnRecord.competitorName ? `Switched To: ${candidate.churnRecord.competitorName}` : ""}
${candidate.churnRecord.featureGaps.length > 0 ? `Feature Gaps: ${candidate.churnRecord.featureGaps.join(", ")}` : ""}
Lost MRR: ${candidate.churnRecord.lostMrr ? `$${candidate.churnRecord.lostMrr}` : "Unknown"}
Outreach Type: ${candidate.outreachType === "initial" ? "First contact (30 days)" : candidate.outreachType === "follow_up" ? "Follow-up (60 days)" : "Final attempt (90 days)"}

Write a short, personalized email that:
1. Acknowledges time has passed without being pushy
2. References their specific situation/reason for leaving
3. Provides a compelling reason to reconnect (without offering discounts unless it was price-related)
4. Has a clear, low-commitment call to action

Keep it to 4-5 sentences. Be warm and human, not corporate.`,
        },
      ],
    })

    return message.content[0].type === "text" ? message.content[0].text : ""
  } catch {
    return ""
  }
}
