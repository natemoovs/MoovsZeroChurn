# Trip Cancellation Flow - Shaping Document

**Date:** 2026-01-15  
**Appetite:** Big Batch (3 weeks)  
**Shaped by:** Chris, Amir

---

## 1. Problem

### The Story

Maria runs dispatch operations for a luxury transportation company. Yesterday at 4 PM, a VIP client called to cancel their 6 AM airport pickup. Maria opened Moovs, found the trip, but there was no "Cancel" button. She had to:

1. Delete the trip entirely (losing the record)
2. Manually text the driver "Job cancelled"
3. Open Stripe separately to process a partial refund
4. Email the client confirming the cancellation
5. Create a manual note in the "client notes" field to track that this happened

The whole process took 15 minutes, and she still wasn't confident the driver got the message. When the driver showed up at the hotel anyway at 5:30 AM (he missed the text), the client was furious and called Maria at home.

### Current Workaround

Operators either:

- Delete trips (losing data)
- Mark trips as "completed" with $0 fare (corrupts reporting)
- Maintain separate spreadsheets of cancellations

Drivers sometimes get notified, sometimes don't. Refunds are always manual.

### Why This Matters Now

- **3 major accounts** (Roberts Hawaii, DPV, Carey) have explicitly requested this
- **Support tickets** about cancellations are 15% of total volume
- **Driver reliability** is suffering because drivers don't trust dispatch communication
- **Reporting is corrupted** because cancelled trips aren't tracked properly

---

## 2. Appetite

**Time Budget:** Big Batch (3 weeks)

### Justification

- **Why not smaller?** A proper cancellation flow touches trip status, driver notification, customer notification, and refund processing. These are tightly coupled—shipping half breaks the workflow.
- **Why not bigger?** We're explicitly NOT building a full refund management system. We're building a single cancellation flow that triggers a Stripe refund API call. Complex refund scenarios (partial, multi-payment, disputes) are out of scope.

### Success Criteria

Within this appetite, success means:

- [ ] Dispatchers can cancel a trip with 2 clicks
- [ ] Drivers receive an immediate notification
- [ ] Passengers receive an email confirmation
- [ ] Basic refunds are processed automatically
- [ ] Cancelled trips appear in reporting as "Cancelled" (not deleted or $0 completed)

---

## 3. Solution

### Solution Overview

Add a "Cancel Trip" action to the trip detail view. When triggered, show a modal that:

1. Asks for cancellation reason (dropdown)
2. Shows refund amount (calculated based on policy)
3. Sends notifications to driver and passenger
4. Updates trip status to "Cancelled"
5. Processes refund through Stripe

### User Flow

```
Trip Detail Page
    |
    v
[Cancel Trip Button] --> [Cancellation Modal]
    |
    ├── Select reason (dropdown)
    ├── See calculated refund
    ├── Toggle: Notify driver? (default: yes)
    ├── Toggle: Notify passenger? (default: yes)
    |
    v
[Confirm Cancellation]
    |
    v
[Trip Status: Cancelled] + [Notifications sent] + [Refund processed]
```

### Key Screens / Interactions

#### Trip Detail - Cancel Button

**Purpose:** Entry point for cancellation

**Elements:**

- Cancel Trip button (red, destructive styling)
- Only visible for future trips (not completed/cancelled)

**Behavior:**

- Click opens Cancellation Modal
- Not visible for trips in "In Progress" status

#### Cancellation Modal

**Purpose:** Confirm cancellation and configure options

**Elements:**

- Cancellation reason dropdown:
  - Customer requested
  - No-show
  - Weather
  - Vehicle issue
  - Driver unavailable
  - Other
- Refund amount display (read-only, calculated)
- Driver notification toggle (checkbox, default on)
- Passenger notification toggle (checkbox, default on)
- Cancel and Confirm buttons

```
+------------------------------------------+
|         Cancel Trip                    X |
+------------------------------------------+
|                                          |
|  Reason: [Customer requested     v]      |
|                                          |
|  Refund amount: $125.00                  |
|  (Based on cancellation policy)          |
|                                          |
|  [x] Notify driver via SMS               |
|  [x] Notify passenger via email          |
|                                          |
|        [Cancel]  [Confirm Cancellation]  |
+------------------------------------------+
```

**Behavior:**

- Refund calculated based on:
  - 24+ hours before: full refund
  - 12-24 hours: 50% refund
  - <12 hours: no refund
- Confirm triggers all actions (status update, notifications, refund)

### Data Requirements

**Reads:**

- Trip details (passenger, driver, fare, scheduled time)
- Stripe payment intent ID
- Driver phone number
- Passenger email

**Writes:**

- Trip.status = "cancelled"
- Trip.cancellation_reason
- Trip.cancelled_at
- Trip.cancelled_by (user ID)
- Trip.refund_amount
- Trip.refund_status

**New Data:**

- Add `cancellation_reason` enum field to trips
- Add `cancelled_at` timestamp to trips
- Add `cancelled_by` user reference to trips
- Add `refund_amount` and `refund_status` to trips

### Integration Points

| System   | Integration Type | Notes                               |
| -------- | ---------------- | ----------------------------------- |
| Stripe   | Write            | Call Refund API with payment intent |
| Twilio   | Write            | Send SMS to driver                  |
| SendGrid | Write            | Send email to passenger             |

---

## 4. Rabbit Holes

### Identified Risks

#### Rabbit Hole 1: Complex Refund Calculations

**Risk:** Operators want customizable refund policies per client, per vehicle type, with exceptions for weather, etc.

**Mitigation:** V1 uses a single, hardcoded refund policy (full if >24h, 50% if >12h, none otherwise). Custom policies are a future enhancement. We're documenting the policy in the UI so operators know what to expect.

#### Rabbit Hole 2: Partial Payment Scenarios

**Risk:** Some trips have deposits, multiple payments, or payment on file. Refund logic could get complex.

**Mitigation:** V1 only supports trips with a single Stripe payment. If a trip has multiple payments or non-Stripe payment, show "Manual refund required" instead of auto-processing. Log it for manual follow-up.

#### Rabbit Hole 3: Driver Already En Route

**Risk:** What if driver is already driving to the pickup? Notification might not be seen.

**Mitigation:** We notify but don't try to solve the "driver already en route" case. If trip is <30 minutes away, show a warning: "Driver may already be en route. Consider calling directly." This is an edge case we're acknowledging, not solving.

### Technical Decisions Made

- **Refund policy is hardcoded** - No admin UI for customization in v1
- **SMS only for drivers** - No push notification integration
- **Email only for passengers** - No SMS to passengers
- **Sync refund processing** - We call Stripe and wait for response; no async job

---

## 5. No-Gos

**The following are explicitly OUT OF SCOPE for this project:**

1. **Customizable refund policies** - All cancellations use the same policy
2. **Cancellation fees** - We only do refunds, not charges
3. **Bulk cancellations** - One trip at a time only
4. **Cancellation by passenger** - Dispatcher/admin only for v1
5. **Undo cancellation** - Once cancelled, must create new trip
6. **Dispute handling** - If passenger disputes refund, handle manually

---

## 6. Nice-to-Haves (Marked with ~)

If time permits, consider:

- ~Cancellation report showing all cancelled trips in date range
- ~Custom note field on cancellation modal
- ~Different notification templates by cancellation reason

These are the FIRST things to cut if the project is running long.

---

## 7. Open Questions

- [ ] Should we notify the passenger's booker (if different from passenger)?
- [ ] What's the SendGrid template ID for cancellation emails?

---

## 8. Definition of Done

This project is done when:

- [ ] Dispatcher can cancel future trips
- [ ] Driver receives SMS notification
- [ ] Passenger receives email confirmation
- [ ] Stripe refund is processed (or "manual" for edge cases)
- [ ] Trip shows as "Cancelled" in reporting
- [ ] Deployed to production
- [ ] No critical bugs

---

_This shaping document is ready for the betting table._
