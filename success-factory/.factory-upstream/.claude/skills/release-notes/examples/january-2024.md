---
version: "2.14.0"
release_date: 2024-01-15
hero_feature: "Flight Tracking"
breaking_changes: false
---

# Release Notes - January 2024

## Flight Tracking for Airport Pickups

Your airport pickups just got smarter. Moovs now monitors flight status automatically and adjusts pickup times when flights are delayed.

**How it works:**
1. When you create a trip with an airport pickup, add the flight number
2. Moovs tracks the flight from departure to landing
3. If the flight is delayed, we update the pickup time and notify the driver

No more drivers waiting at the curb wondering if the plane landed. No more passengers arriving to find their ride left.

*Note: Flight tracking currently supports US domestic flights. International support coming in February.*

---

## New Features

**Dispatch: Bulk driver assignment**
Select multiple trips and assign them to a driver in one action. Useful for setting up a driver's full day in the morning.

**Invoices: Automatic payment reminders**
Overdue invoices now trigger automatic reminder emails at 7, 14, and 30 days. You can customize the timing and message in Settings → Invoices.

**Customer Portal: Trip modification requests**
Passengers can now request changes to their booking (time, location, vehicle) through the customer portal. You'll get a notification to approve or adjust.

## Improvements

**Dispatch: Faster page load**
The dispatch dashboard now loads 40% faster for operators with 50+ daily trips. We rebuilt how we fetch and display trip data.

**Reservations: Better address autocomplete**
Address suggestions now prioritize airports and hotels in your operating area. Should reduce typos and wrong-address pickups.

**Driver App: Offline support for trip details**
Drivers can now view their assigned trips even without cell service. Updates sync when they're back online.

## Fixes

**Invoices: Farm-out trips not appearing**
Fixed an issue where trips farmed out to affiliates weren't showing up on the associated invoice. All farm-out trips now appear correctly.

**Contacts: Duplicate phone number warning**
The system now warns you when adding a contact with a phone number that already exists, preventing accidental duplicates.

**Reports: Export timeout for large date ranges**
Fixed a timeout error when exporting reports spanning more than 90 days. Large exports now process in the background and email you when ready.

---

Questions about this release? Reply to this email or reach out to support@moovs.app.
