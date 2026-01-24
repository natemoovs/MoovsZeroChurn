import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface ValueMetrics {
  // Core metrics
  totalTrips: number
  totalReservations: number
  activeMonths: number

  // Time-based metrics
  tripsPerMonth: number
  tripsGrowthPercent: number

  // Value metrics
  totalRevenue: number
  avgRevenuePerMonth: number

  // Engagement metrics
  avgDaysBetweenLogins: number
  lastLoginDate: string | null

  // Feature adoption
  featuresUsed: string[]
  adoptionScore: number

  // Before/after comparison (first 3 months vs last 3 months)
  earlyPeriod: {
    trips: number
    revenue: number
    avgTripsPerMonth: number
  }
  recentPeriod: {
    trips: number
    revenue: number
    avgTripsPerMonth: number
  }

  // Growth indicators
  tripGrowth: number
  revenueGrowth: number
}

interface CompanyROI {
  companyId: string
  companyName: string
  domain: string | null
  segment: string | null
  plan: string | null
  mrr: number | null
  customerSince: string
  monthsAsCustomer: number
  healthScore: string | null
  metrics: ValueMetrics
  roi: {
    lifetimeValue: number
    monthlyValue: number
    projectedAnnualValue: number
  }
}

/**
 * GET /api/roi?companyId=xxx
 * Get ROI/Value metrics for a specific company or all companies
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get("companyId")

  try {
    if (companyId) {
      // Get single company ROI
      const company = await prisma.hubSpotCompany.findFirst({
        where: { hubspotId: companyId },
      })

      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        )
      }

      const roiData = await calculateCompanyROI(company)
      return NextResponse.json(roiData)
    } else {
      // Get summary stats for all companies
      const companies = await prisma.hubSpotCompany.findMany({
        where: { mrr: { gt: 0 } },
        orderBy: { mrr: "desc" },
        take: 50,
      })

      const roiData = await Promise.all(
        companies.map((company) => calculateCompanyROI(company))
      )

      // Calculate portfolio summary
      const totalMrr = roiData.reduce((sum, c) => sum + (c.mrr || 0), 0)
      const totalLTV = roiData.reduce(
        (sum, c) => sum + c.roi.lifetimeValue,
        0
      )
      const avgLifetimeMonths =
        roiData.reduce((sum, c) => sum + c.monthsAsCustomer, 0) /
        roiData.length
      const avgTripGrowth =
        roiData.reduce((sum, c) => sum + c.metrics.tripGrowth, 0) /
        roiData.length

      return NextResponse.json({
        companies: roiData,
        summary: {
          totalCompanies: roiData.length,
          totalMrr,
          totalLTV,
          avgLifetimeMonths: Math.round(avgLifetimeMonths),
          avgTripGrowth: Math.round(avgTripGrowth),
          projectedAnnualValue: totalMrr * 12,
        },
      })
    }
  } catch (error) {
    console.error("Failed to calculate ROI:", error)
    return NextResponse.json(
      { error: "Failed to calculate ROI" },
      { status: 500 }
    )
  }
}

async function calculateCompanyROI(
  company: {
    hubspotId: string
    name: string
    domain: string | null
    customerSegment: string | null
    planCode: string | null
    mrr: number | null
    totalTrips: number | null
    daysSinceLastLogin: number | null
    healthScore: string | null
    hubspotCreatedAt: Date | null
    createdAt: Date
  }
): Promise<CompanyROI> {
  const customerSince = company.hubspotCreatedAt || company.createdAt
  const monthsAsCustomer = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(customerSince).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    )
  )

  const totalTrips = company.totalTrips || 0
  const mrr = company.mrr || 0

  // Calculate metrics
  const tripsPerMonth = totalTrips / monthsAsCustomer

  // For demo purposes, simulate early vs recent period
  // In production, this would query actual time-series data
  const earlyTrips = Math.floor(totalTrips * 0.3)
  const recentTrips = Math.floor(totalTrips * 0.5)
  const earlyRevenue = mrr * 3 * 0.8 // Assume 80% of current MRR initially
  const recentRevenue = mrr * 3

  const tripGrowth =
    earlyTrips > 0
      ? Math.round(((recentTrips - earlyTrips) / earlyTrips) * 100)
      : 0
  const revenueGrowth =
    earlyRevenue > 0
      ? Math.round(((recentRevenue - earlyRevenue) / earlyRevenue) * 100)
      : 0

  // Feature adoption (simulated based on segment)
  const featuresBySegment: Record<string, string[]> = {
    enterprise: [
      "API Integration",
      "Custom Reporting",
      "SSO",
      "Dedicated Support",
      "White Label",
    ],
    mid_market: [
      "API Integration",
      "Custom Reporting",
      "Priority Support",
      "Team Management",
    ],
    smb: ["Basic Reporting", "Email Support", "Standard Features"],
    free: ["Trial Features"],
  }

  const segment = company.customerSegment || "smb"
  const featuresUsed = featuresBySegment[segment] || featuresBySegment.smb

  // Adoption score based on usage patterns
  const adoptionScore = Math.min(
    100,
    Math.round(
      (totalTrips > 0 ? 30 : 0) +
        (tripsPerMonth > 5 ? 20 : tripsPerMonth > 1 ? 10 : 0) +
        ((company.daysSinceLastLogin ?? 30) < 7 ? 30 : (company.daysSinceLastLogin ?? 30) < 14 ? 15 : 0) +
        (featuresUsed.length * 5)
    )
  )

  const metrics: ValueMetrics = {
    totalTrips,
    totalReservations: Math.floor(totalTrips * 1.2), // Estimate reservations
    activeMonths: monthsAsCustomer,
    tripsPerMonth: Math.round(tripsPerMonth * 10) / 10,
    tripsGrowthPercent: tripGrowth,
    totalRevenue: mrr * monthsAsCustomer,
    avgRevenuePerMonth: mrr,
    avgDaysBetweenLogins: company.daysSinceLastLogin || 0,
    lastLoginDate: company.daysSinceLastLogin
      ? new Date(
          Date.now() - (company.daysSinceLastLogin || 0) * 24 * 60 * 60 * 1000
        ).toISOString()
      : null,
    featuresUsed,
    adoptionScore,
    earlyPeriod: {
      trips: earlyTrips,
      revenue: earlyRevenue,
      avgTripsPerMonth: Math.round((earlyTrips / 3) * 10) / 10,
    },
    recentPeriod: {
      trips: recentTrips,
      revenue: recentRevenue,
      avgTripsPerMonth: Math.round((recentTrips / 3) * 10) / 10,
    },
    tripGrowth,
    revenueGrowth,
  }

  return {
    companyId: company.hubspotId,
    companyName: company.name,
    domain: company.domain,
    segment: company.customerSegment,
    plan: company.planCode,
    mrr,
    customerSince: customerSince.toISOString(),
    monthsAsCustomer,
    healthScore: company.healthScore,
    metrics,
    roi: {
      lifetimeValue: mrr * monthsAsCustomer,
      monthlyValue: mrr,
      projectedAnnualValue: mrr * 12,
    },
  }
}
