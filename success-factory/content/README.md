# Content Output

Generated marketing and communications content lives here.

## Structure

```
content/
├── blog/              # Blog posts from /blog-post skill
├── email-sequences/   # Email sequences from /email-sequence skill
└── release-notes/     # Release notes from /release-notes skill
```

## Workflow

1. Run a GTM skill (e.g., `/blog-post`)
2. Answer the interview questions
3. Skill generates content and saves here
4. Review, edit if needed, then publish

## File Naming

- **Blog posts:** `slug-based-on-title.md`
- **Email sequences:** `sequence-name/` folder with SEQUENCE.md + individual emails
- **Release notes:** `YYYY-MM.md` or `vX.X.X.md`
