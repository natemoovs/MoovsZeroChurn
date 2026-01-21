import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"
import { CHURN_REASONS } from "../route"

/**
 * Churn Pattern Analysis
 *
 * Uses AI to analyze churn records and identify patterns.
 *
 * GET /api/churn/patterns - Get stored patterns
 * POST /api/churn/patterns - Generate new pattern analysis
 */

/**
 * GET /api/churn/patterns
 * Retrieve stored patterns
 */
export async function GET() {
  try {
    const patterns = await prisma.churnPattern.findMany({
      orderBy: { generatedAt: "desc" },
      take: 20,
    })

    return NextResponse.json({
      patterns,
      total: patterns.length,
    })
  } catch (error) {
    console.error("Pattern fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch patterns" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/churn/patterns
 * Generate new pattern analysis from churn data
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const daysBack = body.daysBack || 90

    // Fetch churn records for analysis
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const records = await prisma.churnRecord.findMany({
      where: {
        churnDate: { gte: startDate },
      },
      orderBy: { churnDate: "desc" },
    })

    if (records.length < 3) {
      return NextResponse.json({
        patterns: [],
        message: "Not enough churn data for pattern analysis (need at least 3 records)",
        recordCount: records.length,
      })
    }

    // Build summary for Claude
    const reasonCounts: Record<string, number> = {}
    const featureGapCounts: Record<string, number> = {}
    const competitorCounts: Record<string, number> = {}
    let totalMrrLost = 0
    const healthAtChurn: Record<string, number> = {}

    for (const record of records) {
      // Reason counts
      reasonCounts[record.primaryReason] = (reasonCounts[record.primaryReason] || 0) + 1

      // MRR
      totalMrrLost += record.lostMrr || 0

      // Feature gaps
      for (const gap of record.featureGaps) {
        featureGapCounts[gap] = (featureGapCounts[gap] || 0) + 1
      }

      // Competitors
      if (record.competitorName) {
        competitorCounts[record.competitorName] = (competitorCounts[record.competitorName] || 0) + 1
      }

      // Health at churn
      if (record.healthScoreAtChurn) {
        healthAtChurn[record.healthScoreAtChurn] = (healthAtChurn[record.healthScoreAtChurn] || 0) + 1
      }
    }

    // Build context for Claude
    const context = `
## Churn Data Summary (Last ${daysBack} Days)

**Total Churned Accounts:** ${records.length}
**Total MRR Lost:** $${totalMrrLost.toLocaleString()}
**Average MRR per Churn:** $${(totalMrrLost / records.length).toFixed(0)}

### Churn Reasons Breakdown:
${Object.entries(reasonCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([reason, count]) => `- ${CHURN_REASONS[reason as keyof typeof CHURN_REASONS] || reason}: ${count} (${((count / records.length) * 100).toFixed(0)}%)`)
  .join("\n")}

### Health Score at Churn:
${Object.entries(healthAtChurn)
  .map(([score, count]) => `- ${score}: ${count}`)
  .join("\n") || "No health data captured"}

### Top Feature Gaps Mentioned:
${Object.entries(featureGapCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([feature, count]) => `- ${feature}: ${count}`)
  .join("\n") || "No feature gaps captured"}

### Competitors Mentioned:
${Object.entries(competitorCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([comp, count]) => `- ${comp}: ${count}`)
  .join("\n") || "No competitors captured"}

### Sample Churn Details:
${records.slice(0, 5).map(r => `
- **${r.companyName}** (${r.churnDate.toISOString().split("T")[0]}): ${CHURN_REASONS[r.primaryReason as keyof typeof CHURN_REASONS] || r.primaryReason}
  ${r.reasonDetails ? `"${r.reasonDetails.substring(0, 100)}..."` : ""}
  Lost MRR: $${r.lostMrr || 0}, Trips: ${r.totalTrips || "N/A"}, Days inactive: ${r.daysSinceLastLogin || "N/A"}
`).join("")}
`

    // Generate patterns with Claude
    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a customer success analyst identifying churn patterns.

Analyze this churn data and identify 3-5 actionable patterns. For each pattern, provide:
1. A clear title
2. Description of the pattern
3. Affected segment (if any)
4. Specific, actionable recommendations to prevent similar churns

Focus on patterns that are:
- Actionable (we can do something about them)
- Significant (affect multiple customers or high MRR)
- Specific (not just "improve product")

${context}

Output your analysis as a JSON array of patterns with this structure:
[
  {
    "patternType": "reason_trend|segment_risk|feature_gap|competitive|seasonal",
    "title": "Short descriptive title",
    "description": "Detailed description of the pattern",
    "affectedSegment": "Segment affected or null",
    "recommendations": ["Action 1", "Action 2", "Action 3"],
    "confidence": 0.0-1.0
  }
]

Only output the JSON array, no other text.`,
        },
      ],
    })

    const responseText = message.content[0].type === "text"
      ? message.content[0].text
      : ""

    // Parse Claude's response
    let patterns: Array<{
      patternType: string
      title: string
      description: string
      affectedSegment?: string
      recommendations: string[]
      confidence?: number
    }> = []

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        patterns = JSON.parse(jsonMatch[0])
      }
    } catch {
      console.error("Failed to parse Claude's pattern response")
    }

    // Store patterns in database
    const storedPatterns = []
    for (const pattern of patterns) {
      const stored = await prisma.churnPattern.create({
        data: {
          patternType: pattern.patternType,
          title: pattern.title,
          description: pattern.description,
          affectedSegment: pattern.affectedSegment || null,
          frequency: records.length,
          mrrImpact: totalMrrLost,
          recommendations: pattern.recommendations,
          confidence: pattern.confidence || 0.7,
          dataRange: `Last ${daysBack} days`,
        },
      })
      storedPatterns.push(stored)
    }

    return NextResponse.json({
      success: true,
      patterns: storedPatterns,
      summary: {
        recordsAnalyzed: records.length,
        totalMrrLost,
        dataRange: `Last ${daysBack} days`,
        reasonBreakdown: reasonCounts,
      },
    })
  } catch (error) {
    console.error("Pattern generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate patterns" },
      { status: 500 }
    )
  }
}
