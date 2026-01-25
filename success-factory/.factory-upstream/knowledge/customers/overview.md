# Moovs ICP Overview

Authoritative source for all Ideal Customer Profile definitions. Use this document as the foundation for all GTM content, messaging, and strategy decisions.

## Critical Segmentation Principle

**Revenue is the primary indicator for Black Car tier segmentation.** Fleet size, rides, and drivers are supporting validators. When revenue and fleet conflict, revenue determines the segment.

Examples:

- 15 coaches generating $1.5M → **Enterprise** (revenue wins)
- 22 sedans generating $800K → **Mid-Market** (revenue wins)
- 8 vehicles generating $180K → **SMB** (revenue wins)

---

## Active ICPs

### Black Car (3 Segments)

| Segment        | Revenue    | Fleet           | Structure            | Primary Pain         | Sales Motion          | Budget             |
| -------------- | ---------- | --------------- | -------------------- | -------------------- | --------------------- | ------------------ |
| **SMB**        | $50K-$250K | 1-5 vehicles    | Owner-operator       | Everything manual    | PLG/self-serve        | $150-$250/mo       |
| **Mid-Market** | $250K-$1M  | 6-19 vehicles   | Owner + managers     | Outgrowing tools     | Sales-assisted        | $250-$500/mo       |
| **Enterprise** | $1M+       | 20-52+ vehicles | Full management team | System consolidation | High-touch enterprise | Enterprise pricing |

### Shuttle Platform (1 Base + 3 Variations)

| Variation      | Decision Maker                     | Primary Pain                          | Sales Cycle      | Budget     |
| -------------- | ---------------------------------- | ------------------------------------- | ---------------- | ---------- |
| **University** | Transportation Dir + Facilities VP | Student experience, "where's my bus?" | 4-6 months (RFP) | $10K-$100K |
| **Corporate**  | Facilities Dir + HR VP             | Employee retention, ESG goals         | 3-4 months       | $15K-$150K |
| **Operator**   | Owner/GM                           | Win contracts, improve margins        | 2-3 months       | $20K-$100K |

**Not yet included:** NEMT, Charter Bus (add when strategically ready)

---

## Decision Tree

```
Is it Black Car or Shuttle?

└─ BLACK CAR (private vehicle bookings)
   └─ What's their annual revenue? (PRIMARY INDICATOR)
      ├─ $50K-$250K → SMB Black Car
      │  └─ Validate: Typically 1-5 vehicles, owner-operator
      │
      ├─ $250K-$1M → Mid-Market Black Car
      │  └─ Validate: Typically 6-19 vehicles, has managers
      │
      └─ $1M+ → Enterprise Black Car
         └─ Validate: Typically 20+ vehicles OR high-value fleet, full team

└─ SHUTTLE (per-seat bookings on shared vehicles)
   └─ Which variation?
      ├─ University (campus, students) → Use Base + University
      ├─ Corporate (employees, HR) → Use Base + Corporate
      └─ Operator (contracts, multiple clients) → Use Base + Operator
```

**Quick Test:**

- "Do passengers book the entire vehicle or individual seats?"
  - Entire vehicle → Black Car
  - Individual seats → Shuttle
- "Are routes fixed and scheduled or custom point-to-point?"
  - Fixed routes → Shuttle
  - Point-to-point → Black Car

---

## Critical Separation Rules

### Black Car vs. Shuttle Platform

**NEVER mix these segments:**

| Attribute     | Black Car                           | Shuttle Platform               |
| ------------- | ----------------------------------- | ------------------------------ |
| Booking Unit  | Entire vehicle                      | Individual seat                |
| Route Type    | Point-to-point, custom              | Fixed routes with timetables   |
| Customer Type | Executives, VIPs, individuals       | Commuters, students, employees |
| Pricing Model | Hourly, one-way, round-trip         | Per-seat or program-based      |
| Key Pain      | Manual dispatch and scheduling      | Lack of rider visibility       |
| Moovs Value   | Dispatch automation + consolidation | Real-time tracking + capacity  |

### Within Black Car: Keep Tiers Separate

| Attribute       | SMB                             | Mid-Market              | Enterprise               |
| --------------- | ------------------------------- | ----------------------- | ------------------------ |
| Sales Cycle     | 30 days                         | 45 days                 | 3-6 months               |
| Free Plan Usage | 44.7%                           | 14.8%                   | 0%                       |
| Key Message     | "Look professional, affordable" | "Scale efficiently"     | "Consolidate & automate" |
| Proof Needed    | SMB case studies                | Mid-market case studies | Enterprise case studies  |

### Within Shuttle: Keep Variations Separate

| Attribute      | University              | Corporate                | Operator                         |
| -------------- | ----------------------- | ------------------------ | -------------------------------- |
| Primary Driver | Student experience      | Employee retention/ROI   | Contract wins & margins          |
| Key Message    | "Student satisfaction"  | "Talent retention & ESG" | "Win contracts, improve margins" |
| Proof Needed   | University case studies | Corporate case studies   | Operator case studies            |

---

## Content Creation Rules

### 1. Always specify the segment AND variation

**Correct:**

- "Blog post for Enterprise Black Car operators"
- "Landing page for Shuttle Platform - University variation"
- "Email sequence for SMB Black Car"

**Wrong:**

- "Blog post for transportation operators" (too vague)
- "Content for shuttle customers" (which variation?)

### 2. For Shuttle content, reference BOTH Base + Variation

1. Start with Base Shuttle ICP for core capabilities and pain points
2. Layer in specific variation for messaging, proof points, and buying process
3. Never mix variations

### 3. Use segment-specific pain points

**Don't use generic SaaS pain points. Pull from ICPs:**

| Segment              | Specific Pain Point                                         |
| -------------------- | ----------------------------------------------------------- |
| SMB Black Car        | "Owner working 70 hours a week doing everything manually"   |
| Mid-Market Black Car | "Outgrowing current tools, can't scale to 15+ vehicles"     |
| Enterprise Black Car | "150+ daily trip assignments take 3-4 hours"                |
| University Shuttle   | "Students demanding 'Where's my bus?'"                      |
| Corporate Shuttle    | "Exit interviews cite commute as resignation reason"        |
| Operator Shuttle     | "Lost $500K in contracts due to lack of real-time tracking" |

### 4. Pull proof points from the correct segment

**Wrong:** Using Enterprise case study for SMB audience
**Wrong:** Using university case study for corporate audience
**Right:** Using peer case studies for each segment

### 5. If uncertain which ICP to use, ASK

Don't guess or blend segments. Clarify:

- "Which Black Car tier: SMB, Mid-Market, or Enterprise?"
- "Which Shuttle variation: University, Corporate, or Operator?"

---

## Messaging Guardrails

### Black Car Messaging

- Luxury, reliability, private service, AI dispatch, consolidation
- **Never use:** "Route optimization," "per-seat," "shuttle"

### Shuttle Base Messaging

- Visibility, capacity, real-time tracking, multi-stakeholder reporting
- **Never use:** "VIP service," "private chauffeur," "luxury"

### University Variation

- Student experience, safety, campus integration, justify to admin
- **Never use:** Corporate language (employees, HR, retention)

### Corporate Variation

- Employee retention, ESG/sustainability, real estate ROI, talent attraction
- **Never use:** University language (students, campus, academic year)

### Operator Variation

- Contract wins, operational efficiency, client reporting, margin improvement
- **Never use:** Direct program language (they serve clients, not end riders)

---

## ICP Document Index

### Black Car ICPs

- [SMB Black Car](./black-car/smb.md) - $50K-$250K, 1-5 vehicles
- [Mid-Market Black Car](./black-car/mid-market.md) - $250K-$1M, 6-19 vehicles
- [Enterprise Black Car](./black-car/enterprise.md) - $1M+, 20-52+ vehicles

### Shuttle Platform ICPs

- [Shuttle Base](./shuttle/base.md) - Core definition, shared elements
- [University Variation](./shuttle/university.md) - Campus transportation
- [Corporate Variation](./shuttle/corporate.md) - Employee shuttles
- [Operator Variation](./shuttle/operator.md) - Third-party contractors

---

_Last Updated: January 2026_
_Maintained By: GTM Leadership_
