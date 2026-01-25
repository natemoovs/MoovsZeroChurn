# Shuttle Platform ICP - Base

Core definition and shared elements across all Shuttle Platform segments. For segment-specific details, reference the appropriate variation document.

---

## Quick Reference

### Key Distinction from Black Car

| Attribute     | Black Car                     | Shuttle Platform               |
| ------------- | ----------------------------- | ------------------------------ |
| Booking Unit  | Entire vehicle                | Individual seat                |
| Route Type    | Point-to-point, custom        | Fixed routes with timetables   |
| Customer Type | Executives, VIPs, individuals | Commuters, students, employees |
| Pricing Model | Hourly, one-way, round-trip   | Per-seat or program-based      |
| Key Pain      | Manual dispatch               | Lack of rider visibility       |

**Quick Test:** "Do passengers book the entire vehicle or individual seats?"

- Entire vehicle → Black Car
- Individual seats → Shuttle Platform

### Three Variations

| Variation                     | Use When                    | Primary Driver         | Sales Cycle      |
| ----------------------------- | --------------------------- | ---------------------- | ---------------- |
| [University](./university.md) | Campus, students            | Student experience     | 4-6 months (RFP) |
| [Corporate](./corporate.md)   | Employees, HR               | Retention & ROI        | 3-4 months       |
| [Operator](./operator.md)     | Contracts, multiple clients | Win contracts, margins | 2-3 months       |

### Top 8 Shared Pain Points

1. **Route & schedule management** - Updating multiple systems manually
2. **Capacity management** - Overcrowding, no seat visibility
3. **No real-time visibility** - Riders don't know when shuttle arrives
4. **Reporting gaps** - Manual compilation for stakeholders
5. **Rider communication** - Hard to notify all riders of changes
6. **Driver coordination** - No automated dispatch or route guidance
7. **Scaling challenges** - Adding routes is operationally complex
8. **Technology fragmentation** - Multiple disconnected tools

### Core Messaging

- "Complete shuttle platform for your entire program"
- "Real-time visibility for every rider"
- "Publish routes once, update everywhere"
- "Multi-stakeholder dashboards"

### Messaging Don'ts

- Never use "private vehicles," "VIP service," "chauffeur"
- Never use "one-way bookings" or "point-to-point dispatch"
- Never promise "DIY solution" or "instant setup"

---

## Segment Definition

### What Shuttle Platform Means

Shuttle platform customers run fixed-route, recurring transportation programs where passengers book individual seats, not entire vehicles. These are scheduled, predictable routes (commuter shuttles, campus loops, airport routes) with multiple riders per vehicle.

**Service Model Characteristics:**

- Fixed or semi-fixed routes with multiple stops
- Published timetables and schedules
- Per-seat bookings (not private vehicle rentals)
- Shared transportation (multiple passengers per vehicle)
- Recurring, program-based operations (not ad-hoc)

**Common Service Types:**

- Campus shuttle loops (university transportation)
- Employee commuter routes (corporate shuttles)
- Airport shuttle services (hotel ↔ airport)
- Regional/public transit routes
- Event shuttle programs (conferences, venues)

---

## Core Pain Points (Shared Across All Segments)

### 1. Route & Schedule Management Complexity

- Publishing and updating routes manually across multiple systems
- Route changes require updating multiple platforms (website, apps, signage)
- Difficulty optimizing routes for efficiency
- No easy way to communicate schedule changes to all riders
- Time-consuming to manage multiple routes with different timetables

### 2. Capacity Management & Overbooking

- No real-time visibility into seat availability
- Risk of overcrowded vehicles (safety and compliance issues)
- Passengers left behind at stops due to full shuttles
- No reservation system to control capacity
- Inability to predict demand accurately

### 3. Lack of Real-Time Visibility

- Riders don't know when shuttle will arrive at their stop
- No live tracking of vehicle locations
- Dispatchers can't see fleet in real-time
- Poor rider experience leads to complaints and decreased ridership
- Difficulty managing service disruptions or delays

### 4. Multi-Stakeholder Reporting Gaps

- Program managers need ridership analytics
- Financial stakeholders need cost-per-ride and utilization metrics
- Administrators need compliance and safety reporting
- Clients (if applicable) need performance data
- Manual compilation of reports is time-consuming and error-prone

### 5. Rider Communication Challenges

- Difficult to notify all riders of delays, route changes, or cancellations
- No centralized passenger app for communication
- Reliance on email/SMS for all updates (manual and slow)
- Poor communication leads to low rider satisfaction
- Missed opportunities to gather rider feedback

### 6. Driver & Dispatch Coordination

- Drivers need route guidance and detailed stop lists
- No automated dispatch assignments for shifts
- Difficulty managing driver schedules and compliance
- Poor coordination leads to missed stops or late departures
- Training complexity with multiple tools/systems

### 7. Program Growth & Scaling Challenges

- Adding new routes is operationally complex
- Expanding to new locations requires system overhaul
- Difficulty demonstrating program ROI to justify budget increases
- Legacy systems don't scale with ridership growth
- No data to support route optimization

### 8. Technology Fragmentation

- Using multiple disconnected tools (dispatch, rider app, reporting)
- Manual data transfer between systems
- No single source of truth for program data
- Integration challenges with existing systems
- High total cost of ownership

---

## Core Technographic Profile

### Current Technology Stack (Common Patterns)

**Legacy Shuttle Software:**

- TransLoc, Routematch, older dispatch systems
- Limited real-time tracking capabilities
- Poor mobile experience
- Outdated interfaces

**Patchwork Solutions:**

- Route planning: Google Maps, manual spreadsheets
- Rider communication: Email lists, SMS services
- Tracking: Basic GPS units (no rider-facing tracking)
- Reporting: Manual Excel compilation
- Separate tools for dispatch, rider apps, and analytics

### Technology Needs (Universal)

**Must-Have Capabilities:**

1. Real-time tracking (for riders and dispatchers)
2. Capacity management (seat counts and reservations)
3. Route and schedule publishing (centralized, easy updates)
4. Passenger mobile app (iOS/Android)
5. Driver mobile app (route guidance, stop lists)
6. Multi-stakeholder dashboards (customizable views)
7. Automated rider notifications (delays, changes)
8. Program analytics and reporting

**Integration Requirements:**

- Campus/corporate systems (SSO, employee directories)
- Payment processing (if applicable)
- Mapping services
- Communication tools (email, SMS)
- Calendar systems

---

## Core Product Capabilities & Value Propositions

### Moovs Shuttle Platform Core Features

**1. Real-Time Visibility for All Stakeholders**

- Live vehicle tracking on rider app
- ETAs for each stop
- Dispatcher view of entire fleet
- Historical route playback

**2. Capacity Management**

- Real-time seat count tracking
- Reservation system (if needed)
- Overbooking prevention
- Demand forecasting tools

**3. Route & Schedule Publishing**

- Publish routes and timetables once
- Update everywhere instantly (app, web, dashboards)
- Route optimization tools
- Schedule templates for recurring patterns

**4. Multi-App Ecosystem**

- Passenger App: Route maps, live tracking, ETAs, trip history
- Driver App: Route guidance, stop lists, navigation, compliance
- Operator Dashboard: Fleet management, dispatch, analytics
- Client Dashboard: Program visibility, reporting, KPIs

**5. Automated Communication**

- Push notifications for delays or changes
- Scheduled rider updates
- In-app messaging
- Bulk communication tools

**6. Program Analytics & Reporting**

- Ridership metrics (daily, weekly, monthly)
- Utilization rates (passengers per vehicle, cost per ride)
- On-time performance tracking
- Route efficiency analysis
- Custom reports for stakeholders

---

## Universal Disqualifiers (DO NOT PURSUE)

**Hard Disqualifiers Across All Shuttle Segments:**

- Private vehicle/black car services (wrong segment → Black Car ICP)
- On-demand ride-hail services (not fixed-route programs)
- Ad-hoc charter services (not recurring programs)
- Single-vehicle operations (too small, insufficient scale)
- Organizations wanting DIY tools with no implementation support
- Programs that don't value real-time visibility or capacity management

---

## Success Profile (Universal Indicators)

### Retention Indicators

- Multi-year program commitments or contracts
- Growing ridership trends over time
- Multiple routes or service areas
- Strong rider satisfaction scores (>4.0/5.0)
- Active stakeholder engagement
- Budget allocated for program maintenance and expansion

### Expansion Potential

- Adding new routes or service areas
- Expanding to additional locations
- Increasing service frequency
- Service improvements (basic tracking → reservations → advanced analytics)
- New program types (adding late-night routes, special events)

### Lifetime Value Drivers

- High retention (shuttle programs rarely churn once established)
- Annual contract renewals with CPI increases
- Route/fleet expansion over time
- Module upsells (advanced analytics, integrations, white-label)
- Referrals to peer organizations
- Case study and testimonial willingness

---

## Core Value Propositions

### Primary Value Prop

"Run reliable, efficient shuttle programs with real-time visibility for riders, drivers, and program managers — all on one platform."

### Supporting Value Props

**For Riders:**

- Know exactly when the shuttle arrives (live ETAs)
- See route maps and service updates
- Book seats in advance (if capacity-controlled)
- Provide feedback easily

**For Program Managers:**

- Real-time fleet visibility
- Capacity management and overbooking prevention
- Route optimization and planning
- Automated rider communication
- Comprehensive program analytics

**For Drivers:**

- Simple route guidance
- Clear stop lists and instructions
- One-tap trip management
- Built-in navigation

**For Administrators/Clients:**

- Program performance dashboards
- Ridership and utilization metrics
- Cost-per-ride analytics
- Compliance and safety reporting
- Proof of service delivery

---

## General GTM Motion

### Sales Approach (Universal Elements)

- Demo Required: Yes - must show rider experience + operator tools
- Pilot Programs Common: Test with one route or location first
- Implementation Phase: 2-6 weeks (varies by program size)
- Contract Type: Annual agreements, often aligned with fiscal/academic year

### Common Evaluation Process

1. **Discovery:** Understand current pain points and program structure
2. **Demo:** Show passenger app, driver app, and operator dashboard
3. **Pilot:** Run one route or location for 4-8 weeks
4. **Evaluation:** Review ridership data, feedback, and performance
5. **Full Rollout:** Scale to all routes and locations

### Pricing Model (General)

- Starting at: $499/month
- Pricing drivers: Number of vehicles, routes, riders, locations
- Common add-ons: Advanced analytics, white-label, integrations
- Contract length: Typically 12-month minimum

---

## Integration with Black Car ICP

### Clear Boundary Rules

**Shuttle Platform customers are NOT:**

- Black car operators (even if they have some fixed routes)
- Limo/sedan services (private vehicle bookings)
- Executive transport services (VIP, private)

**Shuttle Platform customers ARE:**

- Running fixed-route programs with seat-level bookings
- Serving commuters, students, employees (not private VIPs)
- Operating scheduled, recurring transportation (not on-demand)

### If Unclear Which ICP Applies

1. Ask: "Do passengers book the entire vehicle or individual seats?"
   - Entire vehicle → Black Car
   - Individual seats → Shuttle Platform

2. Ask: "Are routes fixed and scheduled or custom point-to-point?"
   - Fixed routes → Shuttle Platform
   - Point-to-point → Black Car

---

## Choose Your Variation

To create segment-specific content or strategy, reference the appropriate variation:

### [University Programs](./university.md)

- Universities and colleges running campus shuttles
- Student transportation programs
- Campus services departments

### [Corporate Programs](./corporate.md)

- Corporations running employee commuter shuttles
- HR or Facilities-led programs
- Employee transportation benefits

### [Third-Party Operators](./operator.md)

- Operators running shuttle contracts for multiple clients
- Contract-based shuttle services
- Multi-client transportation providers

---

_Last Updated: January 2026_
_Maintained By: GTM Leadership_
