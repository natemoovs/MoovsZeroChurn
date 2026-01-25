import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { metabase, notion, lago } from "@/lib/integrations"
import { requireAuth, isAuthError } from "@/lib/auth/api-middleware"

// Snowflake database ID in Metabase
const SNOWFLAKE_DB_ID = 2

/**
 * Sanitize an ID for safe use in SQL queries.
 * Only allows alphanumeric characters, hyphens, and underscores.
 * Returns null if the ID contains unsafe characters.
 */
function sanitizeIdForSql(id: string | null | undefined): string | null {
  if (!id) return null
  // Only allow alphanumeric, hyphens, underscores, and periods
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(id)) {
    console.warn(`Unsafe characters in ID: ${id.slice(0, 20)}...`)
    return null
  }
  return id
}

/**
 * Customer Research API
 *
 * GET /api/customer/[id]
 *
 * Provides detailed customer profile by pulling data from multiple sources:
 * - Local database (synced HubSpot + Metabase data)
 * - Live Metabase queries for reservations and payments
 *
 * Supports lookup by:
 * - HubSpot company ID
 * - Operator ID
 * - Stripe account ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Require authentication
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: "Customer ID required" }, { status: 400 })
  }

  try {
    // First, try to find in local database
    let company = await prisma.hubSpotCompany.findFirst({
      where: {
        OR: [{ hubspotId: id }, { operatorId: id }, { stripeAccountId: id }],
      },
    })

    // If not found by exact ID, try name search
    if (!company) {
      company = await prisma.hubSpotCompany.findFirst({
        where: {
          name: {
            contains: id,
            mode: "insensitive",
          },
        },
      })
    }

    if (!company) {
      return NextResponse.json({ error: "Customer not found", searchedFor: id }, { status: 404 })
    }

    // Get reservation details and TRENDS from Metabase if we have operator ID
    let reservationDetails = null
    let reservationTrends = null
    const safeOperatorId = sanitizeIdForSql(company.operatorId)
    if (safeOperatorId && process.env.METABASE_URL && process.env.METABASE_API_KEY) {
      try {
        const reservationSql = `
          SELECT
            COUNT(*) as total_reservations,
            COUNT(CASE WHEN CREATED_AT >= DATEADD(day, -30, CURRENT_DATE()) THEN 1 END) as last_30_days,
            COUNT(CASE WHEN CREATED_AT >= DATEADD(day, -90, CURRENT_DATE()) THEN 1 END) as last_90_days,
            SUM(TOTAL_AMOUNT) as total_revenue,
            SUM(CASE WHEN CREATED_AT >= DATEADD(day, -30, CURRENT_DATE()) THEN TOTAL_AMOUNT ELSE 0 END) as revenue_30_days,
            MAX(CREATED_AT) as last_reservation_date,
            COUNT(DISTINCT TRIP_TYPE) as trip_types_used
          FROM MOZART_NEW.MOOVS_OPERATOR_RESERVATIONS
          WHERE OPERATOR_ID = '${safeOperatorId}'
        `
        const result = await metabase.runCustomQuery(SNOWFLAKE_DB_ID, reservationSql)
        const rows = metabase.rowsToObjects<Record<string, unknown>>(result)
        if (rows.length > 0) {
          reservationDetails = {
            totalReservations: rows[0].total_reservations || 0,
            last30Days: rows[0].last_30_days || 0,
            last90Days: rows[0].last_90_days || 0,
            totalRevenue: rows[0].total_revenue || 0,
            revenue30Days: rows[0].revenue_30_days || 0,
            lastReservationDate: rows[0].last_reservation_date,
            tripTypesUsed: rows[0].trip_types_used || 0,
          }
        }
      } catch (err) {
        console.log("Reservation query failed:", err)
      }

      // Get monthly reservation TRENDS (last 6 months)
      try {
        const trendSql = `
          SELECT
            DATE_TRUNC('month', CREATED_AT) as month,
            COUNT(*) as reservations,
            SUM(TOTAL_AMOUNT) as revenue,
            COUNT(DISTINCT TRIP_TYPE) as trip_types
          FROM MOZART_NEW.MOOVS_OPERATOR_RESERVATIONS
          WHERE OPERATOR_ID = '${safeOperatorId}'
            AND CREATED_AT >= DATEADD(month, -6, CURRENT_DATE())
          GROUP BY DATE_TRUNC('month', CREATED_AT)
          ORDER BY month DESC
        `
        const trendResult = await metabase.runCustomQuery(SNOWFLAKE_DB_ID, trendSql)
        const trendRows = metabase.rowsToObjects<Record<string, unknown>>(trendResult)

        if (trendRows.length > 0) {
          // Calculate month-over-month change
          const months = trendRows.map((r) => ({
            month: r.month,
            reservations: (r.reservations as number) || 0,
            revenue: (r.revenue as number) || 0,
          }))

          // Calculate trend direction
          let trendDirection: "up" | "down" | "stable" = "stable"
          if (months.length >= 2) {
            const recent = months[0].reservations
            const previous = months[1].reservations
            if (recent > previous * 1.1) trendDirection = "up"
            else if (recent < previous * 0.9) trendDirection = "down"
          }

          // Calculate average and check for concerning decline
          const avgReservations = months.reduce((sum, m) => sum + m.reservations, 0) / months.length
          const recentVsAvg = months.length > 0 ? months[0].reservations / avgReservations : 1

          reservationTrends = {
            monthlyData: months,
            trendDirection,
            recentVsAverage: Math.round(recentVsAvg * 100),
            isDeclining: trendDirection === "down" || recentVsAvg < 0.7,
          }
        }
      } catch (err) {
        console.log("Reservation trend query failed:", err)
      }
    }

    // Get Lago billing health if we have operator ID
    let billingHealth = null
    if (company.operatorId && process.env.LAGO_API_KEY) {
      try {
        billingHealth = await lago.getBillingHealth(company.operatorId)
      } catch (err) {
        console.log("Lago billing query failed:", err)
      }
    }

    // Get payment details from Metabase if we have Stripe account ID
    let paymentDetails = null
    const safeStripeAccountId = sanitizeIdForSql(company.stripeAccountId)
    if (safeStripeAccountId && process.env.METABASE_URL && process.env.METABASE_API_KEY) {
      try {
        const paymentSql = `
          SELECT
            COUNT(*) as total_charges,
            SUM(CASE WHEN STATUS = 'succeeded' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN STATUS = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(AMOUNT) / 100.0 as total_amount,
            SUM(AMOUNT_REFUNDED) / 100.0 as total_refunded,
            AVG(OUTCOME_RISK_SCORE) as avg_risk_score,
            MAX(CREATED) as last_charge_date,
            COUNT(CASE WHEN CREATED >= DATEADD(day, -30, CURRENT_DATE()) THEN 1 END) as charges_30_days
          FROM STRIPE_MOOVS.CHARGE
          WHERE CONNECTED_ACCOUNT_ID = '${safeStripeAccountId}'
        `
        const result = await metabase.runCustomQuery(SNOWFLAKE_DB_ID, paymentSql)
        const rows = metabase.rowsToObjects<Record<string, unknown>>(result)
        if (rows.length > 0 && rows[0].total_charges) {
          const total = rows[0].total_charges as number
          const successful = (rows[0].successful as number) || 0
          paymentDetails = {
            totalCharges: total,
            successful,
            failed: (rows[0].failed as number) || 0,
            successRate: total > 0 ? Math.round((successful / total) * 100 * 100) / 100 : 0,
            totalAmount: rows[0].total_amount || 0,
            totalRefunded: rows[0].total_refunded || 0,
            avgRiskScore: rows[0].avg_risk_score || null,
            lastChargeDate: rows[0].last_charge_date,
            charges30Days: rows[0].charges_30_days || 0,
          }
        }
      } catch (err) {
        console.log("Payment query failed:", err)
      }
    }

    // Get support tickets from Notion if we have the API key
    let supportTickets = null
    if (process.env.NOTION_API_KEY) {
      try {
        const tickets = await notion.searchTicketsByCustomer(company.name)
        const openTickets = tickets.filter((t) => t.status !== "Done" && t.status !== "Archived")

        supportTickets = {
          total: tickets.length,
          open: openTickets.length,
          highPriority: openTickets.filter((t) => t.priority === "High" || t.priority === "Urgent")
            .length,
          recentTickets: tickets.slice(0, 5).map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            createdAt: t.createdAt,
            url: t.url,
          })),
        }
      } catch (err) {
        console.log("Notion ticket search failed:", err)
      }
    }

    // Build comprehensive customer profile
    const profile = {
      // Identity
      id: company.id,
      hubspotId: company.hubspotId,
      operatorId: company.operatorId,
      stripeAccountId: company.stripeAccountId,
      name: company.name,
      domain: company.domain,

      // Location
      location: {
        city: company.city,
        state: company.state,
        country: company.country,
      },

      // Subscription & Revenue
      subscription: {
        plan: company.plan,
        status: company.subscriptionStatus,
        mrr: company.mrr,
        contractEndDate: company.contractEndDate,
      },

      // Health Scores (0-100 each, weighted to numericHealthScore)
      health: {
        overall: company.healthScore,
        numericScore: company.numericHealthScore,
        payment: company.paymentScore,
        engagement: company.engagementScore,
        support: company.supportScore,
        growth: company.growthScore,
        riskSignals: company.riskSignals,
        positiveSignals: company.positiveSignals,
      },

      // Payment Health
      paymentHealth: {
        status: company.paymentHealth,
        successRate: company.paymentSuccessRate,
        failedPayments90d: company.failedPaymentCount,
        disputes: company.disputeCount,
        avgRiskScore: company.avgRiskScore,
        totalVolume: company.totalChargeVolume,
      },

      // Usage & Engagement
      usage: {
        totalTrips: company.totalTrips,
        lastActivity: company.lastLoginAt,
        daysSinceLastActivity: company.daysSinceLastLogin,
      },

      // CSM Assignment
      csm: {
        ownerId: company.ownerId,
        name: company.ownerName,
        email: company.ownerEmail,
      },

      // Detailed data from live queries
      reservationDetails,
      reservationTrends,
      paymentDetails,
      billingHealth,
      supportTickets,

      // Metadata
      metadata: {
        industry: company.industry,
        employeeCount: company.employeeCount,
        hubspotCreatedAt: company.hubspotCreatedAt,
        lastSyncedAt: company.lastSyncedAt,
      },
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Customer research failed:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch customer data",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}
