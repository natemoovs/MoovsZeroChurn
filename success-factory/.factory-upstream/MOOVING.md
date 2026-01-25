# # Mooving - 2026 Product Development Process

# Abstract

We need to radically change the way in which we sell, design, and build software in order to continue to scale Moovs. This means slowing down, committing to less, being more thoughtful about what we commit to, saying “No” more, and having more process in our development process. This document outlines the current state of things, the problem with this state, and a path forward.

# Where we’re coming from

2025 was a whirlwind year for Moovs and the Product & Engineering team. We grew our annual recurring revenue for Moovs from $1.6M to $2.7M in the calendar year, a 60% increase(!!!). From my perspective, there are 2 main contributing factors to this growth.

1. Our sales team (led by Amir) selling their faces off.
2. Our engineering team (us) shipping faster than the speed of thought.

Thanks to the teams hard work, aided by massive advancements in the capabilities of LLMs and Coding Agents, we shipped more features in the second half of 2025 than the entire year (and possibly 2 years) prior. Some of the notable features we shipped in the last 6 months include:

- Vehicle categories
- International currency and unit support for Switzerland, Denmark, and New Zealand
- Configurable time and date display throughout the app to be 24/12 hour clock format
- AI powered PDF import system
- Customizable email and text notifications
- Intelligent global moovs search
- Automatic dispatch and improve driver availability calendar
- Brand new shuttle product that includes:
  - Support for continuous and fixed schedule loops
  - Realtime operations tab that tracks driver location, eta, passenger status, and shuttle capacity.
  - Ticket management system for creating custom shuttle tickets + ability for end customers to purchase tickets via stripe hosted checkout
  - Customer facing link, android, and ios app for buying tickets, booking shuttles, and checking trip status
  - Support for dynamic shared shuttle route type that intelligently routes bookings to routes based on location
  - Scheduler board for roberts hawaii to create bookings
  - Entirely new shuttle section of the driver app with QR code, reservation list, and manual check in options.

For a team of 4, this an incredible feat that you should all be proud of. Very few teams in our industry are capable of shipping this much, this fast. Just ask fellow software engineer friends what they shipped this year and I guarantee it will be a fraction of what was listed above.

# The Problem

In the last 6 months, across our 4 main repositories, we have added an additional 240 thousand lines of code and removed 37 thousand lines of code.

| Repo     | Added   | Removed | Net Change |
| -------- | ------- | ------- | ---------- |
| Server   | 165,085 | 18,350  | +146,735   |
| Operator | 58,180  | 14,912  | +43,268    |
| Customer | 3,210   | 493     | +2,717     |
| Driver   | 13,376  | 3,136   | +10,240    |
| Total    | 239,851 | 36,891  | +202,960   |

Although very impressive on the surface, this pace is not sustainable and many of the features we have shipped are of subpar quality, don’t consider all edge cases, and are not well thought out enough.

At the time of writing this, we have signed agreements to ship features that we committed to before fully scoping with DPV, Roberts Hawaii, Carey Transporation, and Cornell University. The problem with this is tri-fold:

1. We are agreeing to our customers imagined solutions, as opposed to thinking through their problems and proposing the solutions ourselves. We are the software developers, not them.
2. We are over committing without knowing enough about the scope of their problems.
3. The deadlines we are committing to are not viable if we want to ship quality, strategically aligned products.

If we continue down this path, over-committing to sub optimal solutions then rushing to ship them without thought, we will significantly degrade the quality of the Moovs product. Moovs will experience more outages. Tech debt will prevent us from adding new features without breaking existing ones. Devs will burn out. And our platforms reputation will decline.

# The Solution

## Introducing Mooving: Our 2026 Product Development Process

The problems outlined above: over-committing, agreeing to customer-imagined solutions, rushing to ship without thought, and degrading quality, are not unique to Moovs. They're the predictable consequences of a team that can ship fast but lacks a system for deciding _what_ to ship and _when_ to say no.

Mooving is our answer. It's a product development methodology adapted from [37 Signal’s](https://37signals.com/) [Shape Up](https://basecamp.com/shapeup), modified for our team size, our speed, and our AI-assisted development capabilities. It gives us a shared language, a predictable rhythm, and, most importantly, a process that will enable us to be more thoughtful.

Here's how it works.

---

## The Core Philosophy

Mooving is built on five beliefs:

1. **Customers describe problems, we propose solutions.** We are the software developers. When a customer says "I need a scheduler board," our job is to understand _why,_ then design the right solution ourselves. We stop agreeing to imagined solutions.
2. **Time is fixed, scope is variable.** We commit to a time box, not a feature list. What gets built is whatever fits in the box. This is the opposite of how we've been operating: taking a list of “required” features and then expanding time to enable shipping all of them, and it's the key to shipping quality work on predictable timelines.
3. **Every commitment has a cap.** If something doesn't ship in one cycle, it doesn't automatically get more time. We stop and ask what went wrong. No more runaway projects.
4. **Shaped work only.** We don't commit engineering time to raw ideas. Before a project is "ready to build," it must be shaped: concrete enough to execute, bounded enough to finish, de-risked enough to bet on.
5. **Uninterrupted cycles are sacred.** Once an engineer is in-cycle, they're building, not scoping new deals, not jumping on "quick fixes," not context-switching. The work we bet on gets the focus it deserves.

---

## The Rhythm: 3-Week Cycles + 1-Week Cool-Down

We work in a **4-week rhythm**: three weeks of focused building, followed by one week of cool-down.

| Phase     | Duration | Activities                       |
| --------- | -------- | -------------------------------- |
| **Cycle** | 3 weeks  | ·Engineers build shaped projects |

·No interruptions
·Ship at end of cycle |
| **Cool-down** | 1 week | ·Fix bugs
·Pay down tech debt
·Betting table meeting
·Shape future work |

The cycle then repeats.

### Why 3 Weeks?

Three weeks is long enough to build something meaningful end-to-end, but short enough that the deadline creates urgency from day one. It forces trade-offs. It's our "just right" time horizon given our team size and the pace of our market.

For comparison: two-week sprints (what most teams use) are too short to finish anything real; you spend more time planning than building. Six weeks (what 37 Signals uses) is too long for a team of our size operating in a market that moves as fast as ours.

### Why 1-Week Cool-Down?

Cool-down is not vacation. It's when we:

- **Fix bugs** that accumulated during the cycle
- **Address tech debt** before it compounds
- **Hold the betting table** to decide what we're building next
- **Shape upcoming work** so it's ready to bet on
- **Breathe** so we don't burn out

This is how we stop the "rushing from commitment to commitment" pattern. Cool-down is our release valve, our forcing function for thoughtful planning, and our opportunity to fix bugs and pay down tech debt.

---

## The Three Phases

Mooving has three distinct phases:

| Phase        | Who                       | When                | Output                          |
| ------------ | ------------------------- | ------------------- | ------------------------------- |
| **Shaping**  | Everyone on the team      | Ongoing / Cool-down | Pitches ready to bet on         |
| **Betting**  | Chris & Amir              | During cool-down    | Cycle plan: who's building what |
| **Building** | Engineers + coding agents | During cycle        | Shipped features                |

Let's break down each one.

---

## Phase 1: Shaping

Shaping is the work we do _before_ committing engineering time. It's where we transform raw customer requests into bounded, de-risked projects that are ready to build.

**This is where we solve the "agreeing to customer-imagined solutions" problem.**

### The Shaping Mindset

When a customer (or sales) comes to us with a request, our job is to understand the _problem_, not accept the _solution_.

| What We Hear                          | What We Ask                                                                    | What We Shape                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| "We need a scheduler board"           | "What's breaking today? Is it that the current UI is too confusing?"           | Simple visual for assigning bookings to trips, not full blown scheduler board                                |
| "We need realtime dispatch like Uber” | "Walk me through how you assign a driver to a trip today, where is it broken?" | Minimal system for requesting drivers accept a ride in real time, not complex system with fairness algorithm |
| "We need a customer portal"           | "What do your customers call you about that they could do themselves?"         | Self-service rebooking for date changes, not full shuttle booking portal                                     |

Shaping is about finding the **smallest solution that solves the real problem** within a fixed time appetite.

### Setting the Appetite

Before designing anything, we ask: **How much time is this problem worth?**

This is not an estimate. It's a budget. It's us saying "we're willing to spend X on this, no more."

| Appetite                   | What It Means                                                                    |
| -------------------------- | -------------------------------------------------------------------------------- |
| **Small Batch** (3-5 days) | A focused improvement. One engineer can knock it out alongside other small work. |
| **Big Batch** (3 weeks)    | A significant feature. One engineer's full cycle.                                |

If a request doesn't fit in a 3-week appetite, we don't ask "how do we get more time?" We ask "how do we narrow the problem?"

**Example:** Roberts Hawaii wants a full shuttle management system. That's months of work. But what's the _core_ problem? They need to see where shuttles are and whether they're on schedule. That's a 3-week project: real-time operations view. Everything else is future cycles.

### The Four Steps of Shaping

### Step 1: Set Boundaries

- What's the appetite? (Small batch or big batch?)
- What's the _real_ problem? (Not the customer's stated solution)
- What's the narrowest version that would be valuable?

### Step 2: Rough Out the Elements

- Sketch the solution at the right level of abstraction
- Use **breadboards** for flows (screens → actions → outcomes)
- Use **figma make or claude desktop** for visual concepts (rough enough that details aren't specified)

The goal: concrete enough that an engineer knows what to build, rough enough that they have room to figure out the details.

### Step 3: Address Risks and Rabbit Holes

- What technical unknowns could blow this up?
- What edge cases are we explicitly _not_ handling?
- What integrations or dependencies could delay us?

If we find a rabbit hole we can't patch, the project isn't ready to bet on.

### Step 4: Write the Pitch

Package everything into a short document with five ingredients:

| Ingredient       | What It Contains                                                                |
| ---------------- | ------------------------------------------------------------------------------- |
| **Problem**      | The specific situation that's broken today. A real story, not an abstract need. |
| **Appetite**     | Small batch (3-5 days) or Big batch (3 weeks).                                  |
| **Solution**     | Breadboards or figma make/claude prototype showing the approach.                |
| **Rabbit Holes** | Risks we've identified and how we're addressing them.                           |
| **No-Gos**       | What we're explicitly _not_ building. Just as important as what we are.         |

**A pitch is not a spec.** It doesn't list every field, every screen, every edge case. It defines the boundaries and the approach. The engineer figures out the rest.

---

## Phase 2: Betting

Betting is how we decide what to build next. It happens during cool-down.

### The Betting Table

The betting table is a short meeting where we review pitches and decide what to commit to for the next cycle. Attendees:

- Chris
- Amir

**What happens at the betting table:**

1. Review shaped pitches (read asynchronously before the meeting)
2. Discuss which problems are most important _right now_
3. Consider who's available and what they've been working on
4. Place bets: assign engineers to projects for the next cycle

**What doesn't happen:**

- No grooming a backlog of 80 tickets
- No estimating in hours or story points
- No committing beyond the next cycle
- No saying "yes" to unshaped work

### The Circuit Breaker

This is the most important rule in Mooving:

> If a project doesn't ship in one cycle, it doesn't automatically get more time.

By default, unfinished projects are cut. We go back to shaping and ask: What did we get wrong? Was the scope too big? Did we miss a rabbit hole? Is this actually worth more time?

This sounds harsh. It's actually liberating. It means:

- No more projects that drag on for 3, 4, 5 cycles
- No more sunk cost fallacy ("we've already spent 6 weeks, we can't stop now")
- No more death marches to "finish" something that was mis-scoped from the start

**The circuit breaker is how we honour our commitments without becoming hostages to them.**

### What About Sales Commitments?

This is where we have to change how we operate.

**Old way:** Sales signs a deal with a feature commitment and a deadline. Engineering scrambles to figure out what that means and ship it in time. Quality suffers. Tech debt accumulates. Everyone is stressed.

**New way:** Before sales commits to a feature, engineering shapes it. We determine the appetite, define the boundaries, and identify rabbit holes. _Then_ we can commit with confidence — because we know what we're actually agreeing to.

For existing commitments (DPV, Roberts Hawaii, Carey Transportation, Cornell), we need to:

1. Shape the remaining work into bounded, 3-week projects
2. Be honest about what's achievable in each cycle
3. Communicate updated timelines if necessary

This isn't about slowing down. It's about _knowing what we're doing_ before we do it.

---

## Phase 3: Building

The cycle starts. Engineers have three weeks. Here's how the work unfolds.

Before I explain this phase, it’s important to understand the concept of **Scopes**. A Scope is an integrated slice of a feature that can be finished independently.

**Scopes are not:**

- Tasks split by layer ("API tasks," "frontend tasks")
- A flat list of everything to do
- Arbitrary groupings

**Scopes are:**

- Meaningful parts of the problem
- Completable in a few days
- Named in the language of the project

**Example — Trip Cancellation project:**

| Scope         | What's Included                                             |
| ------------- | ----------------------------------------------------------- |
| Cancel Flow   | Cancellation UI, confirmation dialog, backend status update |
| Refund Logic  | Refund calculation, Stripe integration                      |
| Notifications | SMS/email to driver and passenger                           |
| Admin View    | Internal tool for edge cases                                |

Each scope bundles frontend and backend. When "Cancel Flow" is done, it's _actually_ done, not "waiting on API" or "needs frontend."

### Team Composition: Engineer + Coding Agent(s)

Our team structure is different from traditional setups. Each project is owned by **one engineer working with a coding agent** (Claude and/or Codex).

The engineer is responsible for:

- Understanding the pitch and asking clarifying questions
- Making design decisions (UI/UX)
- Breaking down the work into scopes
- Directing the coding agent effectively
- Ensuring quality and handling edge cases
- Shipping at the end of the cycle

The coding agent accelerates implementation but doesn't replace judgment. The engineer is still the owner.

### Getting Started: The First Few Days

The first 1-2 days of a cycle look quiet. No PRs merged. No features demoed. That's normal.

The engineer is **getting oriented**:

- Reading the pitch thoroughly
- Exploring the relevant codebase
- Identifying where the new work fits
- Discovering the real tasks (not just the imagined ones)

### Get One Piece Done

After orientation, the engineer should aim to **ship one vertical slice** by the end of the first week.

Not "design done" or "backend done” but rather a thin slice that works end-to-end.

**Example:** Building a new trip feedback feature? Don't mock up every screen while building the whole API. Instead: build the rating submission screen. Real UI, real API, real database write. Deployed to staging. Clickable.

This does several things:

- Proves the approach works
- Builds momentum and confidence
- Surfaces integration issues early
- Gives something tangible to demo

### Scope Hammering: Making Trade-offs

As the deadline approaches, scope grows. There's always more to do. Edge cases. Polish. "Wouldn't it be nice if..."

**Scope hammering** is the discipline of constantly cutting:

- Is this a must-have or a nice-to-have?
- What happens if we ship without this?
- Does this edge case actually happen in practice?

Mark nice-to-haves with **~** in front. They're the first to cut.

**Compare down, not up.** Don't compare to some imaginary perfect version. Compare to what customers have today. Is it better? Ship it.

### Done Means Deployed

At the end of the cycle, the work ships. Not "code complete." Not "in QA." **Deployed to production.**

This keeps us honest. It forces us to scope appropriately. It prevents the "90% done" projects that somehow take another 3 weeks.

---

## The Mooving Calendar

Here's what a year looks like:

| Period       | Duration | Purpose                 |
| ------------ | -------- | ----------------------- |
| **Cycle 1**  | 3 weeks  | Focused building        |
| **Cooldown** | 1 week   | Bugs, shaping, planning |
| **Cycle 2**  | 3 weeks  | Focused building        |
| **Cooldown** | 1 week   | Bugs, shaping, planning |
| **Cycle 3**  | 3 weeks  | Focused building        |
| **Cooldown** | 1 week   | Bugs, shaping, planning |

_This pattern repeats throughout the year: 13 cycles × 3 weeks = 39 weeks of building, plus 13 cooldowns × 1 week = 13 weeks of maintenance and planning._

That's **13 opportunities per year** to ship meaningful work, instead of one continuous death march.

---

## The Terminology

| Term                | Definition                                                          |
| ------------------- | ------------------------------------------------------------------- |
| **Cycle**           | A 3-week period of focused, uninterrupted building.                 |
| **Cool-down**       | A 1-week break between cycles for bugs, tech debt, and planning.    |
| **Appetite**        | How much time a problem is _worth_ — not an estimate, a budget.     |
| **Small Batch**     | A 3-5 day project. Multiple can fit in one cycle.                   |
| **Big Batch**       | A full 3-week project.                                              |
| **Shaping**         | The pre-work of turning raw ideas into bounded, de-risked projects. |
| **Pitch**           | A document presenting a shaped project for betting.                 |
| **Betting Table**   | The meeting where we decide what to build next cycle.               |
| **Bet**             | A commitment of one engineer to one project for one cycle.          |
| **Circuit Breaker** | The rule that projects don't automatically get extensions.          |
| **Scope**           | An integrated slice of work that can be finished independently.     |
| **Scope Hammering** | Cutting scope aggressively to fit the time box.                     |
| **Must-have**       | A task that must be done for the scope to ship.                     |
| **Nice-to-have**    | A task marked with ~ that gets cut if time runs short.              |
| **Rabbit Hole**     | A part of the project that could swallow unlimited time.            |

---

## How This Solves Our Problems

| Problem                                     | How Mooving Addresses It                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| **Agreeing to customer-imagined solutions** | Shaping requires us to understand the problem and propose our own solution.    |
| **Over-committing without knowing scope**   | Nothing gets committed until it's shaped. Appetite sets a hard cap.            |
| **Unviable deadlines**                      | We commit in 3-week increments. The circuit breaker prevents runaway projects. |
| **Subpar quality / edge cases missed**      | Fixed time + variable scope forces us to do less, better.                      |
| **Tech debt accumulation**                  | Weekly cool-downs create regular space for paying it down.                     |
| **Dev burnout**                             | Predictable rhythm. Protected focus time. No death marches.                    |
| **"Rushing from commitment to commitment"** | Cool-down + betting table creates a forcing function for thoughtful planning.  |

---

## What Changes Immediately

### For Engineering:

- No more getting pulled into other work mid-project
- No more "quick fixes" interrupting cycle work
- Clear ownership: one engineer, one project, one cycle
- Permission to push back on unshaped work

### For Sales:

- Engineering must shape a feature before we commit it to a customer
- Deadlines are set in collaboration, not handed down
- We commit to problems, not solutions

### For Chris & Amir:

- Primary responsibility for shaping shifts here
- Betting table decisions are ours to make
- Protecting cycle time is Chris’ job
