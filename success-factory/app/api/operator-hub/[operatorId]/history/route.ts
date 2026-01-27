import { NextRequest, NextResponse } from "next/server"
import { snowflake } from "@/lib/integrations"

/**
 * GET /api/operator-hub/[operatorId]/history
 *
 * Get change history/audit log for an operator.
 * Combines subscription changes, member activity, and other events.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params

    if (!snowflake.isConfigured()) {
      return NextResponse.json({ error: "Snowflake not configured" }, { status: 503 })
    }

    // Fetch subscription log
    const subscriptionLog = await snowflake.getOperatorSubscriptionLog(operatorId)

    // Transform to unified history format
    const history = subscriptionLog.map((entry) => ({
      id: entry.log_id,
      type: mapEventType(entry.event_type),
      title: formatEventTitle(entry.event_type, entry.plan_name, entry.previous_plan),
      description: formatEventDescription(entry),
      timestamp: entry.event_date || new Date().toISOString(),
      metadata: {
        eventType: entry.event_type,
        planName: entry.plan_name,
        previousPlan: entry.previous_plan,
        amount: entry.amount,
        notes: entry.notes,
      },
    }))

    // Sort by timestamp descending
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      operatorId,
      history,
      count: history.length,
    })
  } catch (error) {
    console.error("Failed to fetch operator history:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

function mapEventType(eventType: string | null): string {
  const typeMap: Record<string, string> = {
    subscription_created: "subscription",
    subscription_updated: "subscription",
    subscription_cancelled: "subscription",
    subscription_renewed: "subscription",
    plan_changed: "plan_change",
    plan_upgraded: "plan_change",
    plan_downgraded: "plan_change",
    payment_succeeded: "payment",
    payment_failed: "payment",
    member_added: "member",
    member_removed: "member",
    settings_updated: "settings",
  }
  return typeMap[eventType?.toLowerCase() ?? ""] || "activity"
}

function formatEventTitle(
  eventType: string | null,
  planName: string | null,
  previousPlan: string | null
): string {
  const type = eventType?.toLowerCase() || ""

  if (type.includes("created")) {
    return `Subscription created${planName ? `: ${planName}` : ""}`
  }
  if (type.includes("cancelled") || type.includes("canceled")) {
    return `Subscription cancelled${planName ? `: ${planName}` : ""}`
  }
  if (type.includes("renewed")) {
    return `Subscription renewed${planName ? `: ${planName}` : ""}`
  }
  if (type.includes("upgraded")) {
    return previousPlan
      ? `Plan upgraded: ${previousPlan} → ${planName}`
      : `Plan upgraded to ${planName}`
  }
  if (type.includes("downgraded")) {
    return previousPlan
      ? `Plan downgraded: ${previousPlan} → ${planName}`
      : `Plan downgraded to ${planName}`
  }
  if (type.includes("changed") && type.includes("plan")) {
    return previousPlan ? `Plan changed: ${previousPlan} → ${planName}` : `Plan changed to ${planName}`
  }
  if (type.includes("payment") && type.includes("success")) {
    return "Payment succeeded"
  }
  if (type.includes("payment") && type.includes("fail")) {
    return "Payment failed"
  }
  if (type.includes("member") && type.includes("add")) {
    return "Member added"
  }
  if (type.includes("member") && type.includes("remove")) {
    return "Member removed"
  }

  // Default: capitalize event type
  return eventType?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Activity"
}

function formatEventDescription(entry: {
  event_type: string | null
  plan_name: string | null
  previous_plan: string | null
  amount: number | null
  notes: string | null
}): string {
  const parts: string[] = []

  if (entry.amount && entry.amount > 0) {
    parts.push(`$${(entry.amount / 100).toFixed(2)}`)
  }

  if (entry.notes) {
    parts.push(entry.notes)
  }

  return parts.join(" • ") || ""
}
