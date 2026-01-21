# ZeroChurn Factory Enhancement Plan

> Goal: Build the best CSM/ZeroChurn tool in the world with team efficiencies and autonomous AI agents

---

## Current State

### What We Have (ZeroChurn)
- Health score tracking (green/yellow/red)
- HubSpot sync for customer data
- NPS surveys via email
- AI churn predictions (Claude)
- Playbook-triggered tasks
- Slack/email alerts

### What We Gained (moovs-factory)

| Asset | Value for CSM |
|-------|---------------|
| **MCPs** | HubSpot, Notion, Slack, Metabase, Stripe - real-time data |
| **Customer Research Skill** | Deep 360° account analysis methodology |
| **Problem Skill** | Structured churn reason documentation |
| **Tickets Skill** | Track at-risk accounts in Notion |
| **Knowledge Base** | Customer segments, product context |
| **Notion Scripts** | Bypass MCP limitations, create tickets/tasks |

---

## The Plan: 3 Phases

### Phase 1: Enhanced Data Integration ✅ COMPLETE
**Goal:** Connect real data sources for smarter insights

- [x] **Fix HubSpot Sync** - Fixed env variable naming (HUBSPOT_ACCESS_TOKEN)
- [x] **Metabase Integration** - Query actual usage data (reservations, trips, revenue)
- [x] **Stripe Integration** - Payment health, failed charges, subscriptions
- [x] **Notion Integration** - CSM tasks API with create/list capabilities
- [x] **Customer 360 Endpoint** - Unified view combining all data sources

**New Capabilities:**
- Real usage trends (not just "last login")
- Payment failure early warning
- CSM task tracking with full context
- Health scoring from all data sources combined

---

### Phase 2: AI-Powered Customer Intelligence
**Goal:** Proactive churn detection and intervention

1. **Deep Customer Research Agent**
   - Adapts the `/customer-research` skill for CSM
   - Pulls HubSpot + Metabase + Stripe into unified view
   - Generates health reports before QBRs

2. **Churn Reason Documentation**
   - Adapts the `/problem` skill methodology
   - When account churns, capture WHY (structured interview)
   - Feed back into AI model for pattern learning

3. **Smart Alert Prioritization**
   - Not just "red health" alerts
   - Combine: payment failures + usage drop + renewal proximity
   - Score urgency, suggest intervention type

---

### Phase 3: Autonomous AI Agents
**Goal:** AI that works while you sleep

| Agent | Trigger | Action |
|-------|---------|--------|
| **Health Monitor** | Daily cron | Scan all accounts, flag changes, create tasks |
| **Pre-QBR Prep** | 7 days before QBR | Generate account brief with talking points |
| **Renewal Risk** | 60 days before renewal | Deep analysis + intervention playbook |
| **Payment Recovery** | Failed charge | Auto-outreach sequence + escalation |
| **Win-Back** | Account churned | 30/60/90 day check-in sequence |

**How Agents Work:**
```
[Scheduled Trigger or Event]
    ↓
[Agent pulls data via MCPs]
    ↓
[Claude analyzes, decides action]
    ↓
[Creates Notion task / Sends Slack alert / Triggers email]
    ↓
[Logs outcome for learning]
```

---

## Architecture Vision

```
┌─────────────────────────────────────────────────────────────┐
│                    ZeroChurn Factory                         │
├─────────────────────────────────────────────────────────────┤
│  DATA LAYER (MCPs)                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ HubSpot │ │Metabase │ │ Stripe  │ │ Notion  │           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       └──────────┬┴──────────┬┴──────────┬┘                │
│                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              INTELLIGENCE LAYER (Claude)             │   │
│  │  • Health Scoring    • Churn Prediction              │   │
│  │  • Pattern Detection • Intervention Recommendations  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AGENT LAYER (Autonomous)                │   │
│  │  • Health Monitor    • Renewal Risk                  │   │
│  │  • QBR Prep          • Win-Back                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ACTION LAYER                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│  │  │ Slack   │ │ Email   │ │ Notion  │ │Dashboard│    │   │
│  │  │ Alerts  │ │Sequences│ │ Tasks   │ │   UI    │    │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Progress Log

### 2026-01-21
- [x] Synced moovs-factory upstream (MCPs, skills, knowledge)
- [x] Created enhancement plan
- [x] Phase 1: Fixed HubSpot env variable naming
- [x] Phase 1: Metabase integration (already existed)
- [x] Phase 1: Stripe integration - Added to account detail with payment health
- [x] Phase 1: Notion integration - Created tasks API route
- [x] Phase 1: Customer 360 endpoint - Unified view from all sources
- [x] Fixed instrumentation.ts for all runtimes

---

## Key Files

- **MCP Config:** `.mcp.json`
- **Skills:** `.claude/skills/`
- **Knowledge:** `knowledge/`
- **Scripts:** `scripts/`
- **API Routes:** `app/api/`
