import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface CohortMetrics {
  month: string
  totalCustomers: number
  activeCustomers: number
  churnedCustomers: number
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
        month: monthKey,
        totalCustomers: 0,
        activeCustomers: 0,
        churnedCustomers: 0,
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

      cohort.totalCustomers++
      if (isChurned) {
        cohort.churnedCustomers++
      } else {
        cohort.activeCustomers++
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
      if (cohort.totalCustomers > 0) {
        cohort.retentionRate = Math.round(
          (cohort.activeCustomers / cohort.totalCustomers) * 100
        )
        cohort.avgMrr = cohort.activeCustomers > 0
          ? Math.round(cohort.totalMrr / cohort.activeCustomers)
          : 0
      }
    }

    // Convert to sorted array
    const cohortArray = Array.from(cohorts.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    )

    // Calculate retention curve (cumulative retention over time)
    const retentionCurve: number[] = []
    if (cohortArray.length > 0) {
      const firstCohort = cohortArray[0]
      let remaining = firstCohort.totalCustomers

      for (let i = 0; i < cohortArray.length; i++) {
        if (remaining > 0) {
          const churned = cohortArray[i]?.churnedCustomers || 0
          remaining = Math.max(0, remaining - churned)
          retentionCurve.push(
            Math.round((remaining / firstCohort.totalCustomers) * 100)
          )
        }
      }
    }

    // Summary stats
    const summary = {
      totalCohorts: cohortArray.length,
      avgRetentionRate: cohortArray.length > 0
        ? Math.round(
            cohortArray.reduce((sum, c) => sum + c.retentionRate, 0) /
              cohortArray.length
          )
        : 0,
      bestCohort: cohortArray.reduce(
        (best, c) => (c.retentionRate > (best?.retentionRate || 0) ? c : best),
        cohortArray[0]
      ),
      worstCohort: cohortArray.reduce(
        (worst, c) =>
          c.totalCustomers > 0 &&
          c.retentionRate < (worst?.retentionRate || 100)
            ? c
            : worst,
        cohortArray[0]
      ),
      totalActiveCustomers: cohortArray.reduce(
        (sum, c) => sum + c.activeCustomers,
        0
      ),
      totalChurnedCustomers: cohortArray.reduce(
        (sum, c) => sum + c.churnedCustomers,
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
