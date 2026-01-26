import { NextResponse } from "next/server"

export async function GET() {
  // Check which integrations are configured via env vars
  const integrations = {
    hubspot: {
      name: "HubSpot",
      description: "CRM data, companies, contacts",
      configured: !!process.env.HUBSPOT_ACCESS_TOKEN,
      envVar: "HUBSPOT_ACCESS_TOKEN",
      docsUrl: "https://developers.hubspot.com/docs/api/private-apps",
    },
    stripe: {
      name: "Stripe",
      description: "Payment data, subscriptions, invoices",
      configured: !!process.env.STRIPE_SECRET_KEY,
      envVar: "STRIPE_SECRET_KEY",
      docsUrl: "https://dashboard.stripe.com/apikeys",
    },
    notion: {
      name: "Notion",
      description: "Tasks, tickets, documents",
      configured: !!process.env.NOTION_API_KEY,
      envVar: "NOTION_API_KEY",
      docsUrl: "https://www.notion.so/my-integrations",
    },
    metabase: {
      name: "Metabase",
      description: "Usage analytics, SQL queries",
      configured: !!(process.env.METABASE_URL && process.env.METABASE_API_KEY),
      envVar: "METABASE_URL, METABASE_API_KEY",
      docsUrl: null,
    },
    lago: {
      name: "Lago",
      description: "Billing, usage metering",
      configured: !!process.env.LAGO_API_KEY,
      envVar: "LAGO_API_KEY",
      docsUrl: "https://docs.getlago.com/api-reference/intro",
    },
    slack: {
      name: "Slack",
      description: "Alert notifications, digests",
      configured: !!process.env.SLACK_WEBHOOK_URL,
      envVar: "SLACK_WEBHOOK_URL",
      docsUrl: "https://api.slack.com/messaging/webhooks",
    },
    email: {
      name: "Email (Resend)",
      description: "Email alerts, NPS surveys",
      configured: !!process.env.RESEND_API_KEY,
      envVar: "RESEND_API_KEY",
      docsUrl: "https://resend.com/api-keys",
    },
    anthropic: {
      name: "Claude AI",
      description: "AI-powered analysis and skills",
      configured: !!process.env.VERCEL_AI_GATEWAY_API_KEY,
      envVar: "VERCEL_AI_GATEWAY_API_KEY",
      docsUrl: "https://console.anthropic.com/",
    },
  }

  const configuredCount = Object.values(integrations).filter((i) => i.configured).length
  const totalCount = Object.keys(integrations).length

  return NextResponse.json({
    integrations,
    summary: {
      configured: configuredCount,
      total: totalCount,
      percentage: Math.round((configuredCount / totalCount) * 100),
    },
  })
}
