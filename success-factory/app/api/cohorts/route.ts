import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth/api-middleware"

interface CohortMetrics {
  cohort: string
  totalCompanies: number
  activeCompanies: number
  churnedCompanies: number
  retentionRate: number
  totalMrr: number
  avgMrr: number
  avgTimeToValue: number | null
  segments: Record<string, number>
}

/**
 * GET /api/cohorts
 * Get cohort analysis data
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const months = parseInt(searchParams.get("months") || "12")
  const segment = searchParams.get("segment")

  try {
    // Get all companies
    const companies = await prisma.hubSpotCompany.findMany({
      select: {
        hubspotId: true,
        name: true,
        mrr: true,
        customerSegment: true,
        hubspotCreatedAt: true,
        createdAt: true,
        totalTrips: true,
        healthScore: true,
      },
    })

    // Get churn records
    const churnRecords = await prisma.churnRecord.findMany({
      select: {
        companyId: true,
        churnDate: true,
        lostMrr: true,
      },
    })

    const churnByCompany = new Map(
      churnRecords.map((c) => [c.companyId, c])
    )

    // Build cohort data
    const cohorts = new Map<string, CohortMetrics>()
    const now = new Date()

    // Initialize cohorts for last N months
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      cohorts.set(monthKey, {
        cohort: monthKey,
        totalCompanies: 0,
        activeCompanies: 0,
        churnedCompanies: 0,
        retentionRate: 0,
        totalMrr: 0,
        avgMrr: 0,
        avgTimeToValue: null,
        segments: {},
      })
    }

    // Categorize companies into cohorts
    for (const company of companies) {
      const signupDate = company.hubspotCreatedAt || company.createdAt
      if (!signupDate) continue

      const monthKey = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, "0")}`

      // Skip if not in our cohort range
      if (!cohorts.has(monthKey)) continue

      // Apply segment filter if provided
      if (segment && company.customerSegment !== segment) continue

      const cohort = cohorts.get(monthKey)!
      const churnRecord = churnByCompany.get(company.hubspotId)
      const isChurned = !!churnRecord

      cohort.totalCompanies++
      if (isChurned) {
        cohort.churnedCompanies++
      } else {
        cohort.activeCompanies++
        cohort.totalMrr += company.mrr || 0
      }

      // Track segments
      const seg = company.customerSegment || "unknown"
      cohort.segments[seg] = (cohort.segments[seg] || 0) + 1

      // Calculate time to value (first trip completion)
      if (company.totalTrips && company.totalTrips > 0) {
        // Approximate time to value as 14 days for accounts with trips
        // In a real scenario, you'd track this explicitly
        const ttv = 14 // placeholder
        if (cohort.avgTimeToValue === null) {
          cohort.avgTimeToValue = ttv
        } else {
          cohort.avgTimeToValue = (cohort.avgTimeToValue + ttv) / 2
        }
      }
    }

    // Calculate derived metrics
    for (const cohort of cohorts.values()) {
      if (cohort.totalCompanies > 0) {
        cohort.retentionRate = Math.round(
          (cohort.activeCompanies / cohort.totalCompanies) * 100
        )
        cohort.avgMrr = cohort.activeCompanies > 0
          ? Math.round(cohort.totalMrr / cohort.activeCompanies)
          : 0
      }
    }

    // Convert to sorted array
    const cohortArray = Array.from(cohorts.values()).sort((a, b) =>
      a.cohort.localeCompare(b.cohort)
    )

    // Calculate retention curve (cumulative retention over time)
    const retentionCurve: number[] = []
    if (cohortArray.length > 0) {
      const firstCohort = cohortArray[0]
      let remaining = firstCohort.totalCompanies

      for (let i = 0; i < cohortArray.length; i++) {
        if (remaining > 0) {
          const churned = cohortArray[i]?.churnedCompanies || 0
          remaining = Math.max(0, remaining - churned)
          retentionCurve.push(
            Math.round((remaining / firstCohort.totalCompanies) * 100)
          )
        }
      }
    }

    // Summary stats
    const totalCompanies = cohortArray.reduce(
      (sum, c) => sum + c.totalCompanies,
      0
    )
    const totalMrr = cohortArray.reduce((sum, c) => sum + c.totalMrr, 0)
    const summary = {
      totalCohorts: cohortArray.length,
      totalCompanies,
      overallRetention: cohortArray.length > 0
        ? Math.round(
            cohortArray.reduce((sum, c) => sum + c.retentionRate, 0) /
              cohortArray.length
          )
        : 0,
      avgMrrPerCohort: cohortArray.length > 0
        ? Math.round(totalMrr / cohortArray.length)
        : 0,
      bestCohort: cohortArray.reduce(
        (best, c) => (c.retentionRate > (best?.retentionRate || 0) ? c : best),
        cohortArray[0]
      ),
      worstCohort: cohortArray.reduce(
        (worst, c) =>
          c.totalCompanies > 0 &&
          c.retentionRate < (worst?.retentionRate || 100)
            ? c
            : worst,
        cohortArray[0]
      ),
      totalActiveCompanies: cohortArray.reduce(
        (sum, c) => sum + c.activeCompanies,
        0
      ),
      totalChurnedCompanies: cohortArray.reduce(
        (sum, c) => sum + c.churnedCompanies,
        0
      ),
    }

    return NextResponse.json({
      cohorts: cohortArray,
      retentionCurve,
      summary,
    })
  } catch (error) {
    console.error("Failed to fetch cohort data:", error)
    return NextResponse.json(
      { error: "Failed to fetch cohort data" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cohorts/sync
 * Sync cohort data for all companies
 */
export async function POST() {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const companies = await prisma.hubSpotCompany.findMany({
      select: {
        hubspotId: true,
        name: true,
        mrr: true,
        customerSegment: true,
        planCode: true,
        hubspotCreatedAt: true,
        createdAt: true,
        totalTrips: true,
      },
    })

    // Get churn records
    const churnRecords = await prisma.churnRecord.findMany({
      select: { companyId: true },
    })
    const churnedCompanyIds = new Set(churnRecords.map((c) => c.companyId))

    let created = 0
    let updated = 0

    for (const company of companies) {
      const signupDate = company.hubspotCreatedAt || company.createdAt
      if (!signupDate) continue

      const signupMonth = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, "0")}`
      const signupQuarter = `${signupDate.getFullYear()}-Q${Math.floor(signupDate.getMonth() / 3) + 1}`

      const isChurned = churnedCompanyIds.has(company.hubspotId)

      const cohortData = {
        signupMonth,
        signupQuarter,
        initialPlan: company.planCode,
        initialMrr: company.mrr,
        initialSegment: company.customerSegment,
        isActive: !isChurned,
        firstValueDate:
          company.totalTrips && company.totalTrips > 0
            ? new Date(signupDate.getTime() + 14 * 24 * 60 * 60 * 1000) // Approximate
            : null,
        timeToValue:
          company.totalTrips && company.totalTrips > 0 ? 14 : null,
      }

      const existing = await prisma.customerCohort.findUnique({
        where: { companyId: company.hubspotId },
      })

      if (existing) {
        await prisma.customerCohort.update({
          where: { companyId: company.hubspotId },
          data: cohortData,
        })
        updated++
      } else {
        await prisma.customerCohort.create({
          data: {
            companyId: company.hubspotId,
            ...cohortData,
          },
        })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: companies.length,
    })
  } catch (error) {
    console.error("Failed to sync cohort data:", error)
    return NextResponse.json(
      { error: "Failed to sync cohort data" },
      { status: 500 }
    )
  }
}
