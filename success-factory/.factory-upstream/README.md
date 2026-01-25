# Moovs Factory

AI-powered workspace for Moovs product and GTM work. Uses Claude Code with specialized skills for product shaping, customer research, content creation, and more.

## Setup

Clone the main Moovs repos so Claude has codebase context:

```bash
git clone git@github.com:theswoopapp/server.git
git clone git@github.com:theswoopapp/dooms-operator.git
git clone git@github.com:theswoopapp/dooms-customer.git
```

## Structure

```
moovs-factory/
├── CLAUDE.md                    # Main AI instructions
├── MOOVING.md                   # Product development process
│
├── knowledge/                   # Shared knowledge base
│   ├── brand/                   # Voice guidelines
│   ├── customers/               # ICP definitions
│   └── product/                 # Platform overview
│
├── .claude/
│   └── skills/                  # All skills (product + GTM)
│       ├── problem/             # Capture problems
│       ├── shaping/             # Shape features
│       ├── task-shaping/        # Shape tickets
│       ├── product-ops/         # Pipeline visibility
│       ├── tickets/             # Query Notion
│       ├── customer-research/   # Research operators
│       ├── blog-post/           # Write blog posts
│       ├── email-sequence/      # Create email campaigns
│       └── release-notes/       # Write release notes
│
├── problems/                    # Problem definition docs
├── shaping/                     # Shaping docs
├── content/                     # Generated GTM content
│   ├── blog/
│   ├── email-sequences/
│   └── release-notes/
└── walkthroughs/                # GIF walkthroughs
```

## Quick Start

### Product Work

```bash
# Capture a new problem
/problem

# Shape a feature for the betting table
/shaping

# Shape a ticket for development
/task-shaping

# Check product pipeline health
/product-ops

# Research a customer
/customer-research
```

### GTM Work

```bash
# Write a blog post
/blog-post

# Create an outbound email sequence
/email-sequence

# Write release notes
/release-notes
```

## Knowledge Base

The `/knowledge` folder contains shared context used by all skills:

| File                           | Purpose                       |
| ------------------------------ | ----------------------------- |
| `brand/voice-guidelines.md`    | How Moovs communicates        |
| `customers/icp-definitions.md` | Our 4 ideal customer profiles |
| `product/platform-overview.md` | What Moovs does               |

## MCP Setup

The factory connects to external services (Notion, HubSpot, etc.) via MCP servers. First-time setup takes ~5 minutes.

### Quick Setup (recommended)

Run the setup script and follow the prompts:

```bash
./scripts/setup-mcp.sh
source ~/.zshrc
```

OAuth services (Figma, Supabase, Slack, Stripe, Google Calendar) authenticate automatically via browser when first used. Just start using them and authorize when prompted.

Restart Claude Code after setup. Done.

### Verify connections

```bash
claude mcp list
```

All servers should show `✓ Connected`.

### Where to get API keys

| Service  | Where to get it                                                                         |
| -------- | --------------------------------------------------------------------------------------- |
| Notion   | [notion.so/my-integrations](https://www.notion.so/my-integrations) → Create integration |
| HubSpot  | Settings → Integrations → Private Apps → Create                                         |
| Metabase | Admin → Settings → Authentication → API Keys                                            |

### Troubleshooting

**"Missing environment variables" warning:**

- Run `./scripts/setup-mcp.sh` again
- Make sure to run `source ~/.zshrc` after
- Restart Claude Code

**OAuth service not connecting:**

- Re-run `claude mcp auth <service>`

## Integrations

The factory connects to:

- **Figma** - Design system, brand assets, UI designs
- **Notion** - Tickets database, problem docs
- **HubSpot** - CRM data for customer research
- **Supabase** - Billing and usage data
- **Metabase** - Analytics queries
- **Slack** - Team notifications
- **Stripe** - Payment data
- **Google Calendar** - Scheduling
