# Moovs Platform Overview

## What Moovs Is

Moovs is an all-in-one cloud-based software platform that enables transportation operators to manage reservations, dispatch, fleet operations, customer communications, payments, and business analytics from a unified system.

**Market Position:** Transportation software for operators (B2B SaaS)
**Primary Tagline:** "Your whole business. One platform."
**Core Promise:** "Easiest software to delight your customers, drive more sales, and automate your day-to-day"

### What Moovs Is NOT

- **NOT a ride-hailing marketplace** (like Uber/Lyft) — we're software for operators, not a dispatch service
- **NOT a broker** — Moovs provides software; operators run their own businesses
- **NOT an asset provider** — doesn't provide vehicles, drivers, or insurance

---

## Platform Architecture

Moovs consists of multiple applications across two main product lines:

### Black Car Platform (Core)

| Application | Who Uses It | Purpose |
|-------------|-------------|---------|
| **Operator App** | Dispatch, office staff, owners | Manage entire business operations |
| **Customer Portal** | Bookers, passengers | Request quotes, make bookings, track rides |
| **Driver App** | Drivers | Receive assignments, navigate, update trip status |
| **Passenger App** | Passengers | Track rides, view history, provide feedback ($499/mo add-on for branded version) |

### Shuttle Platform (Add-on, $499/mo+)

| Application | Who Uses It | Purpose |
|-------------|-------------|---------|
| **Shuttle Operator Dashboard** | Program managers, dispatchers | Route management, fleet tracking, analytics |
| **Shuttle Passenger Interface** | Riders | Route discovery, seat booking, real-time tracking |
| **Shuttle Driver App** | Shuttle drivers | Check-in, manifests, route execution |

---

## Core Operational Problems Moovs Solves

1. **Fragmented Operations** — Consolidates quoting, booking, dispatch, driver management, customer comms, and payments into a single platform
2. **Manual Reservation Management** — Automates booking workflows from quote request through payment and trip completion
3. **Driver Assignment & Communication** — Streamlines assignment, accept/decline workflows, location tracking, and automated notifications
4. **Customer Experience Gaps** — Provides real-time tracking, automated communications (SMS/email), and self-service booking
5. **Fleet Visibility** — Real-time vehicle and driver tracking, availability management, OOS propagation
6. **Payment & Billing Complexity** — Integrated payment processing (Stripe), invoicing, deposit management, driver payouts
7. **Affiliate Network Management** — Automates farm-in/farm-out workflows, revenue sharing, partner communication (replaces email/WhatsApp)

---

## Pricing Tiers

### Free Tier — $0/month
- 3 users, 10 vehicles, 10 drivers
- 1 promo code
- Credit card rate: 4% + $0.30
- **Best for:** Operators starting out or testing Moovs

### Standard Tier — $149/month (+$299 setup)
- 3 users, unlimited vehicles/drivers
- 1 promo code
- Credit card rate: 3.4% + $0.30
- **Best for:** Established operators with basic needs

### Pro Tier — $199/month (+$299 setup)
- 5 users, unlimited vehicles/drivers
- Unlimited promo codes
- Credit card rate: 3% + $0.30
- Access to premium add-ons
- **Best for:** Growing operators ready to drive more revenue

### Enterprise Tier — Starting at $499/month (custom)
- Unlimited users, vehicles, drivers
- Custom credit card rates
- Premium support, dedicated AM
- Access to Enterprise modules (AI Scheduler, Contact Center, etc.)
- White-glove migration
- **Best for:** Advanced operators with multiple departments/locations

### Add-ons (Separate Purchase)
| Add-on | Price | Notes |
|--------|-------|-------|
| Branded Passenger App | $499/month | Operator's logo, colors |
| Shuttle Platform | $499/month+ | Full shuttle operations |
| CRM Email Automation | $299/month | Advanced email workflows |
| Moovs Insights | $149/month | Advanced analytics |
| Google Tag Manager | $99/month | Tracking integration |

---

## Core Features (All Paid Tiers)

### 1. Reservation & Booking Management

**What it does:** Capture and manage all reservations in one place.

- **Customer Portal** — Branded online booking, embeddable widget
- **Quote creation** — Operator-side quote management, quote-to-reservation conversion
- **Booking vs. Passenger distinction** — Separate "Booking Contact" (payer) from "Passenger" (rider)
- **Automated reservations** — Instant booking when pricing is configured
- **Manual quote workflows** — For complex or custom pricing situations

**Key routes:** `/reservations`, `/quotes`, `/reservations/create`

### 2. Quoting & Pricing Engine

**What it does:** Configure automated pricing or send custom quotes.

- **Base Rate Automation** — Transfer rates (base + deadhead + per-mile), hourly rates (weekday/weekend, minimum hours)
- **Zone-based pricing** — Geographic rate zones
- **Manual override** — Disable automation per vehicle to force quote journey
- **Dynamic pricing** — Itemized quotes with deposits, tips, add-ons, upsells, concierge fees
- **Real-time availability** — Live vehicle availability surfaced during quoting
- **Sales Automation** — Automated follow-up texts to convert quotes to reservations

**Key routes:** `/settings/zone-pricing`, `/settings/dynamic-pricing`

**Note:** Base Rate Automation requires complete rate setup (Transfer AND Hourly). Incomplete setup forces quote journey.

### 3. Dispatch & Trip Management

**What it does:** Assign drivers and vehicles, track trips in real-time.

- **Unified dispatch grid** — Reservations, trip status, driver assignments in one view
- **Driver assignment** — Via reservation detail or dispatch list view
- **Accept/decline workflow** — Drivers receive SMS, respond via app or URL
- **Event duplication** — For multi-vehicle charters, shuttles, manifests
- **Trip status tracking** — Pending → Confirmed → In Progress → Completed

**Key routes:** `/dispatch`, `/driver-tracking`

### 4. Driver & Fleet Management

**What it does:** Manage vehicles, drivers, and availability.

**Vehicles:**
- Vehicle setup (name, capacity, license plate, VIN, color, features)
- Vehicle OOS (Out of Service) — Instant propagation to quotes, manifests, online availability
- Availability calendar — Prevent double-bookings

**Drivers:**
- Driver profiles — Only first name + cell phone required; additional fields optional
- Driver tracking — Real-time GPS location, ETAs
- Availability calendar — Drivers indicate available/unavailable dates
- Earnings tracking

**Key routes:** `/vehicles`, `/vehicles/categories`, `/settings/drivers`

### 5. Customer Communications

**What it does:** Keep passengers and drivers informed automatically.

- **Automated SMS/email** — Confirmations, reminders (configurable in Communication Settings)
- **Driver assignment notifications** — Automatic messages when driver assigned or accepts
- **Passenger updates** — Driver name, vehicle info (license plate, color), live ETAs
- **Manual messaging** — Text/email clients and drivers from Operator App

### 6. Payments & Billing

**What it does:** Process payments, manage invoices, pay drivers.

- **Stripe integration** — Credit card processing
- **Deposit management** — Percentage-based or custom amounts
- **Payment links** — Generate links for partial or full payment
- **Manual payment recording** — Cash, check, etc. (not processed through Moovs)
- **Invoicing** — Create invoices from completed trips
- **Driver payouts** — Payables section for processing driver payroll (weekly, bi-monthly, monthly, custom)

**Key routes:** `/invoices`, `/finances`, `/payables`

**Limitation:** Cannot create invoices until ALL trips in a reservation are closed.

### 7. Affiliate Network (Farm-outs)

**What it does:** Manage trips you send to or receive from other operators.

- **1,000+ partners** — Available in Moovs network
- **Farm-out trips** — Send overflow work to affiliates
- **Farm-in trips** — Receive work from affiliates
- **Revenue share automation** — Automated settlement calculations
- **GNET compatible** — Requires GNET registration and ID setup
- **LA Net** — In development (not yet available)

**Key routes:** `/affiliates`

### 8. Dashboard & Reporting

**What it does:** Understand business performance.

- **At-a-glance KPIs** — Total Reservations, Driver Payout, Total Quotes, Affiliate Payout
- **Reservations report** — Filter by date range, includes driver assignments (Column AK)
- **Download reports** — Export to CSV for Excel/Google Sheets

**Key routes:** `/dashboard`

### 9. Contact & Company Management (CRM)

**What it does:** Track customers and corporate accounts.

- **Contact database** — Passenger info, preferences, booking history
- **Company accounts** — Corporate clients with multiple bookers
- **Behavioral segmentation** — CRM built on actual booking behavior, not just contact info

**Key routes:** `/contacts`, `/companies`

**Note:** Advanced CRM features (email automation) available as $299/month add-on.

---

## Shuttle Platform Module ($499/mo+)

### Operator Dashboard
- Route template management (create, bulk generation, versioning)
- Real-time fleet tracking with conflict detection
- Driver assignment and availability tracking
- Performance analytics (ridership, on-time, capacity, revenue)

### Passenger Interface
- Route discovery and seat booking
- Real-time route tracking
- Multi-passenger booking
- Accessible vehicle options
- Add-ons (luggage, snowboard, etc.)

### Check-in & Manifests
- QR code or manual passenger check-in
- No-show handling
- Driver workflows: pre-trip (clock in), during-trip (navigation, check-in), post-trip (report, incidents)

### Program Manager / Executive View
- Real-time KPIs dashboard
- Historical analytics and trend analysis
- Compliance reporting
- Multi-route overview
- On-time performance, capacity utilization, satisfaction metrics

### Shuttle Enterprise Features
- Digital Wallet for corporate shuttles
- Bulk ticket purchases
- Multi-tenant architecture
- Role-based access control
- Enterprise SSO support

---

## Enterprise-Only Modules ($499/mo+)

### AI-Powered Driver Scheduler
- Create schedules in seconds
- Prevent overtime/double-bookings
- Automatic reassignment on callouts

### Moovs Contact Center (AI-Powered)
- Automate inbound/outbound phone calls and texts
- AI call handling for 24/7 coverage
- Route messages to correct team, trigger workflows
- 100 calls/month free for pilots

### AI Bulk Trip Import
- Upload CSV, PDF, Excel, email content
- Auto-create trips from manifests
- AI intake for airline emails → trips

### Enterprise Integrations
- QuickBooks real-time sync
- FlightAware flight monitoring
- Samsara vehicle tracking (live location, speed, alerts)
- Zapier for custom workflows
- API-ready for custom integrations

### Enterprise Dashboards
- Revenue, utilization, on-time %, dispatcher performance
- Unified dispatch grid with flight monitoring, SMS, driver/vehicle tracking

### Enterprise Migration
- 3-step migration: CSV Export → Sandbox Import → White-Glove Go-Live
- Parallel run for 1-2 weeks
- Dedicated Account Manager
- Team training, unlimited onboarding calls
- Driver Adoption Guarantee: "65% lower training time"

---

## Integrations

| Integration | Purpose | Availability |
|-------------|---------|--------------|
| **Stripe** | Payment processing, payouts | All tiers |
| **Google Maps** | Routing, ETAs, distance | All tiers |
| **Twilio** | SMS notifications | All tiers |
| **GNET** | Affiliate network | All tiers |
| **FlightAware** | Flight tracking | Enterprise |
| **QuickBooks** | Accounting sync | Enterprise |
| **Samsara** | Vehicle tracking | Enterprise |
| **Zapier** | Custom workflows | Enterprise |

---

## User Roles

### Operator Roles
| Role | Primary Interface | Key Responsibilities |
|------|-------------------|---------------------|
| Dispatcher | Operator App (Dispatch) | Create reservations, assign drivers, monitor trips |
| Admin | Operator App (Settings) | Vehicle/driver setup, rate configuration, payroll |
| Sales | Operator App | Create quotes, manage accounts, sales automation |
| Program Manager | Shuttle Dashboard | Monitor routes, review KPIs, compliance |

### Driver Roles
| Role | Primary Interface | Key Responsibilities |
|------|-------------------|---------------------|
| Standard Driver | Driver App | Accept/decline trips, navigate, update status |
| Shuttle Driver | Shuttle Driver App | Check-in passengers, execute routes, report incidents |

### Customer Roles
| Role | Primary Interface | Key Responsibilities |
|------|-------------------|---------------------|
| Booking Contact | Customer Portal | Make reservations, manage payments |
| Passenger | Passenger App | Track rides, view trip details, provide feedback |
| Corporate User | Corporate Portal | Manage recurring bookings, bulk purchases |

---

## Technical Architecture

- **Backend:** Node.js/Express, PostgreSQL, hosted on AWS
- **Operator Portal:** React (Material-UI)
- **Customer Portal:** React
- **Driver App:** React Native (iOS/Android)
- **Payments:** Stripe Connect

---

## Feature Flags

Some features are controlled by LaunchDarkly:

| Flag | Feature |
|------|---------|
| `shuttleRevamp` | New shuttle management UI |
| `enablePocketflowsCrm` | CRM features |
| `aiReservationUpload` | AI-powered reservation import |
| `enableAutoScheduler` | Automatic driver scheduling |

---

## Key Differentiators

### vs. Generic Software (spreadsheets, QuickBooks)
- Purpose-built for ground transportation workflow
- Industry-specific features (flight tracking, farm-outs, driver management)
- Connected end-to-end (booking → dispatch → billing)

### vs. Ride-hail Apps (Uber, Lyft)
- Operators keep their brand and customer relationships
- Works for scheduled/reserved rides, not just on-demand
- Supports corporate accounts, invoicing, complex pricing

### vs. Legacy Transportation Software (Limo Anywhere, FASTTRAK)
- Modern, mobile-first interface
- All-in-one platform (no patchwork of tools)
- No per-trip fees — flat monthly pricing
- AI-powered features (Enterprise tier)

---

## Product Boundaries

### What Moovs Does NOT Do
- Vehicle maintenance tracking
- Fuel management
- Employee HR management (beyond driver profiles)
- Insurance management
- Detailed accounting/bookkeeping (beyond invoicing and payments)
- Multi-language support (not mentioned)
- White-label reselling

### Known Limitations
1. **Invoicing:** Cannot create invoices until ALL trips in a reservation are closed
2. **Driver search:** Cannot search trips by driver in operator interface (workaround: export report and filter)
3. **Branded Passenger App:** Requires $499/month add-on
4. **Base Rate Automation:** Requires complete rate setup; incomplete setup forces quote journey
5. **Reservation cutoff:** If pickup time is inside cutoff period, forces quote journey even with automation enabled

---

## When Writing About Moovs

1. **Lead with the operator's problem**, not the feature
2. **Be specific** — "see all trips for today" not "manage operations"
3. **Show the workflow** — booking → dispatch → completion → payment
4. **Acknowledge the industry** — we know ground transportation, not just "software"
5. **Match tier to audience** — don't promise Enterprise features to SMB prospects
6. **Use correct terminology** — "Booking Contact" vs "Passenger", "farm-out" not "outsource"

---

*Last Updated: January 2026*
*Source: Evidence-Based Internal Source of Truth*
