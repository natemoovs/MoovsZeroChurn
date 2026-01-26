/**
 * Unified Integrations Client
 *
 * Exports all integration clients for HubSpot, Stripe, Notion, and Metabase.
 *
 * Usage:
 *   import { integrations } from "@/lib/integrations"
 *   const company = await integrations.hubspot.getCompany("123")
 *
 * Or import individual clients:
 *   import { hubspot, stripe, notion, metabase } from "@/lib/integrations"
 */

// Re-export individual clients and their types
export { hubspot } from "./hubspot"
export type {
  HubSpotCompany,
  HubSpotContact,
  HubSpotDeal,
  HubSpotEngagement,
  HubSpotActivity,
  HubSpotSearchResult,
  HubSpotError,
} from "./hubspot"

export { stripe } from "./stripe"
export type {
  StripeCustomer,
  StripeAddress,
  StripeSubscription,
  StripeSubscriptionStatus,
  StripeSubscriptionItem,
  StripePrice,
  StripeInvoice,
  StripeInvoiceStatus,
  StripeInvoiceLineItem,
  StripePaymentIntent,
  StripePaymentIntentStatus,
  StripeCharge,
  StripeListResponse,
  StripeError,
} from "./stripe"

export { notion } from "./notion"
export type {
  NotionPage,
  NotionUser,
  NotionParent,
  NotionDatabase,
  NotionRichText,
  NotionPropertySchema,
  NotionPropertyType,
  NotionPropertyValue,
  NotionFilter,
  NotionTextFilter,
  NotionNumberFilter,
  NotionDateFilter,
  NotionSort,
  NotionQueryResult,
  NotionError,
  NotionPropertyInput,
} from "./notion"

export { metabase } from "./metabase"
export type {
  MetabaseQuestion,
  MetabaseVisualizationType,
  MetabaseDatasetQuery,
  MetabaseStructuredQuery,
  MetabaseNativeQuery,
  MetabaseTemplateTag,
  MetabaseQueryResult,
  MetabaseResultData,
  MetabaseColumn,
  MetabaseBaseType,
  MetabaseColumnMetadata,
  MetabaseInsight,
  MetabaseDatabase,
  MetabaseTable,
  MetabaseError,
  MetabaseCard,
} from "./metabase"

export { lago } from "./lago"
export type {
  LagoCustomer,
  LagoSubscription,
  LagoPlan,
  LagoInvoice,
  LagoError,
  BillingHealthSummary,
} from "./lago"

export { snowflake } from "./snowflake"
export type {
  SnowflakeQueryResult,
  OperatorDetails,
  PlatformCharge,
  ReservationOverview,
  RiskOverview,
  MonthlySummary,
  OperatorMember,
  OperatorDriver,
  OperatorVehicle,
  OperatorEmailLog,
} from "./snowflake"

// Import clients for unified export
import { hubspot } from "./hubspot"
import { stripe } from "./stripe"
import { notion } from "./notion"
import { metabase } from "./metabase"
import { lago } from "./lago"
import { snowflake } from "./snowflake"

/**
 * Unified integrations client
 *
 * Provides access to all integration clients through a single object.
 */
export const integrations = {
  hubspot,
  stripe,
  notion,
  metabase,
  lago,
  snowflake,
}

/**
 * Check which integrations are configured
 */
export function getConfiguredIntegrations(): {
  hubspot: boolean
  stripe: boolean
  notion: boolean
  metabase: boolean
  lago: boolean
  snowflake: boolean
} {
  return {
    hubspot: !!process.env.HUBSPOT_ACCESS_TOKEN,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    notion: !!process.env.NOTION_API_KEY,
    metabase: !!(process.env.METABASE_URL && process.env.METABASE_API_KEY),
    lago: !!process.env.LAGO_API_KEY,
    snowflake: !!(process.env.METABASE_URL && process.env.METABASE_API_KEY), // Uses Metabase to query Snowflake
  }
}

/**
 * Get a list of missing integration configurations
 */
export function getMissingIntegrations(): string[] {
  const configured = getConfiguredIntegrations()
  const missing: string[] = []

  if (!configured.hubspot) missing.push("HUBSPOT_ACCESS_TOKEN")
  if (!configured.stripe) missing.push("STRIPE_SECRET_KEY")
  if (!configured.notion) missing.push("NOTION_API_KEY")
  if (!configured.metabase) {
    if (!process.env.METABASE_URL) missing.push("METABASE_URL")
    if (!process.env.METABASE_API_KEY) missing.push("METABASE_API_KEY")
  }
  if (!configured.lago) missing.push("LAGO_API_KEY")
  // Snowflake uses Metabase as backend, so same env vars needed
  if (!configured.snowflake && !configured.metabase) {
    // Already added METABASE_URL and METABASE_API_KEY above
  }

  return missing
}
