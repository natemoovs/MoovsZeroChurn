# Design Brief: Combined Pricing

**For:** Marton (Design)
**Type:** Production spec for vehicle pricing settings
**Audience:** Charter bus operators who need both mileage AND hourly pricing calculated

---

## The Problem

Charter operators charge using both Transfer (mileage) and Hourly pricing for every trip. They need the system to calculate both, then apply billing logic:
- **"Greater of"** — charge whichever total is higher
- **"Combined"** — add both totals together

Current BRA only uses ONE pricing type per trip based on trip type selection. This forces charter operators to manually calculate prices outside Moovs.

**Example scenario:**
- 55-Passenger Coach: 3 hours, 95 miles, 40 deadhead miles
- Transfer total: $150 base + $537.70 trip + $100 deadhead = **$787.70**
- Hourly total: 3 hrs × $300/hr = **$900.00**
- Result: **$900.00** (Hourly wins with "greater of" logic)

---

## What to Design

### Screen 1: Combined Pricing Section (Vehicle Settings)

**Location:** Settings > Vehicles > [Vehicle] > Pricing tab
**Add after:** Existing Hourly section

The existing Transfer and Hourly sections stay unchanged. Add a new section below them:

```
┌─────────────────────────────────────────────────────────────────┐
│ Combined Pricing                      [Toggle] Enable           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  When enabled, BOTH Transfer and Hourly are calculated          │
│  for every trip, regardless of trip type.                       │
│                                                                 │
│  ───────────────────────────────────────────────────────────    │
│                                                                 │
│  Billing Logic:                                                 │
│                                                                 │
│  (●) Greater of Transfer OR Hourly               (Recommended)  │
│      Customer pays whichever total is higher                    │
│                                                                 │
│  ( ) Transfer + Hourly combined                                 │
│      Add both totals together                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Component mapping:**

| Element | Component | Notes |
|---------|-----------|-------|
| Section header | Typography variant h6 | "Combined Pricing" |
| Enable toggle | MUI `Switch` | Same style as BRA toggle |
| Description text | Typography body2, gray | Explains what Combined Pricing does |
| Billing Logic label | Typography subtitle2 | "Billing Logic:" |
| Radio options | MUI `RadioGroup` | Only visible when toggle is ON |
| "(Recommended)" | Chip or inline text | Green or muted, next to first option |
| Helper text | Typography caption, gray | Below each radio option |

**States:**

| State | Behavior |
|-------|----------|
| Toggle OFF | Radio options hidden. Existing behavior (trip type determines pricing) |
| Toggle ON | Radio options visible. Both Transfer and Hourly calculated for every trip |
| Transfer OR Hourly incomplete | Toggle disabled. Show warning: "Configure both Transfer and Hourly pricing to use Combined Pricing" |

---

### Screen 2: BRA Calculations Popup (Updated)

**Location:** Quote/Reservation creation, "BRA Calculations" button
**Component:** Existing `BRACalculationsMenu`

When Combined Pricing is enabled, show both calculations with clear winner indication:

```
┌─────────────────────────────────────────────────────────────────┐
│ Base Rate Calculation                                  [Close]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  55-Passenger Coach                                             │
│  3 hours  •  95 miles  •  40 deadhead miles                     │
│                                                                 │
│  ───────────────────────────────────────────────────────────    │
│                                                                 │
│  TRANSFER PRICING                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Base rate                                    $150.00   │    │
│  │  Trip miles (95 × $5.66/mi)                   $537.70   │    │
│  │  Deadhead (40 × $2.50/mi)                     $100.00   │    │
│  │                                              ─────────  │    │
│  │                                    Subtotal:   $787.70  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                      ↑ Dimmed styling (loser)   │
│                                                                 │
│  HOURLY PRICING                                    ✓ Applied    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Minimum (3 hrs × $300/hr)                    $900.00   │    │
│  │                                              ─────────  │    │
│  │                                    Subtotal:   $900.00  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                      ↑ Green border (winner)    │
│                                                                 │
│  ───────────────────────────────────────────────────────────    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │   Base Rate:  $900.00                                   │    │
│  │   Hourly applied (greater of Transfer vs Hourly)        │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                      ↑ Blue background card     │
└─────────────────────────────────────────────────────────────────┘
```

**Variant for "Combined" billing mode:**

```
│  ───────────────────────────────────────────────────────────    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │   Base Rate:  $1,687.70                                 │    │
│  │   Transfer ($787.70) + Hourly ($900.00)                 │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
```

**Visual treatment:**

| Element | "Greater of" Mode | "Combined" Mode |
|---------|-------------------|-----------------|
| Winner section | Green border (#4CAF50), "✓ Applied" badge | Both sections normal styling |
| Loser section | Gray background, muted text | N/A |
| Result card | moovsBlueLight background | moovsBlueLight background |
| Result explanation | "Hourly applied (greater of...)" | "Transfer + Hourly" |

**When Combined Pricing is OFF:**
- Show only the relevant section (Transfer OR Hourly) based on trip type
- Same as current behavior

---

## Component Reference

Use existing Moovs patterns:

| Purpose | Component |
|---------|-----------|
| Toggle | `Switch` (MUI) |
| Radio options | `RadioGroup` with `FormControlLabel` |
| Currency display | `NumberFormatDollar` |
| Help tooltips | `MoovsTooltip` with `InfoIcon` |
| Cards | `Box` with border/background |
| Section dividers | `Divider` (MUI) |

---

## Realistic Test Data

Use for mockups:

**Vehicle:** 55-Passenger Coach

**Transfer Config:**
- Minimum Base Rate: $150
- Trip Rate: $5.66/mile
- Deadhead Rate: $2.50/mile

**Hourly Config:**
- Weekday Minimum: 3 hours
- Weekday Rate: $300/hr

**Example Trip:**
- Duration: 3 hours
- Trip Miles: 95
- Deadhead Miles: 40

**Calculations:**
- Transfer: $150 + (95 × $5.66) + (40 × $2.50) = $787.70
- Hourly: 3 × $300 = $900.00
- Greater of: **$900.00** (Hourly wins)
- Combined: **$1,687.70** (both added)

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Transfer OR Hourly incomplete | Disable Combined toggle. Warning: "Configure both Transfer and Hourly pricing first" |
| Zero deadhead miles | Hide deadhead line item in calculations |
| Zero trip miles | Show $0 for trip miles line item |
| Exact tie (Transfer = Hourly) | Either is fine, show "Transfer applied" (arbitrary) |
| Combined Pricing toggled OFF | No data loss. Transfer/Hourly settings preserved. |

---

## Key Design Principles

1. **Show the math** — Operators don't trust black boxes. Every line item must be visible and verifiable.

2. **Clear winner indication** — When using "greater of" logic, make it instantly obvious which pricing won. Green border + checkmark for winner, dimmed for loser.

3. **Build on existing patterns** — This is an addition, not a replacement. Transfer and Hourly sections stay exactly as they are.

4. **Currency-aware** — All amounts use operator's `currencySymbol` setting.

5. **Mobile responsive** — Settings: stacked layout. Calculations popup: scrollable with clear sections.

---

## Out of Scope

- Changes to Transfer section
- Changes to Hourly section
- New "Charter Mode" or trip type
- Multi-day pricing (separate feature)
- Tiered combined pricing

---

## Deliverable Checklist

- [ ] Combined Pricing section in Vehicle Settings
- [ ] BRA Calculations popup with dual pricing display
- [ ] Winner/loser visual treatment
- [ ] "Greater of" vs "Combined" variants
- [ ] Disabled state when config incomplete
- [ ] Mobile responsive layouts

---

*Design Brief for Combined Pricing Feature*
*January 2026*
