import { NextRequest, NextResponse } from "next/server"
import { lago } from "@/lib/integrations/lago"
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

    // Fetch subscriptions and available plans in parallel
    const [subscriptions, plansResult] = await Promise.all([
      lago.getSubscriptions(operatorId),
      lago.listPlans(),
    ])

    // Create a map of plans for quick lookup
    const planMap = new Map(plansResult.plans.map((p) => [p.code, p]))

    const activeSubscription = subscriptions.find((s) => s.status === "active")
    const activePlan = activeSubscription ? planMap.get(activeSubscription.plan_code) : null

    return NextResponse.json({
      operatorId,
      currentSubscription: activeSubscription
        ? {
            id: activeSubscription.external_id,
            lagoId: activeSubscription.lago_id,
            planCode: activeSubscription.plan_code,
            planName: activeSubscription.plan?.name || activePlan?.name,
            status: activeSubscription.status,
            startedAt: activeSubscription.started_at,
            billingTime: activeSubscription.billing_time,
            interval: activeSubscription.plan?.interval || activePlan?.interval,
            amountCents: activeSubscription.plan?.amount_cents || activePlan?.amount_cents,
            currency: activeSubscription.plan?.amount_currency || activePlan?.amount_currency,
          }
        : null,
      allSubscriptions: subscriptions.map((s) => {
        const plan = planMap.get(s.plan_code)
        // Get pricing: prefer override, then subscription's plan, then looked-up plan
        const amountCents =
          s.plan_overrides?.amount_cents ?? s.plan?.amount_cents ?? plan?.amount_cents ?? null
        const amountCurrency =
          s.plan_overrides?.amount_currency ??
          s.plan?.amount_currency ??
          plan?.amount_currency ??
          null
        const hasOverride = !!s.plan_overrides?.amount_cents

        return {
          id: s.external_id,
          lagoId: s.lago_id,
          planCode: s.plan_code,
          planName: s.plan?.name || plan?.name || null,
          status: s.status,
          startedAt: s.started_at,
          endingAt: s.ending_at || null,
          canceledAt: s.canceled_at || null,
          terminatedAt: s.terminated_at || null,
          billingTime: s.billing_time,
          amountCents,
          amountCurrency,
          interval: s.plan?.interval || plan?.interval || null,
          hasOverride,
          // Original plan price for reference when overridden
          originalAmountCents: hasOverride ? (plan?.amount_cents ?? null) : null,
        }
      }),
      availablePlans: plansResult.plans.map((p) => ({
        code: p.code,
        name: p.name,
        interval: p.interval,
        amountCents: p.amount_cents,
        currency: p.amount_currency,
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
    const { planCode, name, billingTime } = body

    if (!planCode) {
      return NextResponse.json({ error: "planCode is required" }, { status: 400 })
    }

    const subscription = await lago.createSubscription({
      externalCustomerId: operatorId,
      planCode,
      name,
      billingTime,
    })

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
    const { subscriptionId, planCode, name } = body

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
    })

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

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId query parameter is required" },
        { status: 400 }
      )
    }

    const subscription = await lago.cancelSubscription(subscriptionId)

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
