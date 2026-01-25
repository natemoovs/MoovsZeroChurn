/**
 * CSM Communication Templates
 *
 * Email and message templates following Moovs voice guidelines.
 * Tone: Knowledgeable Peer - understands ground transportation, not generic SaaS.
 *
 * Writing Principles:
 * - Practical over promotional
 * - Specific over vague
 * - Operator language (trip, passenger, driver, vehicle)
 * - Confident, not arrogant
 */

import { CustomerSegment } from "./icp"

export type CommunicationType =
  | "check_in"
  | "health_decline"
  | "activation"
  | "renewal"
  | "expansion"
  | "payment_issue"
  | "feature_adoption"
  | "win_back"

export interface CommunicationTemplate {
  type: CommunicationType
  subject: string
  body: string
  applicableSegments: CustomerSegment[]
  tone: string
  callToAction: string
}

// Operator language mapping (from voice guidelines)
export const OPERATOR_LANGUAGE: Record<string, string> = {
  booking: "trip",
  journey: "trip",
  order: "reservation",
  customer: "passenger",
  client: "passenger",
  user: "passenger",
  chauffeur: "driver",
  asset: "vehicle",
  unit: "vehicle",
  "operations management": "dispatch",
  outsource: "farm out",
  subcontract: "farm out",
}

// Words to AVOID (from voice guidelines)
export const AVOID_WORDS = [
  "revolutionary",
  "game-changing",
  "disruptive",
  "best in class",
  "world-class",
  "industry-leading",
  "leverage",
  "utilize",
  "optimize",
  "seamless",
  "frictionless",
]

// Words to USE (from voice guidelines)
export const PREFERRED_WORDS = [
  "easy to use",
  "simple",
  "straightforward",
  "modern",
  "up-to-date",
  "always improving",
  "automate",
  "save time",
  "focus on growing",
  "all-in-one",
  "reliable",
  "real-time",
]

/**
 * Communication templates for different scenarios
 */
export const COMMUNICATION_TEMPLATES: CommunicationTemplate[] = [
  // CHECK-IN TEMPLATES
  {
    type: "check_in",
    subject: "Quick check-in from Moovs",
    body: `Hi {{firstName}},

Just wanted to see how things are going with your operation.

I noticed {{observation}} and wanted to make sure everything's running smoothly. If you're hitting any roadblocks or have questions, I'm here to help.

How are things looking on your end?

{{signature}}`,
    applicableSegments: ["smb", "mid_market", "enterprise"],
    tone: "Conversational, helpful",
    callToAction: "Reply or schedule a call",
  },

  // HEALTH DECLINE TEMPLATE
  {
    type: "health_decline",
    subject: "Checking in - noticed a few things",
    body: `Hi {{firstName}},

I've been looking at your account and noticed {{specificObservation}}.

Wanted to reach out before this becomes a bigger issue. Often when we see this pattern, it means {{interpretation}}.

Are you experiencing any challenges I can help with? Sometimes a quick call to walk through your setup can save a lot of time.

Here if you need anything.

{{signature}}`,
    applicableSegments: ["smb", "mid_market", "enterprise"],
    tone: "Concerned, proactive",
    callToAction: "Schedule a quick call",
  },

  // ACTIVATION TEMPLATE (SMB focused - 44.7% start free)
  {
    type: "activation",
    subject: "Getting the most out of your Moovs account",
    body: `Hi {{firstName}},

I saw you signed up for Moovs {{daysAgo}} days ago. Wanted to share a few quick wins that most operators find helpful in the first week:

1. **Set up online booking** - Takes about 10 minutes, and passengers can book directly from your website
2. **Add your first vehicle** - Just the basics: name, type, and capacity
3. **Send a test confirmation** - See what your passengers will receive

Most operators who do these three things in their first week save 5+ hours a week within a month.

Want me to walk you through any of these? I'm free {{availabilityWindow}}.

{{signature}}`,
    applicableSegments: ["free", "smb"],
    tone: "Helpful, encouraging",
    callToAction: "Schedule onboarding call",
  },

  // RENEWAL TEMPLATE
  {
    type: "renewal",
    subject: "Your Moovs renewal is coming up",
    body: `Hi {{firstName}},

Your Moovs subscription renews on {{renewalDate}}, so I wanted to check in.

Over the past year, you've:
{{achievements}}

Is there anything you'd like to adjust before renewal? If you're looking to expand your operation, I'd be happy to discuss options that might work better for where you're headed.

Let me know how you'd like to proceed.

{{signature}}`,
    applicableSegments: ["smb", "mid_market", "enterprise"],
    tone: "Professional, appreciative",
    callToAction: "Confirm renewal or discuss changes",
  },

  // EXPANSION TEMPLATE
  {
    type: "expansion",
    subject: "Your operation is growing - let's make sure Moovs keeps up",
    body: `Hi {{firstName}},

Congrats on the growth! I noticed {{growthSignal}}, which tells me your operation is scaling nicely.

A few operators at your stage have found these features helpful:
{{relevantFeatures}}

Would it be worth a quick call to see if any of these would save you time as you scale? I can show you exactly what the setup looks like.

{{signature}}`,
    applicableSegments: ["smb", "mid_market"],
    tone: "Congratulatory, consultative",
    callToAction: "Schedule expansion discussion",
  },

  // PAYMENT ISSUE TEMPLATE
  {
    type: "payment_issue",
    subject: "Quick note about your Moovs payment",
    body: `Hi {{firstName}},

Just a heads up - we weren't able to process your payment on {{paymentDate}}. This sometimes happens with expired cards or bank security holds.

To update your payment method:
1. Log into your Moovs account
2. Go to Settings > Billing
3. Update your card info

If there's anything going on with your account or you need to discuss your subscription, just let me know. Happy to work something out.

{{signature}}`,
    applicableSegments: ["smb", "mid_market", "enterprise"],
    tone: "Understanding, matter-of-fact",
    callToAction: "Update payment method",
  },

  // FEATURE ADOPTION TEMPLATE
  {
    type: "feature_adoption",
    subject: "A feature you might not be using",
    body: `Hi {{firstName}},

I noticed you haven't tried {{featureName}} yet. Operators similar to yours who use it typically see {{benefit}}.

Here's a quick overview:
{{featureDescription}}

If you want, I can show you how to set it up in about 10 minutes. Just reply and I'll send over some times.

{{signature}}`,
    applicableSegments: ["smb", "mid_market", "enterprise"],
    tone: "Informative, helpful",
    callToAction: "Schedule feature walkthrough",
  },

  // WIN BACK TEMPLATE
  {
    type: "win_back",
    subject: "We miss you at Moovs",
    body: `Hi {{firstName}},

I noticed it's been a while since you've been active in Moovs. Wanted to reach out and see what's going on.

Since you last logged in, we've added:
{{newFeatures}}

If you ran into issues before, I'd love to hear about them. We're always improving based on operator feedback.

Would you be open to a quick call to see if Moovs can work better for your operation now?

{{signature}}`,
    applicableSegments: ["smb", "mid_market"],
    tone: "Curious, non-pushy",
    callToAction: "Schedule re-engagement call",
  },
]

/**
 * Get template for a specific communication type and segment
 */
export function getTemplate(
  type: CommunicationType,
  segment: CustomerSegment
): CommunicationTemplate | null {
  return (
    COMMUNICATION_TEMPLATES.find(
      (t) => t.type === type && t.applicableSegments.includes(segment)
    ) || null
  )
}

/**
 * Fill template with customer data
 */
export function fillTemplate(
  template: CommunicationTemplate,
  data: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject
  let body = template.body

  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`
    subject = subject.replace(new RegExp(placeholder, "g"), value)
    body = body.replace(new RegExp(placeholder, "g"), value)
  }

  return { subject, body }
}

/**
 * Generate communication based on playbook trigger
 */
export function generatePlaybookCommunication(
  triggerType: string,
  segment: CustomerSegment,
  customerData: {
    firstName: string
    companyName: string
    observation?: string
    daysAgo?: number
    renewalDate?: string
    achievements?: string
    growthSignal?: string
    paymentDate?: string
    featureName?: string
    signature: string
  }
): { subject: string; body: string; type: CommunicationType } | null {
  // Map trigger type to communication type
  const triggerToCommunication: Record<string, CommunicationType> = {
    health_critical: "health_decline",
    health_declined: "health_decline",
    usage_dropped: "check_in",
    onboarding_stalled: "activation",
    payment_failed: "payment_issue",
    renewal_approaching: "renewal",
    expansion_ready: "expansion",
    churn_risk: "health_decline",
  }

  const communicationType = triggerToCommunication[triggerType]
  if (!communicationType) return null

  const template = getTemplate(communicationType, segment)
  if (!template) return null

  const filled = fillTemplate(template, {
    firstName: customerData.firstName,
    companyName: customerData.companyName,
    observation: customerData.observation || "some changes in your usage",
    specificObservation: customerData.observation || "activity has dropped recently",
    interpretation: "there might be something we can help with",
    daysAgo: String(customerData.daysAgo || 7),
    renewalDate: customerData.renewalDate || "soon",
    achievements:
      customerData.achievements || "• Managed trips efficiently\n• Grown your operation",
    growthSignal: customerData.growthSignal || "increased trip volume",
    paymentDate: customerData.paymentDate || "recently",
    featureName: customerData.featureName || "this feature",
    availabilityWindow: "Tuesday or Thursday afternoon",
    relevantFeatures: "• Automated dispatch\n• Customer portal\n• Driver app",
    featureDescription: "It automates part of your workflow that's currently manual.",
    benefit: "30% time savings",
    newFeatures: "• Better dispatch\n• Improved reporting\n• Mobile updates",
    signature: customerData.signature,
  })

  return {
    ...filled,
    type: communicationType,
  }
}

/**
 * Validate text against voice guidelines
 */
export function validateVoice(text: string): {
  isValid: boolean
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []
  const textLower = text.toLowerCase()

  // Check for words to avoid
  for (const word of AVOID_WORDS) {
    if (textLower.includes(word)) {
      issues.push(`Avoid using "${word}" - too buzzwordy`)
    }
  }

  // Check for non-operator language
  for (const [avoid, use] of Object.entries(OPERATOR_LANGUAGE)) {
    if (textLower.includes(avoid)) {
      suggestions.push(`Consider using "${use}" instead of "${avoid}"`)
    }
  }

  // Check for overly long sentences (operators are busy)
  const sentences = text.split(/[.!?]+/)
  const longSentences = sentences.filter((s) => s.split(" ").length > 30)
  if (longSentences.length > 0) {
    issues.push("Some sentences are too long - operators are busy, get to the point")
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  }
}

/**
 * Get proof points for a segment
 */
export function getProofPoints(segment: CustomerSegment): string[] {
  // From voice guidelines
  const baseProofPoints = [
    "1,000+ transportation businesses trust Moovs",
    "4.9-star rating across review platforms",
    "96% User Satisfaction Rating",
  ]

  const segmentProofPoints: Record<CustomerSegment, string[]> = {
    smb: [
      '"Went from 3-5 trips per day to 10-15 on average" - Josue P.',
      '"Save hours a day now" - Tom D., Chauffeur Owner',
      '"Was able to buy another vehicle because of Moovs" - Rob D.',
    ],
    mid_market: [
      "10 hours saved per week - Rainbow Road Transport",
      "155% increase in website traffic - Empowered Limousine",
      "50% increase in profits - Empowered Limousine",
    ],
    enterprise: [
      "98% client retention rate after 6 months - James L.",
      "200% more online bookings - Ride with Lusso",
      "Operators managing 3 to 500+ vehicles",
    ],
    free: [
      "Set up in under 30 minutes",
      "No credit card required to start",
      "Scale from 1 to 50+ vehicles",
    ],
    unknown: baseProofPoints,
  }

  return [...baseProofPoints, ...(segmentProofPoints[segment] || [])]
}
