import { NextRequest, NextResponse } from "next/server"
import { lago } from "@/lib/integrations/lago"
import { n8nClient } from "@/lib/integrations/n8n"
import { requireAdmin } from "@/lib/auth/api-middleware"

/**
 * GET /api/operator-hub/[operatorId]/subscription
 *
 * Get subscription and plan information for an operator
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    if (!lago.isConfigured()) {
      return NextResponse.json({ error: "Lago not configured" }, { status: 503 })
    }

    // Fetch subscriptions, plans, coupons, and add-ons in parallel
    const [subscriptions, plansResult, couponsResult, addOnsResult, appliedCouponsResult] =
      await Promise.all([
        lago.getSubscriptions(operatorId),
        lago.listPlans(),
        lago.listCoupons(),
        lago.listAddOns(),
        lago.getAppliedCoupons(operatorId),
      ])

    // Create a map of plans for quick lookup
    const planMap = new Map(plansResult.plans.map((p) => [p.code, p]))

    // Fetch detailed subscription info for active subscriptions to get accurate pricing
    // The list endpoint may not include plan_overrides, but individual fetch does
    const activeSubscriptionIds = subscriptions
      .filter((s) => s.status === "active")
      .map((s) => s.external_id)

    const detailedSubscriptions = await Promise.all(
      activeSubscriptionIds.map((id) => lago.getSubscription(id))
    )

    // Create a map of detailed subscription data
    const detailMap = new Map(
      detailedSubscriptions
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((s) => [s.external_id, s])
    )

    const activeSubscription = subscriptions.find((s) => s.status === "active")
    const activePlan = activeSubscription ? planMap.get(activeSubscription.plan_code) : null
    const activeDetail = activeSubscription ? detailMap.get(activeSubscription.external_id) : null

    return NextResponse.json({
      operatorId,
      currentSubscription: activeSubscription
        ? {
            id: activeSubscription.external_id,
            lagoId: activeSubscription.lago_id,
            planCode: activeSubscription.plan_code,
            planName: activeDetail?.plan?.name || activeSubscription.plan?.name || activePlan?.name,
            status: activeSubscription.status,
            startedAt: activeSubscription.started_at,
            billingTime: activeSubscription.billing_time,
            interval:
              activeDetail?.plan?.interval ||
              activeSubscription.plan?.interval ||
              activePlan?.interval,
            amountCents:
              activeDetail?.plan_overrides?.amount_cents ||
              activeDetail?.plan?.amount_cents ||
              activeSubscription.plan?.amount_cents ||
              activePlan?.amount_cents,
            currency:
              activeDetail?.plan_overrides?.amount_currency ||
              activeDetail?.plan?.amount_currency ||
              activeSubscription.plan?.amount_currency ||
              activePlan?.amount_currency,
          }
        : null,
      allSubscriptions: subscriptions.map((s) => {
        const plan = planMap.get(s.plan_code)
        const detail = detailMap.get(s.external_id)

        // Get pricing: prefer detailed override, then detailed plan, then list plan, then looked-up plan
        const amountCents =
          detail?.plan_overrides?.amount_cents ??
          detail?.plan?.amount_cents ??
          s.plan_overrides?.amount_cents ??
          s.plan?.amount_cents ??
          plan?.amount_cents ??
          null
        const amountCurrency =
          detail?.plan_overrides?.amount_currency ??
          detail?.plan?.amount_currency ??
          s.plan_overrides?.amount_currency ??
          s.plan?.amount_currency ??
          plan?.amount_currency ??
          null
        const hasOverride =
          !!detail?.plan_overrides?.amount_cents || !!s.plan_overrides?.amount_cents

        return {
          id: s.external_id,
          lagoId: s.lago_id,
          planCode: s.plan_code,
          planName: detail?.plan?.name || s.plan?.name || plan?.name || null,
          status: s.status,
          startedAt: s.started_at,
          endingAt: s.ending_at || null,
          canceledAt: s.canceled_at || null,
          terminatedAt: s.terminated_at || null,
          billingTime: s.billing_time,
          amountCents,
          amountCurrency,
          interval: detail?.plan?.interval || s.plan?.interval || plan?.interval || null,
          hasOverride,
          // Original plan price for reference when overridden
          originalAmountCents: hasOverride ? (plan?.amount_cents ?? null) : null,
          // Billing period info - renewal dates
          billingPeriodStartedAt:
            detail?.current_billing_period_started_at ||
            s.current_billing_period_started_at ||
            null,
          billingPeriodEndingAt:
            detail?.current_billing_period_ending_at || s.current_billing_period_ending_at || null,
        }
      }),
      availablePlans: plansResult.plans.map((p) => ({
        code: p.code,
        name: p.name,
        interval: p.interval,
        amountCents: p.amount_cents,
        currency: p.amount_currency,
      })),
      // Available coupons for new subscriptions
      availableCoupons: couponsResult.coupons
        .filter((c) => !c.terminated_at) // Only active coupons
        .map((c) => ({
          code: c.code,
          name: c.name,
          description: c.description,
          couponType: c.coupon_type,
          amountCents: c.amount_cents,
          amountCurrency: c.amount_currency,
          percentageRate: c.percentage_rate,
          frequency: c.frequency,
          frequencyDuration: c.frequency_duration,
        })),
      // Available add-ons (setup fees)
      availableAddOns: addOnsResult.add_ons.map((a) => ({
        code: a.code,
        name: a.name,
        description: a.description,
        amountCents: a.amount_cents,
        amountCurrency: a.amount_currency,
      })),
      // Currently applied coupons for this customer
      appliedCoupons: appliedCouponsResult.applied_coupons
        .filter((c) => c.status === "active")
        .map((c) => ({
          couponCode: c.coupon_code,
          couponName: c.coupon_name,
          amountCents: c.amount_cents,
          amountCentsRemaining: c.amount_cents_remaining,
          percentageRate: c.percentage_rate,
          frequency: c.frequency,
          frequencyDurationRemaining: c.frequency_duration_remaining,
        })),
    })
  } catch (error) {
    console.error("Failed to fetch subscription:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/operator-hub/[operatorId]/subscription
 *
 * Create a new subscription for an operator.
 * Requires admin role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  // Require admin role for creating subscriptions
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { operatorId } = await params

    if (!lago.isConfigured()) {
      return NextResponse.json({ error: "Lago not configured" }, { status: 503 })
    }

    const body = await request.json()
    const {
      planCode,
      name,
      billingTime,
      overrideAmountCents,
      overrideAmountCurrency,
      // Coupon options
      couponCode,
      couponAmountCents,
      couponFrequencyDuration,
      // Setup fee add-on
      setupFeeAddOnCode,
    } = body

    if (!planCode) {
      return NextResponse.json({ error: "planCode is required" }, { status: 400 })
    }

    // Create the subscription
    const subscription = await lago.createSubscription({
      externalCustomerId: operatorId,
      planCode,
      name,
      billingTime,
      // Allow admins to set a custom price override
      overrideAmountCents:
        overrideAmountCents !== undefined ? Number(overrideAmountCents) : undefined,
      overrideAmountCurrency,
    })

    // Apply coupon if provided
    let appliedCoupon = null
    if (couponCode) {
      try {
        appliedCoupon = await lago.applyCoupon({
          externalCustomerId: operatorId,
          couponCode,
          amountCents: couponAmountCents ? Number(couponAmountCents) : undefined,
          frequencyDuration: couponFrequencyDuration ? Number(couponFrequencyDuration) : undefined,
        })
      } catch (couponError) {
        console.error("Failed to apply coupon:", couponError)
        // Don't fail the whole operation if coupon fails
      }
    }

    // Apply setup fee add-on if provided
    let appliedAddOn = null
    if (setupFeeAddOnCode) {
      try {
        appliedAddOn = await lago.applyAddOn({
          externalCustomerId: operatorId,
          addOnCode: setupFeeAddOnCode,
        })
      } catch (addOnError) {
        console.error("Failed to apply setup fee:", addOnError)
        // Don't fail the whole operation if add-on fails
      }
    }

    // Sync to database via N8N webhook (subscription_log + operator.plan)
    // N8N handles the Snowflake writes using its configured credentials
    let dbSyncResult = null
    if (subscription && n8nClient.isConfigured()) {
      try {
        dbSyncResult = await n8nClient.syncSubscriptionCreate({
          operatorId,
          planCode,
          overrideAmountCents:
            overrideAmountCents !== undefined ? Number(overrideAmountCents) : undefined,
          notes: `Created via Operator Hub. Custom price: ${overrideAmountCents ? `$${(overrideAmountCents / 100).toFixed(2)}` : "standard"}`,
        })
        console.log(`[Subscription] N8N sync successful for ${operatorId}: ${planCode}`)
      } catch (dbError) {
        console.error("[Subscription] N8N sync failed (Lago succeeded):", dbError)
        // Don't fail the operation - Lago is source of truth, DB sync is supplementary
      }
    }

    return NextResponse.json({
      success: true,
      subscription: subscription
        ? {
            id: subscription.external_id,
            lagoId: subscription.lago_id,
            planCode: subscription.plan_code,
            planName: subscription.plan?.name,
            status: subscription.status,
          }
        : null,
      appliedCoupon: appliedCoupon
        ? {
            couponCode: appliedCoupon.coupon_code,
            couponName: appliedCoupon.coupon_name,
          }
        : null,
      appliedSetupFee: appliedAddOn
        ? {
            addOnCode: appliedAddOn.add_on_code,
            amountCents: appliedAddOn.amount_cents,
          }
        : null,
      dbSync: dbSyncResult ? { success: true } : null,
    })
  } catch (error) {
    console.error("Failed to create subscription:", error)
    return NextResponse.json(
      {
        error: "Failed to create subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/operator-hub/[operatorId]/subscription
 *
 * Update an existing subscription (change plan).
 * Requires admin role.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  // Require admin role for updating subscriptions
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { operatorId } = await params

    if (!lago.isConfigured()) {
      return NextResponse.json({ error: "Lago not configured" }, { status: 503 })
    }

    const body = await request.json()
    const {
      subscriptionId,
      planCode,
      name,
      overrideAmountCents,
      overrideAmountCurrency,
      previousPlanCode, // Optional: for better tracking
    } = body

    if (!subscriptionId || !planCode) {
      return NextResponse.json(
        { error: "subscriptionId and planCode are required" },
        { status: 400 }
      )
    }

    const subscription = await lago.updateSubscription({
      externalCustomerId: operatorId,
      subscriptionExternalId: subscriptionId,
      planCode,
      name,
      // Allow admins to set a custom price override
      overrideAmountCents:
        overrideAmountCents !== undefined ? Number(overrideAmountCents) : undefined,
      overrideAmountCurrency,
    })

    // Sync to database via N8N webhook (subscription_log + operator.plan)
    let dbSyncResult = null
    if (subscription && n8nClient.isConfigured()) {
      try {
        dbSyncResult = await n8nClient.syncSubscriptionChange({
          operatorId,
          newPlanCode: planCode,
          previousPlanCode,
          overrideAmountCents:
            overrideAmountCents !== undefined ? Number(overrideAmountCents) : undefined,
          notes: `Plan changed via Operator Hub. ${previousPlanCode ? `From: ${previousPlanCode}. ` : ""}Custom price: ${overrideAmountCents ? `$${(overrideAmountCents / 100).toFixed(2)}` : "standard"}`,
        })
        console.log(
          `[Subscription] N8N sync successful for ${operatorId}: ${previousPlanCode || "unknown"} -> ${planCode}`
        )
      } catch (dbError) {
        console.error("[Subscription] N8N sync failed (Lago succeeded):", dbError)
        // Don't fail the operation - Lago is source of truth
      }
    }

    return NextResponse.json({
      success: true,
      subscription: subscription
        ? {
            id: subscription.external_id,
            lagoId: subscription.lago_id,
            planCode: subscription.plan_code,
            planName: subscription.plan?.name,
            status: subscription.status,
          }
        : null,
      dbSync: dbSyncResult ? { success: true } : null,
    })
  } catch (error) {
    console.error("Failed to update subscription:", error)
    return NextResponse.json(
      {
        error: "Failed to update subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/operator-hub/[operatorId]/subscription
 *
 * Cancel a subscription.
 * Requires admin role.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  // Require admin role for cancelling subscriptions
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { operatorId } = await params

    if (!lago.isConfigured()) {
      return NextResponse.json({ error: "Lago not configured" }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get("subscriptionId")
    const planCode = searchParams.get("planCode") // Optional: for DB tracking

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId query parameter is required" },
        { status: 400 }
      )
    }

    const subscription = await lago.cancelSubscription(subscriptionId)

    // Sync cancellation to database via N8N webhook
    // Note: Lago cancellation is "end of billing period" so operator stays on plan until then
    let dbSyncResult = null
    if (subscription && n8nClient.isConfigured()) {
      try {
        dbSyncResult = await n8nClient.syncSubscriptionCancel({
          operatorId,
          planCode: planCode || subscription.plan_code || undefined,
          immediate: false, // Lago cancels at end of billing period
          notes: `Cancelled via Operator Hub. Will end at billing period. Subscription ID: ${subscriptionId}`,
        })
        console.log(`[Subscription] N8N cancellation sync successful for ${operatorId}`)
      } catch (dbError) {
        console.error("[Subscription] N8N cancellation sync failed (Lago succeeded):", dbError)
        // Don't fail the operation - Lago is source of truth
      }
    }

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
      subscription: subscription
        ? {
            id: subscription.external_id,
            status: subscription.status,
            canceledAt: subscription.canceled_at,
          }
        : null,
      dbSync: dbSyncResult,
    })
  } catch (error) {
    console.error("Failed to cancel subscription:", error)
    return NextResponse.json(
      {
        error: "Failed to cancel subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
