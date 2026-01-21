# Blog Post Skill

Create blog posts that sound human, provide genuine value to transportation operators, and reflect Moovs' brand voice.

## Invocation

```
/blog-post
```

## What This Skill Does

1. Conducts a brief interview to understand the topic, type, and target audience
2. Researches using industry knowledge and Moovs product capabilities
3. Produces a publish-ready blog post following Moovs voice guidelines

## Required Knowledge

Before writing, load these knowledge files:
- @knowledge/brand/voice-guidelines.md - Writing style, tone, testimonials, proof points
- @knowledge/customers/overview.md - ICP segmentation and decision tree
- @knowledge/product/platform-overview.md - Product capabilities to reference

For segment-specific content, also load the relevant ICP:
- @knowledge/customers/black-car/smb.md, mid-market.md, or enterprise.md
- @knowledge/customers/shuttle/university.md, corporate.md, or operator.md

---

## Blog Post Types

### How-To Guides
Practical advice for transportation operators. Topics: dispatch, driver management, fleet growth, booking, pricing, marketing. Share actionable tips. Position Moovs features as natural solutions without being salesy.

### SEO Content
Articles targeting keywords operators search for. Lead with value, not product. Answer the searcher's question thoroughly. Weave in Moovs benefits organically.

### Thought Leadership (Amir Ghorbani)
Industry insights from Moovs' founder (parents owned a limo company 20+ years). Write in first person as Amir. Be direct and confident but not arrogant.

---

## Interview Questions

Ask these questions to scope the blog post:

### 1. Topic & Angle
"What topic should this blog post cover? Any specific angle or hook?"

*Examples:*
- "How to reduce no-shows" (How-To)
- "Airport pickup best practices" (SEO)
- "Why operators are switching from spreadsheets" (Thought Leadership)

### 2. Blog Type
"What type of post? (How-To Guide, SEO Content, or Thought Leadership from Amir)"

### 3. Target ICP
"Which segment is this for?"
- Black Car: SMB / Mid-Market / Enterprise
- Shuttle: University / Corporate / Operator
- All operators

*This determines terminology, examples, and pain points to reference.*

### 4. Goal
"What should readers do after reading? (Book a demo, try a feature, just learn)"

### 5. Product Tie-in
"Should this explicitly mention Moovs features, or be purely educational with a soft CTA?"

---

## Voice

- **Conversational**: Like talking to a fellow operator over coffee
- **Straightforward**: No fluff, no corporate speak, no buzzwords
- **Helpful**: Focus on solving problems, not selling
- **Confident but humble**: Know your stuff, respect the reader's experience

---

## Structure (800-1200 words)

1. **H1 Title**: Clear, engaging headline (specific and benefit-oriented)
2. **Hook** (50-75 words): Start with a relatable pain point or question
3. **Body** (650-900 words): 3-5 main points under H2 headings (H3 for subsections if needed)
4. **Testimonial**: Blockquote with real customer review (REQUIRED)
5. **Wrap-up** (75-100 words): Summarize key takeaway + CTA

---

## Required Elements

### Internal Links (2 minimum)
Link naturally to relevant Moovs pages: feature pages (dispatch, booking, driver app), related blog posts, or resources (ROI calculator, demo page).

### Customer Testimonial (1 required)
Include one real testimonial from @knowledge/brand/voice-guidelines.md that relates to the post topic:

> "Quote from customer review that relates to the post topic."
> — Customer Name, Business Type (via Capterra/G2)

**Available testimonials from voice-guidelines.md:**
- Josue P. - "Went from 3-5 trips per day to 10-15 on average" (growth)
- Tom D. - "Save hours a day now" (efficiency)
- Rob D. - "Was able to buy another vehicle because of Moovs" (growth/revenue)
- James L. - "98% client retention rate after 6 months" (retention)

### CTA
End with a natural call to book a demo:
- "Ready to see how this works in practice? Book a demo and we'll walk you through it."
- "Want to try this for your fleet? Book a demo—we'd love to show you around."

---

## Formatting

- Use H1 for title, H2 for main sections, H3 for subsections
- Short paragraphs (2-4 sentences max)
- Bullet points sparingly for lists of tips
- Include a table if data comparison helps

---

## Language Rules

**Use**: Easy to use, simple, straightforward, modern, automate, save time, all-in-one, community, reliable

**Avoid**: Revolutionary, disruptive, best-in-class, industry-leading, leverage, synergy, cutting-edge, seamless, frictionless

**Operator Language** (from voice-guidelines.md):
| Say This | Not This |
|----------|----------|
| Trip, ride, reservation | Journey, booking, order |
| Passenger, rider | Customer, client, user |
| Operator | Business owner, entrepreneur |
| Driver | Chauffeur (unless luxury context) |
| Dispatch | Operations management |
| Farm out | Outsource, subcontract |

---

## Example Opening

❌ **Too corporate**:
> "In today's competitive transportation landscape, leveraging cutting-edge technology solutions is essential for operational excellence."

✅ **Human and direct**:
> "If you're still juggling spreadsheets, phone calls, and sticky notes to manage your fleet, you know the chaos that creates. There's a better way—and it doesn't require a PhD in software to figure out."

---

## Output Format

Save the blog post to `/content/blog/[slug].md` with this frontmatter:

```markdown
---
title: "Blog Post Title"
description: "Meta description for SEO (150-160 chars)"
type: how-to | seo | thought-leadership
target_icp: black-car-smb | black-car-mid | black-car-enterprise | shuttle-university | shuttle-corporate | shuttle-operator | all
goal: awareness | consideration | conversion
word_count: [actual count]
created: YYYY-MM-DD
---

# Blog Post Title

[Content here]
```

---

## Quality Checklist

Before finalizing, verify:

- [ ] Title is specific and benefit-oriented
- [ ] Opening addresses operator's reality (50-75 words)
- [ ] Uses ground transportation terminology (not generic SaaS speak)
- [ ] Examples are specific and recognizable to target ICP
- [ ] **Includes at least one real customer testimonial**
- [ ] **Includes at least 2 internal links**
- [ ] Product mentions feel natural, not forced
- [ ] Call to action matches the stated goal
- [ ] No superlatives or marketing fluff
- [ ] Reads like a knowledgeable peer, not a vendor pitch
- [ ] Word count is 800-1200 words

---

## Examples

See `/examples/` folder for reference posts:
- `reducing-no-shows.md` - How-To guide with soft product tie-in
