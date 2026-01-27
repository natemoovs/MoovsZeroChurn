import { NextRequest, NextResponse } from "next/server"
import { lago } from "@/lib/integrations/lago"

/**
 * GET /api/operator-hub/[operatorId]/invoices
 *
 * Get Lago billing invoices for an operator
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  try {
    const { operatorId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as "draft" | "finalized" | "voided" | undefined
    const paymentStatus = searchParams.get("paymentStatus") as
      | "pending"
      | "succeeded"
      | "failed"
      | undefined

    if (!lago.isConfigured()) {
      return NextResponse.json({ error: "Lago not configured" }, { status: 503 })
    }

    const result = await lago.getInvoices(operatorId, {
      status,
      paymentStatus,
      perPage: 50,
    })

    // Calculate summary stats
    const finalizedInvoices = result.invoices.filter((i) => i.status === "finalized")
    const paidInvoices = finalizedInvoices.filter((i) => i.payment_status === "succeeded")
    const pendingInvoices = finalizedInvoices.filter((i) => i.payment_status === "pending")
    const failedInvoices = finalizedInvoices.filter((i) => i.payment_status === "failed")

    const now = new Date()
    const overdueInvoices = pendingInvoices.filter((i) => {
      if (!i.payment_due_date) return false
      return new Date(i.payment_due_date) < now
    })

    const totalInvoiced = finalizedInvoices.reduce((sum, i) => sum + i.total_amount_cents, 0)
    const totalPaid = paidInvoices.reduce((sum, i) => sum + i.total_amount_cents, 0)
    const totalPending = pendingInvoices.reduce((sum, i) => sum + i.total_amount_cents, 0)
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + i.total_amount_cents, 0)

    return NextResponse.json({
      operatorId,
      invoices: result.invoices.map((i) => ({
        id: i.lago_id,
        number: i.number,
        type: i.invoice_type,
        status: i.status,
        paymentStatus: i.payment_status,
        currency: i.currency,
        totalAmountCents: i.total_amount_cents,
        taxesAmountCents: i.taxes_amount_cents,
        issuingDate: i.issuing_date,
        paymentDueDate: i.payment_due_date,
        paymentOverdue: i.payment_overdue,
        fromDate: i.from_date,
        toDate: i.to_date,
        createdAt: i.created_at,
      })),
      summary: {
        totalInvoiced,
        totalPaid,
        totalPending,
        totalOverdue,
        invoiceCount: result.invoices.length,
        paidCount: paidInvoices.length,
        pendingCount: pendingInvoices.length,
        overdueCount: overdueInvoices.length,
        failedCount: failedInvoices.length,
        currency: result.invoices[0]?.currency || "USD",
      },
      meta: result.meta,
    })
  } catch (error) {
    console.error("Failed to fetch invoices:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch invoices",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
