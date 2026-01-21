# Driver Arrival Notification - Shaping Document

**Date:** 2026-01-10  
**Appetite:** Small Batch (3-5 days)  
**Shaped by:** Amir

---

## 1. Problem

### The Story

Last Tuesday, John (a chauffeur for DPV) pulled up to the Ritz Carlton at 2:55 PM for a 3:00 PM pickup. He parked in the loading zone, but the passenger—a corporate executive named Lisa—was still in her room. She had no idea John was waiting.

John waited 10 minutes, then called dispatch: "Is the passenger coming?" Dispatch called Lisa. Lisa said, "Oh! I didn't know he was here. I'll be right down." Lisa rushed down, flustered, and the trip started on the wrong foot.

This happens daily across all DPV operations. Drivers arrive, passengers don't know, everyone wastes time.

### Current Workaround

Drivers either:
- Call the passenger directly (if they have the number, which they often don't)
- Call dispatch, who calls the passenger
- Just wait and hope

There's no systematic way for "driver arrived" to reach the passenger.

### Why This Matters Now

- DPV's biggest complaint from corporate clients: "We didn't know the car was here"
- Average wait time at pickup is 7 minutes—half of that is passenger unawareness
- Drivers get frustrated sitting in loading zones getting tickets
- This is a quick win that significantly improves perceived service quality

---

## 2. Appetite

**Time Budget:** Small Batch (3-5 days)

### Justification

- **Why not smaller?** Need to add driver-facing button, backend endpoint, SMS/email send logic, and passenger-facing message. Minimum viable implementation is ~3 days.
- **Why not bigger?** This is a simple notification—no UI for passengers, no tracking, no confirmation. Driver presses button, passenger gets text. That's it.

### Success Criteria

Within this appetite, success means:
- [ ] Driver can tap "I've arrived" in their app
- [ ] Passenger receives SMS within 30 seconds
- [ ] Dispatch can see that notification was sent

---

## 3. Solution

### Solution Overview

Add an "I've Arrived" button to the driver's active trip view. When tapped, send an SMS to the passenger with the vehicle description and driver name. Log the notification on the trip for dispatch visibility.

### User Flow

```
Driver Active Trip View
    |
    v
[I've Arrived Button]
    |
    v
[API call to send notification]
    |
    v
[Button changes to "Arrival Sent ✓"]
    |
    (Passenger receives SMS)
```

### Key Screens / Interactions

#### Driver App - Active Trip View

**Purpose:** Allow driver to notify passenger of arrival

**Elements:**
- "I've Arrived" button (prominent, only visible when trip status is "en route to pickup")
- After tapping: Button becomes disabled, shows "Arrival Sent ✓" with timestamp

```
+----------------------------------+
|  CURRENT TRIP                    |
|  --------------------------------|
|  John Smith                      |
|  Pickup: Ritz Carlton            |
|  3:00 PM                         |
|                                  |
|  [    I've Arrived     ]         |
|                                  |
+----------------------------------+
```

After tapping:

```
|  [  Arrival Sent ✓ 2:58 PM  ]    |
```

**Behavior:**
- Button only visible when trip status = "en_route_to_pickup"
- Can only be pressed once per trip
- If SMS fails, show error toast but don't block driver

#### Dispatch View - Trip Detail

**Purpose:** Show that arrival notification was sent

**Elements:**
- In the trip activity log, show: "Driver arrival notification sent to passenger at [time]"

### Data Requirements

**Reads:**
- Trip passenger phone number
- Driver name
- Vehicle description (make, model, color, plate)

**Writes:**
- Trip.arrival_notified_at (timestamp)
- Activity log entry

**New Data:**
- Add `arrival_notified_at` timestamp field to trips

### Integration Points

| System | Integration Type | Notes |
|--------|------------------|-------|
| Twilio | Write | Send SMS to passenger |

---

## 4. Rabbit Holes

### Identified Risks

#### Rabbit Hole 1: Two-Way Communication

**Risk:** Passenger wants to reply to the SMS—"I'll be 5 minutes." This opens a can of worms: Do we show the reply to the driver? In-app? SMS back to driver?

**Mitigation:** This is explicitly out of scope. The SMS comes from a no-reply number. If passengers reply, it goes nowhere. We can revisit two-way later.

#### Rabbit Hole 2: Driver Location Verification

**Risk:** What if driver presses "I've Arrived" but isn't actually at the location? GPS verification?

**Mitigation:** We trust the driver. No GPS check. If this becomes a problem (drivers gaming the system), we address it later.

#### Rabbit Hole 3: Message Customization

**Risk:** Different clients want different message templates—"Your driver" vs "Your chauffeur" vs company-branded messages.

**Mitigation:** V1 uses one template for everyone: "Your driver [Name] has arrived in a [Color] [Make] [Model] (plate: [Plate])." No customization.

### Technical Decisions Made

- **No-reply SMS** - Passengers cannot reply
- **Single template** - No client customization
- **Fire and forget** - If SMS fails, log it but don't retry or alert driver
- **One notification per trip** - Button is disabled after first press

---

## 5. No-Gos

**The following are explicitly OUT OF SCOPE for this project:**

1. **Passenger reply/two-way messaging** - No-reply only
2. **Email notification** - SMS only
3. **Customizable templates** - One template for all
4. **Automatic arrival notification** - Driver must manually press button
5. **GPS verification** - No location check

---

## 6. Nice-to-Haves (Marked with ~)

If time permits, consider:

- ~Include ETA to pickup in the message
- ~Allow driver to add a custom note ("I'm in the parking garage")

These are the FIRST things to cut if the project is running long.

---

## 7. Open Questions

- [ ] What Twilio phone number should these come from?
- [ ] Exact message copy to use?

---

## 8. Definition of Done

This project is done when:

- [ ] Driver can tap "I've Arrived" in app
- [ ] Passenger receives SMS with vehicle info
- [ ] Dispatch can see notification was sent in trip log
- [ ] Deployed to production

---

*This shaping document is ready for the betting table.*
