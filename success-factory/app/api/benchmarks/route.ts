import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface SegmentBenchmark {
  segment: string
  accountCount: number
  metrics: {
    avgMrr: number
    avgTripsPerMonth: number
    avgDaysSinceLogin: number
    healthDistribution: { green: number; yellow: number; red: number }
    avgTenureMonths: number
    npsAvg: number | null
  }
}

interface CompanyBenchmark {
  companyId: string
  companyName: string
  segment: string
  metrics: {
    mrr: number
    tripsPerMonth: number
    daysSinceLogin: number
    healthScore: string
    tenureMonths: number
    npsScore: number | null
  }
  comparison: {
    mrrVsSegment: number // percentage difference
    usageVsSegment: number
    activityVsSegment: number
    tenureVsSegment: number
    npsVsSegment: number | null
  }
  percentiles: {
    mrr: number
    usage: number
    activity: number
    tenure: number
  }
  overallScore: number // 0-100, how well they compare to segment
}

/**
 * GET /api/benchmarks?companyId=xxx&segment=xxx
 * Get benchmarks for segment or specific company
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get("companyId")
  const segmentFilter = searchParams.get("segment")

  try {
    // Get all companies with MRR
    const companies = await prisma.hubSpotCompany.findMany({
      where: { mrr: { gt: 0 } },
    })

    // Get NPS scores
    const npsSurveys = await prisma.nPSSurvey.findMany({
      where: { score: { not: null } },
      orderBy: { respondedAt: "desc" },
    })

    const npsMap = new Map<string, number>()
    for (const survey of npsSurveys) {
      if (!npsMap.has(survey.companyId) && survey.score !== null) {
        npsMap.set(survey.companyId, survey.score)
      }
    }

    // Calculate segment benchmarks
    const segmentData = new Map<string, {
      companies: typeof companies
      mrrValues: number[]
      usageValues: number[]
      activityValues: number[]
      tenureValues: number[]
      npsValues: number[]
      healthCounts: { green: number; yellow: number; red: number }
    }>()

    for (const company of companies) {
      const segment = company.customerSegment || "unknown"

      if (!segmentData.has(segment)) {
        segmentData.set(segment, {
          companies: [],
          mrrValues: [],
          usageValues: [],
          activityValues: [],
          tenureValues: [],
          npsValues: [],
          healthCounts: { green: 0, yellow: 0, red: 0 },
        })
      }

      const data = segmentData.get(segment)!
      data.companies.push(company)

      const tenure = Math.max(1, Math.floor(
        (Date.now() - new Date(company.hubspotCreatedAt || company.createdAt).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
      ))
      const tripsPerMonth = (company.totalTrips || 0) / tenure

      data.mrrValues.push(company.mrr || 0)
      data.usageValues.push(tripsPerMonth)
      data.activityValues.push(company.daysSinceLastLogin ?? 30)
      data.tenureValues.push(tenure)

      const nps = npsMap.get(company.hubspotId)
      if (nps !== undefined) {
        data.npsValues.push(nps)
      }

      if (company.healthScore === "green") data.healthCounts.green++
      else if (company.healthScore === "yellow") data.healthCounts.yellow++
      else if (company.healthScore === "red") data.healthCounts.red++
    }

    // Calculate benchmarks for each segment
    const segmentBenchmarks: SegmentBenchmark[] = []

    for (const [segment, data] of segmentData) {
      if (segmentFilter && segment !== segmentFilter) continue

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

      segmentBenchmarks.push({
        segment,
        accountCount: data.companies.length,
        metrics: {
          avgMrr: Math.round(avg(data.mrrValues)),
          avgTripsPerMonth: Math.round(avg(data.usageValues) * 10) / 10,
          avgDaysSinceLogin: Math.round(avg(data.activityValues)),
          healthDistribution: data.healthCounts,
          avgTenureMonths: Math.round(avg(data.tenureValues)),
          npsAvg: data.npsValues.length > 0 ? Math.round(avg(data.npsValues) * 10) / 10 : null,
        },
      })
    }

    // If requesting specific company, calculate their comparison
    if (companyId) {
      const company = companies.find(c => c.hubspotId === companyId)
      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 })
      }

      const segment = company.customerSegment || "unknown"
      const segmentInfo = segmentData.get(segment)

      if (!segmentInfo) {
        return NextResponse.json({ error: "Segment data not found" }, { status: 404 })
      }

      const tenure = Math.max(1, Math.floor(
        (Date.now() - new Date(company.hubspotCreatedAt || company.createdAt).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
      ))
      const tripsPerMonth = (company.totalTrips || 0) / tenure
      const daysSinceLogin = company.daysSinceLastLogin ?? 30
      const npsScore = npsMap.get(company.hubspotId) ?? null

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      const percentile = (value: number, arr: number[], inverse: boolean = false) => {
        const sorted = [...arr].sort((a, b) => a - b)
        const index = sorted.findIndex(v => v >= value)
        const pct = index === -1 ? 100 : Math.round((index / sorted.length) * 100)
        return inverse ? 100 - pct : pct
      }

      const avgMrr = avg(segmentInfo.mrrValues)
      const avgUsage = avg(segmentInfo.usageValues)
      const avgActivity = avg(segmentInfo.activityValues)
      const avgTenure = avg(segmentInfo.tenureValues)
      const avgNps = segmentInfo.npsValues.length > 0 ? avg(segmentInfo.npsValues) : null

      // Calculate percentage differences
      const pctDiff = (val: number, benchmark: number) =>
        benchmark > 0 ? Math.round(((val - benchmark) / benchmark) * 100) : 0

      const comparison = {
        mrrVsSegment: pctDiff(company.mrr || 0, avgMrr),
        usageVsSegment: pctDiff(tripsPerMonth, avgUsage),
        activityVsSegment: pctDiff(avgActivity, daysSinceLogin), // Inverse - lower is better
        tenureVsSegment: pctDiff(tenure, avgTenure),
        npsVsSegment: npsScore !== null && avgNps !== null
          ? Math.round(npsScore - avgNps)
          : null,
      }

      const percentiles = {
        mrr: percentile(company.mrr || 0, segmentInfo.mrrValues),
        usage: percentile(tripsPerMonth, segmentInfo.usageValues),
        activity: percentile(daysSinceLogin, segmentInfo.activityValues, true), // Inverse
        tenure: percentile(tenure, segmentInfo.tenureValues),
      }

      // Overall score: weighted average of percentiles
      const overallScore = Math.round(
        percentiles.mrr * 0.25 +
        percentiles.usage * 0.30 +
        percentiles.activity * 0.25 +
        percentiles.tenure * 0.20
      )

      const companyBenchmark: CompanyBenchmark = {
        companyId: company.hubspotId,
        companyName: company.name,
        segment,
        metrics: {
          mrr: company.mrr || 0,
          tripsPerMonth: Math.round(tripsPerMonth * 10) / 10,
          daysSinceLogin,
          healthScore: company.healthScore || "unknown",
          tenureMonths: tenure,
          npsScore,
        },
        comparison,
        percentiles,
        overallScore,
      }

      return NextResponse.json({
        company: companyBenchmark,
        segmentBenchmark: segmentBenchmarks.find(s => s.segment === segment),
        allSegments: segmentBenchmarks,
      })
    }

    // Return all segment benchmarks
    return NextResponse.json({
      segments: segmentBenchmarks.sort((a, b) => b.accountCount - a.accountCount),
      totals: {
        totalAccounts: companies.length,
        totalMrr: companies.reduce((sum, c) => sum + (c.mrr || 0), 0),
        avgMrr: Math.round(companies.reduce((sum, c) => sum + (c.mrr || 0), 0) / companies.length),
      },
    })
  } catch (error) {
    console.error("Failed to calculate benchmarks:", error)
    return NextResponse.json(
      { error: "Failed to calculate benchmarks" },
      { status: 500 }
    )
  }
}
