import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/integrations/stripe"

/**
 * GET /api/operator-hub/[operatorId]/stripe
 *
 * Get Stripe connected account data for an operator
 * Includes: account status, balance, recent payouts, recent charges
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    // Get stripeAccountId from query params (passed from the UI)
    const { searchParams } = new URL(request.url)
    const stripeAccountId = searchParams.get("stripeAccountId")

    if (!stripeAccountId) {
      return NextResponse.json({ error: "stripeAccountId query parameter is required" }, { status: 400 })
    }

    if (!stripe.isConnectedConfigured()) {
      return NextResponse.json({ error: "Stripe connected account access not configured" }, { status: 503 })
    }

    // Fetch all Stripe data in parallel
    const [account, balance, payouts, charges] = await Promise.all([
      stripe.getConnectedAccount(stripeAccountId).catch(() => null),
      stripe.getConnectedAccountBalance(stripeAccountId).catch(() => null),
      stripe.getConnectedAccountPayouts(stripeAccountId, { limit: 10 }).catch(() => []),
      stripe.getConnectedAccountCharges(stripeAccountId, { limit: 20 }).catch(() => []),
    ])

    if (!account) {
      return NextResponse.json({ error: "Stripe account not found" }, { status: 404 })
    }

    // Calculate balance totals
    const availableBalance = balance?.available.reduce((sum, b) => sum + b.amount, 0) || 0
    const pendingBalance = balance?.pending.reduce((sum, b) => sum + b.amount, 0) || 0
    const currency = balance?.available[0]?.currency || "usd"

    // Calculate charge stats
    const successfulCharges = (charges as typeof charges).filter((c) => c.status === "succeeded")
    const totalChargeVolume = successfulCharges.reduce((sum, c) => sum + c.amount, 0)
    const avgChargeAmount =
      successfulCharges.length > 0 ? Math.round(totalChargeVolume / successfulCharges.length) : 0

    return NextResponse.json({
      operatorId,
      stripeAccountId,
      account: {
        id: account.id,
        businessName: account.business_profile?.name,
        email: account.email,
        country: account.country,
        defaultCurrency: account.default_currency,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        createdAt: new Date(account.created * 1000).toISOString(),
        requirements: {
          currentlyDue: account.requirements?.currently_due || [],
          pastDue: account.requirements?.past_due || [],
          disabledReason: account.requirements?.disabled_reason,
        },
      },
      balance: {
        available: availableBalance,
        pending: pendingBalance,
        total: availableBalance + pendingBalance,
        currency,
      },
      payouts: (payouts as typeof payouts).map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        createdAt: new Date(p.created * 1000).toISOString(),
        description: p.description,
        failureMessage: p.failure_message,
      })),
      charges: {
        recent: (charges as typeof charges).slice(0, 10).map((c) => ({
          id: c.id,
          amount: c.amount,
          currency: c.currency,
          status: c.status,
          description: c.description,
          createdAt: new Date(c.created * 1000).toISOString(),
          receiptUrl: c.receipt_url,
          paymentMethod: c.payment_method_details?.card
            ? {
                brand: c.payment_method_details.card.brand,
                last4: c.payment_method_details.card.last4,
              }
            : null,
        })),
        stats: {
          totalCount: charges.length,
          successCount: successfulCharges.length,
          totalVolume: totalChargeVolume,
          avgAmount: avgChargeAmount,
          currency,
        },
      },
    })
  } catch (error) {
    console.error("Failed to fetch Stripe data:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch Stripe data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
