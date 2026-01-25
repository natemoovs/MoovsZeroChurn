# Common Moovs Workflows

Pre-defined workflow definitions for common user journeys in the Moovs operator application.

## Quick Reference

| Workflow          | Description                     | Steps |
| ----------------- | ------------------------------- | ----- |
| `new-trip`        | Create a new trip from dispatch | 5     |
| `new-reservation` | Create a reservation            | 6     |
| `new-quote`       | Create and send a quote         | 6     |
| `assign-driver`   | Assign driver to trip           | 4     |
| `add-vehicle`     | Add a new vehicle               | 5     |
| `add-contact`     | Add a new contact               | 4     |
| `view-dispatch`   | View dispatch dashboard         | 3     |

---

## Workflow Definitions

### new-trip: Create a New Trip

Creates a new trip/reservation from the Reservations page.

```yaml
workflow:
  name: "Create New Trip"
  environment: staging
  viewport:
    width: 1280
    height: 800

  steps:
    - action: navigate
      url: /reservations
      screenshot: true
      label: "Reservations List"

    - action: click
      selector: "button:has-text('Create')"
      wait_for: ".MuiDrawer-root"
      screenshot: true
      label: "Open Create Form"

    - action: wait
      duration: 1500

    - action: screenshot
      label: "New Reservation Form"

gif_settings:
  frame_duration: 2500
  max_width: 800
  annotations: true
```

---

### new-reservation: Create a Reservation

Full reservation creation workflow.

```yaml
workflow:
  name: "Create Reservation"
  environment: staging
  viewport:
    width: 1280
    height: 800

  steps:
    - action: navigate
      url: /reservations
      screenshot: true
      label: "Reservations List"

    - action: click
      selector: "[data-testid='create-btn'], button:has-text('New Reservation')"
      wait_for: ".MuiDrawer-root"
      screenshot: true
      label: "Open New Reservation"

    - action: fill
      selector: "input[name='contactName'], [data-testid='contact-input']"
      value: "Jane Doe"
      screenshot: true
      label: "Enter Contact"

    - action: fill
      selector: "[data-testid='pickup-location'], input[name='pickupLocation']"
      value: "123 Main Street"
      screenshot: true
      label: "Enter Pickup Location"

    - action: fill
      selector: "[data-testid='dropoff-location'], input[name='dropoffLocation']"
      value: "Airport Terminal A"
      screenshot: true
      label: "Enter Dropoff Location"

    - action: click
      selector: "[data-testid='save-btn'], button[type='submit']"
      wait_for: ".success-toast, .MuiSnackbar-root"
      screenshot: true
      label: "Reservation Created"

gif_settings:
  frame_duration: 2000
  max_width: 800
  annotations: true
```

---

### new-quote: Create and Send a Quote

Create a quote and send to customer.

```yaml
workflow:
  name: "Create Quote"
  environment: staging
  viewport:
    width: 1280
    height: 800

  steps:
    - action: navigate
      url: /quotes
      screenshot: true
      label: "Quotes List"

    - action: click
      selector: "[data-testid='create-btn'], button:has-text('New Quote')"
      wait_for: ".MuiDrawer-root"
      screenshot: true
      label: "Open Quote Form"

    - action: fill
      selector: "[data-testid='contact-input']"
      value: "Bob Johnson"
      screenshot: true
      label: "Enter Contact"

    - action: fill
      selector: "[data-testid='service-type']"
      value: "Airport Transfer"
      screenshot: true
      label: "Select Service Type"

    - action: fill
      selector: "[data-testid='price-input']"
      value: "150.00"
      screenshot: true
      label: "Enter Price"

    - action: click
      selector: "[data-testid='send-quote-btn'], button:has-text('Send Quote')"
      wait_for: ".success-toast"
      screenshot: true
      label: "Quote Sent"

gif_settings:
  frame_duration: 2000
  max_width: 800
  annotations: true
```

---

### assign-driver: Assign Driver to Trip

Assign an available driver to an existing trip.

```yaml
workflow:
  name: "Assign Driver"
  environment: staging
  viewport:
    width: 1280
    height: 800

  steps:
    - action: navigate
      url: /dispatch
      screenshot: true
      label: "Dispatch Dashboard"

    - action: click
      selector: ".trip-card:first-child, [data-testid='trip-row']:first-child"
      wait_for: ".trip-details"
      screenshot: true
      label: "Select Trip"

    - action: click
      selector: "[data-testid='assign-driver-btn'], button:has-text('Assign Driver')"
      wait_for: ".driver-list, .MuiMenu-root"
      screenshot: true
      label: "Open Driver List"

    - action: click
      selector: ".driver-option:first-child, [data-testid='driver-option']:first-child"
      wait_for: ".success-toast"
      screenshot: true
      label: "Driver Assigned"

gif_settings:
  frame_duration: 2500
  max_width: 800
  annotations: true
```

---

### add-vehicle: Add a New Vehicle

Add a new vehicle to the fleet.

```yaml
workflow:
  name: "Add Vehicle"
  environment: staging
  viewport:
    width: 1280
    height: 800

  steps:
    - action: navigate
      url: /vehicles
      screenshot: true
      label: "Vehicles List"

    - action: click
      selector: "[data-testid='create-btn'], button:has-text('Add Vehicle')"
      wait_for: ".MuiDrawer-root"
      screenshot: true
      label: "Open Vehicle Form"

    - action: fill
      selector: "input[name='name'], [data-testid='vehicle-name']"
      value: "Lincoln Navigator"
      screenshot: true
      label: "Enter Vehicle Name"

    - action: fill
      selector: "input[name='licensePlate'], [data-testid='license-plate']"
      value: "ABC-1234"
      screenshot: true
      label: "Enter License Plate"

    - action: click
      selector: "[data-testid='save-btn'], button[type='submit']"
      wait_for: ".success-toast"
      screenshot: true
      label: "Vehicle Added"

gif_settings:
  frame_duration: 2000
  max_width: 800
  annotations: true
```

---

### add-contact: Add a New Contact

Add a new contact/customer.

```yaml
workflow:
  name: "Add Contact"
  environment: staging
  viewport:
    width: 1280
    height: 800

  steps:
    - action: navigate
      url: /contacts
      screenshot: true
      label: "Contacts List"

    - action: click
      selector: "[data-testid='create-btn'], button:has-text('Add Contact')"
      wait_for: ".MuiDrawer-root"
      screenshot: true
      label: "Open Contact Form"

    - action: fill
      selector: "input[name='firstName']"
      value: "Sarah"

    - action: fill
      selector: "input[name='lastName']"
      value: "Williams"

    - action: fill
      selector: "input[name='email']"
      value: "sarah@example.com"
      screenshot: true
      label: "Enter Contact Info"

    - action: click
      selector: "[data-testid='save-btn'], button[type='submit']"
      wait_for: ".success-toast"
      screenshot: true
      label: "Contact Added"

gif_settings:
  frame_duration: 2000
  max_width: 800
  annotations: true
```

---

### view-dispatch: View Dispatch Dashboard

Simple overview of the dispatch dashboard.

```yaml
workflow:
  name: "View Dispatch"
  environment: staging
  viewport:
    width: 1280
    height: 800

  steps:
    - action: navigate
      url: /dispatch
      screenshot: true
      label: "Dispatch Dashboard"

    - action: wait
      duration: 1000

    - action: scroll
      selector: ".dispatch-list, .trip-list"
      screenshot: true
      label: "View Trips"

    - action: click
      selector: ".filter-btn, [data-testid='filter-toggle']"
      wait_for: ".filter-panel"
      screenshot: true
      label: "Filter Options"

gif_settings:
  frame_duration: 3000
  max_width: 800
  annotations: true
```

---

## Creating Custom Workflows

To create a custom workflow, follow this structure:

```yaml
workflow:
  name: "Descriptive Workflow Name"
  environment: staging # staging | production | local | custom URL
  viewport:
    width: 1280
    height: 800

  steps:
    - action: navigate
      url: /your-route
      screenshot: true
      label: "Step Description"

    - action: click
      selector: "[data-testid='element-id']"
      wait_for: ".expected-element"
      screenshot: true
      label: "Click Action"

    - action: fill
      selector: "input[name='fieldName']"
      value: "Input Value"
      screenshot: true
      label: "Fill Input"

gif_settings:
  frame_duration: 2000 # ms per frame
  max_width: 800 # output width
  annotations: true # show step labels
  quality: high # low | medium | high
  loop: true
```

### Available Actions

| Action     | Required Fields     | Optional Fields |
| ---------- | ------------------- | --------------- |
| `navigate` | `url`               | -               |
| `click`    | `selector`          | `wait_for`      |
| `fill`     | `selector`, `value` | -               |
| `select`   | `selector`, `value` | -               |
| `wait`     | `duration` (ms)     | -               |
| `scroll`   | `selector`          | -               |
| `hover`    | `selector`          | -               |
| `press`    | `key`               | -               |

### Selector Tips

1. **Prefer data-testid**: `[data-testid='btn-save']`
2. **Use aria labels**: `[aria-label='Submit']`
3. **Text content**: `button:has-text('Save')`
4. **Multiple options**: `"selector1, selector2"` (comma-separated fallbacks)
5. **Wait for elements**: Use `wait_for` to ensure UI is ready
