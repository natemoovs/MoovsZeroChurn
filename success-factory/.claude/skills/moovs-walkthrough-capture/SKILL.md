---
name: moovs-walkthrough-capture
description: Captures animated GIF walkthroughs of Moovs application workflows. Use when documenting features, creating training materials, or building help content. Automates browser navigation, screenshots, and GIF generation using Playwright.
---

# Moovs Walkthrough Capture Skill

This skill automates the creation of animated GIF walkthroughs for the Moovs platform. It navigates through user workflows, captures screenshots at key steps, and stitches them into shareable GIFs.

## Why This Matters

Documentation that shows rather than tells is more effective. When onboarding operators, training dispatchers, or creating help content, animated walkthroughs:

- Reduce support tickets by showing exactly how to complete tasks
- Create consistent training materials
- Document features for release notes and marketing
- Capture bug reproduction steps for engineering

## When to Use This Skill

Use this skill when:

- Creating training materials for operators
- Documenting a new feature for release notes
- Building help center content
- Capturing a bug reproduction workflow
- Creating sales demo materials

## Prerequisites

Before running walkthroughs, ensure:

1. **Python environment** with required dependencies:

   ```bash
   pip install -r .claude/skills/moovs-walkthrough-capture/requirements.txt
   ```

2. **Playwright browsers installed**:

   ```bash
   playwright install chromium
   ```

3. **Access credentials** for the Moovs environment you're capturing (staging recommended)

## Process Overview

1. **Define the workflow** - Describe what user journey to capture
2. **Configure capture settings** - Environment URL, viewport, timing
3. **Execute capture** - Playwright navigates and screenshots each step
4. **Generate GIF** - Stitch screenshots with configurable timing
5. **Output** - GIF saved to specified location

## Workflow Definition

Workflows are defined as a sequence of steps. Each step includes:

```yaml
workflow:
  name: "Create New Trip"
  environment: staging
  viewport: { width: 1280, height: 800 }

  steps:
    - action: navigate
      url: /dispatch
      screenshot: true
      label: "Dispatch Dashboard"

    - action: click
      selector: "[data-testid='new-trip-btn']"
      wait_for: "[data-testid='trip-form']"
      screenshot: true
      label: "New Trip Form"

    - action: fill
      selector: "[data-testid='passenger-name']"
      value: "John Smith"
      screenshot: true
      label: "Enter Passenger"

    - action: click
      selector: "[data-testid='vehicle-select']"
      screenshot: true
      label: "Select Vehicle"

    - action: click
      selector: "[data-testid='save-trip']"
      wait_for: ".success-toast"
      screenshot: true
      label: "Trip Created"
```

## Available Actions

| Action     | Description            | Required Fields     |
| ---------- | ---------------------- | ------------------- |
| `navigate` | Go to a URL            | `url`               |
| `click`    | Click an element       | `selector`          |
| `fill`     | Type into a field      | `selector`, `value` |
| `select`   | Choose dropdown option | `selector`, `value` |
| `wait`     | Pause for timing       | `duration` (ms)     |
| `scroll`   | Scroll to element      | `selector`          |
| `hover`    | Hover over element     | `selector`          |

## Selectors

Use these selector strategies (in order of preference):

1. **data-testid** (most reliable): `[data-testid='trip-form']`
2. **Aria labels**: `[aria-label='Create Trip']`
3. **CSS selectors**: `.btn-primary`, `#submit-btn`
4. **Text content**: `text=Create Trip`

Refer to [references/moovs-routes.md](references/moovs-routes.md) for URL patterns and [references/common-workflows.md](references/common-workflows.md) for pre-built workflow definitions.

## GIF Configuration

```yaml
gif_settings:
  frame_duration: 2000 # ms per screenshot
  transition: fade # none, fade, slide
  loop: true
  max_width: 800
  quality: high # low, medium, high
  annotations: true # add step labels
```

## Running a Capture

### Interactive Mode

When you invoke this skill, describe the workflow you want to capture:

> "Capture a GIF of creating a new trip in the dispatch dashboard"

The skill will:

1. Identify the workflow steps needed
2. Show you the proposed sequence for approval
3. Execute the capture
4. Generate the GIF

### Script Mode

For repeatable captures, run directly:

```bash
python .claude/skills/moovs-walkthrough-capture/scripts/capture_workflow.py \
  --workflow "new-trip" \
  --env staging \
  --output ./walkthroughs/new-trip.gif
```

## Pre-defined Workflows

See [references/common-workflows.md](references/common-workflows.md) for ready-to-use workflows:

- `new-trip` - Create a new trip in dispatch
- `edit-reservation` - Modify an existing reservation
- `assign-driver` - Assign a driver to a trip
- `customer-booking` - Customer portal booking flow
- `shuttle-schedule` - View and manage shuttle schedules

## Output

Generated GIFs are saved to:

- **Default**: `./walkthroughs/{workflow-name}-{timestamp}.gif`
- **Custom**: Specify with `--output` flag

Each capture also generates:

- `{name}-frames/` - Individual screenshots
- `{name}.json` - Workflow metadata and timing

## Troubleshooting

### Common Issues

| Issue             | Solution                                 |
| ----------------- | ---------------------------------------- |
| Element not found | Wait for element to load, check selector |
| Screenshot blank  | Add `wait` step after navigation         |
| GIF too large     | Reduce `max_width` or `quality`          |
| Timing feels off  | Adjust `frame_duration`                  |

### Debug Mode

Run with verbose logging:

```bash
python scripts/capture_workflow.py --workflow "new-trip" --debug
```

## Starting the Process

When the user invokes this skill:

1. Ask: "What workflow would you like to capture? This could be a specific user journey like 'creating a trip' or a feature demo."

2. Based on their response:
   - If it matches a pre-defined workflow, offer to use it
   - Otherwise, help define the step sequence

3. Confirm the workflow steps before executing

4. Run the capture and report results

**Important:** Always capture on staging first. Never run automated captures against production without explicit approval.

## Reference

- [requirements.txt](requirements.txt) - Python dependencies
- [references/moovs-routes.md](references/moovs-routes.md) - URL patterns
- [references/common-workflows.md](references/common-workflows.md) - Pre-defined workflows
- [scripts/](scripts/) - Capture scripts
