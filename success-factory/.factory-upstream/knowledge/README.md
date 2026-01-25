# Knowledge Base

This folder contains shared knowledge that informs ALL Moovs Factory skills - both product and GTM.

## Structure

```
knowledge/
├── brand/
│   └── voice-guidelines.md    # How Moovs communicates
├── customers/
│   └── icp-definitions.md     # Our 4 ideal customer profiles
└── product/
    └── platform-overview.md   # What Moovs does, key features
```

## How Skills Use This Knowledge

| Knowledge File         | Used By                                                |
| ---------------------- | ------------------------------------------------------ |
| `voice-guidelines.md`  | blog-post, email-sequence, release-notes, landing-page |
| `icp-definitions.md`   | customer-research, email-sequence, blog-post, shaping  |
| `platform-overview.md` | shaping, blog-post, landing-page, customer-research    |

## Adding Knowledge

When adding new knowledge:

1. **Keep it factual** - This is reference material, not opinion
2. **Keep it current** - Update when things change
3. **Reference from skills** - Use `@knowledge/brand/voice-guidelines.md` in skill prompts

## What Doesn't Belong Here

- Process documentation (belongs in MOOVING.md or skill-specific guides)
- Generated content (belongs in output folders like /content, /shaping)
- Temporary research (belongs in working docs, not permanent knowledge)
