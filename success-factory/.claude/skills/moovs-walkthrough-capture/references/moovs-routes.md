# Moovs Application Routes

This reference documents URL patterns and routes for the Moovs operator application.

## Route Architecture

The dooms-operator application uses React Router v5 with a hierarchical structure:

- **AuthRouter** - Login, signup, password recovery
- **MainRouter** - Authenticated application routes
- **DrawerRouter** - CRUD operations (create/update) in slide-out panels

## Authentication Routes

| Route                | Description          | Auth Required |
| -------------------- | -------------------- | ------------- |
| `/login`             | User login page      | No            |
| `/sign-up`           | Account creation     | No            |
| `/join-team/:userId` | Join team invitation | No            |
| `/forgot-password`   | Password recovery    | No            |

## Core Application Routes

### Dashboard & Navigation

| Route              | Description      | Selector Hints              |
| ------------------ | ---------------- | --------------------------- |
| `/dashboard`       | Main dashboard   | `[data-testid='dashboard']` |
| `/getting-started` | Onboarding guide | -                           |

### Request Management (Quotes)

| Route                                | Description               | Key Actions            |
| ------------------------------------ | ------------------------- | ---------------------- |
| `/quotes`                            | View all quotes           | List view with filters |
| `/quotes/create`                     | Create new quote (drawer) | Opens slide-out form   |
| `/quotes/:requestId/`                | Quote details             | View/edit quote        |
| `/quotes/:requestId/add-trip`        | Add trip to quote         | -                      |
| `/quotes/:requestId/add-return-trip` | Add return trip           | -                      |
| `/quotes/:requestId/update/:tripId`  | Update quote trip         | -                      |

### Reservations

| Route                                      | Description                 | Key Actions            |
| ------------------------------------------ | --------------------------- | ---------------------- |
| `/reservations`                            | View all reservations       | List view with filters |
| `/reservations/create`                     | Create reservation (drawer) | Opens slide-out form   |
| `/reservations/:requestId/`                | Reservation details         | View/edit reservation  |
| `/reservations/:requestId/add-trip`        | Add trip to reservation     | -                      |
| `/reservations/:requestId/add-return-trip` | Add return trip             | -                      |
| `/reservations/:requestId/update/:tripId`  | Update reservation trip     | -                      |

### Dispatch

| Route                                 | Description           | Key Actions        |
| ------------------------------------- | --------------------- | ------------------ |
| `/dispatch`                           | Dispatch dashboard    | Main dispatch view |
| `/dispatch/:requestId/update/:tripId` | Update dispatch trip  | -                  |
| `/dispatch/update/:routeId`           | Update dispatch route | -                  |

### Shuttle Management

| Route                          | Description                | Feature Flag    |
| ------------------------------ | -------------------------- | --------------- |
| `/shuttle`                     | Shuttle management         | `shuttleRevamp` |
| `/shuttle/:routeId`            | Shuttle route details      | `shuttleRevamp` |
| `/reservations/shuttle/create` | Create shuttle reservation | `shuttleRevamp` |

### Vehicles & Categories

| Route                                     | Description             | Key Selectors |
| ----------------------------------------- | ----------------------- | ------------- |
| `/vehicles`                               | Vehicle list            | -             |
| `/vehicles/create`                        | Create vehicle (drawer) | -             |
| `/vehicles/update/:vehicleId`             | Edit vehicle            | -             |
| `/vehicles/categories/create`             | Create category         | -             |
| `/vehicles/categories/update/:categoryId` | Edit category           | -             |

### Contacts & Companies

| Route                          | Description             |
| ------------------------------ | ----------------------- |
| `/contacts`                    | Contacts list           |
| `/contacts/create`             | Create contact (drawer) |
| `/contacts/update/:contactId`  | Edit contact            |
| `/companies`                   | Companies list          |
| `/companies/create`            | Create company (drawer) |
| `/companies/update/:companyId` | Edit company            |

### Affiliates

| Route                             | Description               |
| --------------------------------- | ------------------------- |
| `/affiliates`                     | Farm affiliates list      |
| `/affiliates/create`              | Create affiliate (drawer) |
| `/affiliates/update/:affiliateId` | Edit affiliate            |

### Financial Management

| Route                         | Description              |
| ----------------------------- | ------------------------ |
| `/invoices`                   | Invoices list            |
| `/invoices/create`            | Create invoice (drawer)  |
| `/invoices/update/:invoiceId` | Edit invoice             |
| `/payables`                   | Driver payout management |
| `/finances`                   | Stripe finances          |
| `/card`                       | Moovs card management    |

### Driver Management

| Route              | Description               |
| ------------------ | ------------------------- |
| `/driver-tracking` | Real-time driver tracking |

### Settings

All settings routes are prefixed with `/settings/`:

| Route                                | Description                   |
| ------------------------------------ | ----------------------------- |
| `/settings/general`                  | General company settings      |
| `/settings/customer-portal`          | Customer portal configuration |
| `/settings/members`                  | Team members                  |
| `/settings/members/create`           | Add team member (drawer)      |
| `/settings/members/update/:userId`   | Edit team member              |
| `/settings/drivers`                  | Driver management             |
| `/settings/drivers/create`           | Add driver (drawer)           |
| `/settings/drivers/update/:driverId` | Edit driver                   |
| `/settings/cancellation`             | Cancellation policies         |
| `/settings/insurance`                | Insurance settings            |
| `/settings/terms-and-conditions`     | Terms & conditions            |
| `/settings/zone-pricing`             | Zone-based pricing            |
| `/settings/dynamic-pricing`          | Dynamic pricing               |
| `/settings/billing`                  | Billing overview              |
| `/settings/billing/plans`            | Subscription plans            |
| `/settings/financial`                | Financial reporting           |
| `/settings/notifications`            | Notification settings         |
| `/settings/website/main`             | Website customization         |

### Communication & AI

| Route        | Description           | Feature Flag           |
| ------------ | --------------------- | ---------------------- |
| `/chat`      | Chat interface        | -                      |
| `/crm`       | Pocketflows CRM       | `enablePocketflowsCrm` |
| `/ai-hub`    | AI reservation upload | `aiReservationUpload`  |
| `/scheduler` | Auto-scheduling       | `enableAutoScheduler`  |

## Common UI Selectors

When capturing workflows, use these selector patterns:

### Navigation

```
// Sidebar navigation
[data-testid='nav-dashboard']
[data-testid='nav-dispatch']
[data-testid='nav-reservations']
[data-testid='nav-quotes']
[data-testid='nav-vehicles']
[data-testid='nav-contacts']
[data-testid='nav-settings']
```

### Common Actions

```
// Primary action buttons
[data-testid='create-btn']
[data-testid='save-btn']
[data-testid='cancel-btn']
button[type='submit']
.MuiButton-containedPrimary

// Form inputs
input[name='firstName']
input[name='lastName']
input[name='email']
input[name='phone']

// Dialogs/Modals
.MuiDialog-root
.MuiDrawer-root
```

### Tables & Lists

```
// Data grids
.MuiDataGrid-root
[data-testid='data-table']

// Row actions
[data-testid='edit-action']
[data-testid='delete-action']
[data-testid='view-action']
```

## Environment URLs

| Environment | Base URL                             |
| ----------- | ------------------------------------ |
| Production  | `https://operator.moovs.app`         |
| Staging     | `https://operator-staging.moovs.app` |
| Local       | `http://localhost:3000`              |

## Notes

1. **Drawer Routes**: Routes ending with `/create` or `/update/:id` open in drawer panels
2. **Feature Flags**: Some routes require LaunchDarkly feature flags to be enabled
3. **Permissions**: All routes except auth require user authentication and appropriate permissions
4. **Path Parameters**: Dynamic segments use `:paramName` syntax
