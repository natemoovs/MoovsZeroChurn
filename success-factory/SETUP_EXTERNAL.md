# External Setup Guide

This document lists everything you need to configure outside of this codebase.

---

## 1. Vercel Environment Variables

Add these to your Vercel project settings (Settings → Environment Variables):

### Required Now
```
VERCEL_AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
```

### Required for New Features
```
# Stripe Webhooks (for real-time payment alerts)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# HubSpot Webhooks (for deal/contact updates)
HUBSPOT_WEBHOOK_SECRET=your-hubspot-webhook-secret

# Intercom Webhooks (for chat analysis)
INTERCOM_WEBHOOK_SECRET=your-intercom-webhook-secret

# Email Sequences (choose one)
SENDGRID_API_KEY=SG.xxxxx
# OR
RESEND_API_KEY=re_xxxxx
```

---

## 2. Stripe Webhook Configuration

### Setup Steps

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://your-app.vercel.app/api/webhooks/stripe
   ```
4. Select events to listen for:
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.failed`
   - `charge.dispute.created`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add to Vercel as `STRIPE_WEBHOOK_SECRET`

### Testing Locally
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger invoice.payment_failed
```

---

## 3. HubSpot Webhook Configuration

### Setup Steps

1. Go to [HubSpot → Settings → Integrations → Private Apps](https://app.hubspot.com/private-apps/)
2. Select your app or create one
3. Go to "Webhooks" tab
4. Add subscription for:
   - **Companies**: `company.propertyChange` (for health score updates)
   - **Deals**: `deal.propertyChange`, `deal.creation`
   - **Contacts**: `contact.propertyChange`
5. Set webhook URL:
   ```
   https://your-app.vercel.app/api/webhooks/hubspot
   ```
6. Copy the webhook secret
7. Add to Vercel as `HUBSPOT_WEBHOOK_SECRET`

---

## 4. Email Service Setup (SendGrid)

### Setup Steps

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Go to Settings → API Keys
3. Create API key with "Mail Send" permission
4. Add to Vercel as `SENDGRID_API_KEY`
5. Verify your sending domain:
   - Settings → Sender Authentication
   - Add DNS records to your domain

### Alternative: Resend

1. Create account at [resend.com](https://resend.com)
2. Get API key from dashboard
3. Add to Vercel as `RESEND_API_KEY`
4. Verify your domain

---

## 5. Conversation Intelligence

**Your conversations are already synced via HubSpot and Intercom!**

The AI automatically analyzes synced conversations to extract:
- Sentiment (positive/negative/neutral)
- Action items → auto-created as tasks
- Risks → flagged for follow-up
- Expansion opportunities → logged for CSM review

### Intercom Webhook (for real-time chat analysis)

1. Go to Intercom → Settings → Developers → Webhooks
2. Add webhook URL:
   ```
   https://your-app.vercel.app/api/webhooks/intercom
   ```
3. Select topics: `conversation.closed`, `conversation.rating.added`
4. Copy webhook secret and add to Vercel as `INTERCOM_WEBHOOK_SECRET`

---

## 6. Inngest Setup (Event Processing)

Inngest should already be configured, but verify:

1. Go to [inngest.com/dashboard](https://inngest.com/dashboard)
2. Ensure your app is connected
3. Check that events are flowing

### Local Development
```bash
# Run Inngest dev server
npx inngest-cli@latest dev
```

---

## 7. Cron Jobs (Vercel)

The following cron jobs need to be enabled in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/agents/health-monitor",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/agents/expansion-detector",
      "schedule": "0 7 * * 1"
    },
    {
      "path": "/api/agents/revenue-forecast",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/api/agents/renewal-risk",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

---

## 8. Database Migrations

After pulling new code, run:

```bash
cd success-factory
npx prisma db push
```

---

## Quick Checklist

- [ ] `VERCEL_AI_GATEWAY_API_KEY` set in Vercel
- [ ] Stripe webhook created and `STRIPE_WEBHOOK_SECRET` set
- [ ] HubSpot webhook created and `HUBSPOT_WEBHOOK_SECRET` set
- [ ] SendGrid/Resend API key set (for email sequences)
- [ ] Cron jobs configured in vercel.json
- [ ] Database migrated with `prisma db push`

---

## Support

If you run into issues:
- Stripe webhooks: Check Stripe dashboard → Webhooks → Recent deliveries
- HubSpot webhooks: Check HubSpot → Settings → Webhooks → Activity
- Inngest events: Check inngest.com dashboard for event logs
- Vercel logs: Check Vercel dashboard → Deployments → Functions
