import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/platform-data
 *
 * Fetches additional platform data: promo codes, price zones, rules, settings.
 * Data comes from Snowflake's SWOOP and POSTGRES_SWOOP schemas.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    if (!snowflake.isConfigured()) {
      return NextResponse.json({ error: "Snowflake/Metabase not configured" }, { status: 503 })
    }

    // Fetch all platform data in parallel
    const [
      promoCodes,
      priceZones,
      rules,
      settings,
      contacts,
      bankAccounts,
      subscriptionLog,
      bankTransactions,
      driverAppUsers,
      operatorCoreInfo,
    ] = await Promise.all([
      snowflake.getOperatorPromoCodes(operatorId).catch(() => []),
      snowflake.getOperatorPriceZones(operatorId).catch(() => []),
      snowflake.getOperatorRules(operatorId).catch(() => []),
      snowflake.getOperatorSettings(operatorId).catch(() => null),
      snowflake.getOperatorContacts(operatorId).catch(() => []),
      snowflake.getOperatorBankAccounts(operatorId).catch(() => []),
      snowflake.getOperatorSubscriptionLog(operatorId).catch(() => []),
      snowflake.getOperatorBankTransactions(operatorId).catch(() => []),
      snowflake.getOperatorDriverAppUsers(operatorId).catch(() => []),
      snowflake.getOperatorCoreInfo(operatorId).catch(() => null),
    ])

    // Calculate stats
    const activePromoCodes = promoCodes.filter((p) => p.is_active).length
    const activeRules = rules.filter((r) => r.is_active).length

    return NextResponse.json({
      operatorId,
      promoCodes: promoCodes.map((p) => ({
        id: p.promo_code_id,
        code: p.code,
        description: p.description,
        discountType: p.discount_type,
        discountValue: p.discount_value,
        validFrom: p.valid_from,
        validUntil: p.valid_until,
        usageLimit: p.usage_limit,
        timesUsed: p.times_used,
        isActive: p.is_active,
        createdAt: p.created_at,
      })),
      priceZones: priceZones.map((z) => ({
        id: z.zone_id,
        name: z.name,
        type: z.zone_type,
        baseFare: z.base_fare,
        perMileRate: z.per_mile_rate,
        perMinuteRate: z.per_minute_rate,
        minimumFare: z.minimum_fare,
        createdAt: z.created_at,
      })),
      rules: rules.map((r) => ({
        id: r.rule_id,
        name: r.name,
        type: r.rule_type,
        conditions: r.conditions,
        actions: r.actions,
        isActive: r.is_active,
        priority: r.priority,
        createdAt: r.created_at,
      })),
      contacts: contacts.map((c) => ({
        id: c.contact_id,
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        phone: c.phone,
        companyName: c.company_name,
        notes: c.notes,
        createdAt: c.created_at,
      })),
      bankAccounts: bankAccounts.map((b) => ({
        id: b.account_id,
        institutionName: b.institution_name,
        accountName: b.account_name,
        accountType: b.account_type,
        lastFour: b.last_four,
        status: b.status,
        createdAt: b.created_at,
      })),
      subscriptionLog: subscriptionLog.map((s) => ({
        id: s.log_id,
        eventType: s.event_type,
        planName: s.plan_name,
        previousPlan: s.previous_plan,
        amount: s.amount,
        eventDate: s.event_date,
        notes: s.notes,
      })),
      bankTransactions: bankTransactions.map((t) => ({
        id: t.transaction_id,
        accountId: t.account_id,
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        status: t.status,
        transactedAt: t.transacted_at,
        postedAt: t.posted_at,
      })),
      driverAppUsers: driverAppUsers.map((d) => ({
        driverId: d.driver_id,
        appUserId: d.app_user_id,
        appVersion: d.app_version,
        deviceType: d.device_type,
        lastActiveAt: d.last_active_at,
        pushEnabled: d.push_enabled,
      })),
      settings,
      operatorInfo: operatorCoreInfo
        ? {
            name: operatorCoreInfo.name,
            nameSlug: operatorCoreInfo.name_slug,
            email: operatorCoreInfo.email,
            phone: operatorCoreInfo.phone,
            generalEmail: operatorCoreInfo.general_email,
            termsAndConditionsUrl: operatorCoreInfo.terms_and_conditions_url,
            websiteUrl: operatorCoreInfo.website_url,
            companyLogoUrl: operatorCoreInfo.company_logo_url,
            bookingPortalUrl: operatorCoreInfo.name_slug
              ? `https://${operatorCoreInfo.name_slug}.book.moovs.app`
              : null,
          }
        : null,
      stats: {
        totalPromoCodes: promoCodes.length,
        activePromoCodes,
        totalZones: priceZones.length,
        totalRules: rules.length,
        activeRules,
        totalContacts: contacts.length,
        totalBankAccounts: bankAccounts.length,
        totalSubscriptionEvents: subscriptionLog.length,
        totalBankTransactions: bankTransactions.length,
        totalDriverAppUsers: driverAppUsers.length,
        hasSettings: !!settings,
        hasOperatorInfo: !!operatorCoreInfo,
      },
    })
  } catch (error) {
    console.error("Failed to fetch operator platform data:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch platform data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
