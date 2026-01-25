import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/stakeholders/[companyId]
 * Get all stakeholders for a company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params

    // Get company to normalize ID
    const company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [{ hubspotId: companyId }, { id: companyId }],
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const stakeholders = await prisma.stakeholder.findMany({
      where: { companyId: company.hubspotId },
      orderBy: [{ role: "asc" }, { influence: "desc" }, { name: "asc" }],
    })

    // Calculate relationship health
    const champion = stakeholders.find((s) => s.role === "champion" && s.isActive)
    const decisionMaker = stakeholders.find((s) => s.role === "decision_maker" && s.isActive)
    const activeCount = stakeholders.filter((s) => s.isActive).length
    const negativeCount = stakeholders.filter(
      (s) => s.sentiment === "negative" && s.isActive
    ).length

    let relationshipHealth: "strong" | "moderate" | "weak" | "critical"
    if (!champion) {
      relationshipHealth = "critical"
    } else if (champion.sentiment === "negative" || negativeCount >= 2) {
      relationshipHealth = "weak"
    } else if (!decisionMaker || activeCount < 2) {
      relationshipHealth = "moderate"
    } else {
      relationshipHealth = "strong"
    }

    // Group by role
    const byRole = {
      champions: stakeholders.filter((s) => s.role === "champion"),
      decisionMakers: stakeholders.filter((s) => s.role === "decision_maker"),
      executiveSponsors: stakeholders.filter((s) => s.role === "executive_sponsor"),
      users: stakeholders.filter((s) => s.role === "user"),
      influencers: stakeholders.filter((s) => s.role === "influencer"),
      detractors: stakeholders.filter((s) => s.role === "detractor"),
    }

    // Alerts
    const alerts: string[] = []
    if (!champion) {
      alerts.push("No champion identified - single point of failure risk")
    }
    if (champion && !champion.isActive) {
      alerts.push("Champion has left the company")
    }
    if (champion && champion.sentiment === "negative") {
      alerts.push("Champion sentiment is negative")
    }
    if (activeCount === 1) {
      alerts.push("Single-threaded relationship - expand contacts")
    }
    const recentlyLeft = stakeholders.filter(
      (s) =>
        s.leftCompanyAt &&
        new Date(s.leftCompanyAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    )
    if (recentlyLeft.length > 0) {
      alerts.push(`${recentlyLeft.length} contact(s) left in last 30 days`)
    }

    return NextResponse.json({
      companyId: company.hubspotId,
      companyName: company.name,
      stakeholders,
      byRole,
      summary: {
        total: stakeholders.length,
        active: activeCount,
        hasChampion: !!champion,
        hasDecisionMaker: !!decisionMaker,
        relationshipHealth,
        sentimentBreakdown: {
          positive: stakeholders.filter((s) => s.sentiment === "positive" && s.isActive).length,
          neutral: stakeholders.filter((s) => s.sentiment === "neutral" && s.isActive).length,
          negative: negativeCount,
        },
      },
      alerts,
    })
  } catch (error) {
    console.error("Failed to get stakeholders:", error)
    return NextResponse.json({ error: "Failed to get stakeholders" }, { status: 500 })
  }
}

/**
 * POST /api/stakeholders/[companyId]
 * Add a new stakeholder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const body = await request.json()
    const { name, email, phone, title, role, sentiment, influence, engagement, notes } = body

    if (!name || !role) {
      return NextResponse.json({ error: "name and role are required" }, { status: 400 })
    }

    // Validate role
    const validRoles = [
      "champion",
      "decision_maker",
      "user",
      "influencer",
      "detractor",
      "executive_sponsor",
    ]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Get company
    const company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [{ hubspotId: companyId }, { id: companyId }],
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const stakeholder = await prisma.stakeholder.create({
      data: {
        companyId: company.hubspotId,
        name,
        email,
        phone,
        title,
        role,
        sentiment: sentiment || "neutral",
        influence: influence || "medium",
        engagement: engagement || "active",
        notes,
      },
    })

    // Log activity
    await prisma.activityEvent.create({
      data: {
        companyId: company.hubspotId,
        source: "platform",
        eventType: "stakeholder_added",
        title: `Added ${role}: ${name}`,
        description: title ? `${title}` : null,
        importance: role === "champion" ? "high" : "normal",
        occurredAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, stakeholder })
  } catch (error) {
    console.error("Failed to add stakeholder:", error)
    return NextResponse.json({ error: "Failed to add stakeholder" }, { status: 500 })
  }
}
