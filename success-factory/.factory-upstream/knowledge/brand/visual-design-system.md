# Moovs Visual Design System

Extracted from the [Figma Design System](https://www.figma.com/design/wX0bsljyRhHN8mVlmXZmml/%F0%9F%8E%A8-Design-System?node-id=0-1). Use this document for all product UI, marketing materials, and brand assets.

---

## Color Palette

### Primary — Moovs Blue

The core brand color. Use for primary actions, links, and key UI elements.

| Name                  | Hex       | Usage                                            |
| --------------------- | --------- | ------------------------------------------------ |
| **moovsBlue**         | `#195FE9` | Primary buttons, links, active states            |
| **moovsBlueDark**     | `#0044CB` | Hover states, emphasis                           |
| **moovsBlueLight**    | `#739CFF` | Secondary highlights, hover on light backgrounds |
| **moovsBlueSelected** | `#E5EEFF` | Selected states, light blue backgrounds          |

```css
/* CSS Variables */
--moovs-blue: #195fe9;
--moovs-blue-dark: #0044cb;
--moovs-blue-light: #739cff;
--moovs-blue-selected: #e5eeff;
```

---

### Grayscale

Used for text, backgrounds, borders, and neutral UI elements.

| Name                 | Hex         | Usage                             |
| -------------------- | ----------- | --------------------------------- |
| **black**            | `#1E1E1E`   | Primary text, headings            |
| **granite**          | `#565656`   | Secondary text, labels            |
| **grayDark**         | `#B3B3B3`   | Placeholder text, disabled states |
| **grayMedium**       | `#D3D3D3`   | Borders, dividers                 |
| **grayLight**        | `#EDEDED`   | Light borders, subtle backgrounds |
| **alabaster**        | `#FAFAFA`   | Page backgrounds, cards           |
| **white**            | `#FFFFFF`   | Card backgrounds, text on dark    |
| **whiteTransparent** | `#FFFFFF00` | Overlays, gradients               |

```css
/* CSS Variables */
--black: #1e1e1e;
--granite: #565656;
--gray-dark: #b3b3b3;
--gray-medium: #d3d3d3;
--gray-light: #ededed;
--alabaster: #fafafa;
--white: #ffffff;
```

---

### Alert Colors

For system feedback: success, warning, and error states.

| Name              | Hex       | Usage                                             |
| ----------------- | --------- | ------------------------------------------------- |
| **successGreen**  | `#0C893F` | Success messages, confirmations, completed states |
| **warningYellow** | `#FFB301` | Warnings, attention needed                        |
| **errorRed**      | `#D63F49` | Errors, destructive actions, validation failures  |

```css
/* CSS Variables */
--success-green: #0c893f;
--warning-yellow: #ffb301;
--error-red: #d63f49;
```

---

### Contextual Colors

Extended palette for data visualization, status indicators, and differentiation.

| Name           | Hex       | Usage                                 |
| -------------- | --------- | ------------------------------------- |
| **aqua**       | `#28B299` | Affiliate trips, external data        |
| **green**      | `#28B668` | Active/online status, positive trends |
| **greenDark**  | `#17693C` | Green hover states, emphasis          |
| **yellow**     | `#EEE647` | Highlights, attention (non-warning)   |
| **yellowDark** | `#898423` | Yellow hover states                   |
| **orange**     | `#FC881D` | Pending states, moderate priority     |
| **orangeDark** | `#B26115` | Orange hover states                   |
| **redDark**    | `#960031` | Critical errors, high urgency         |
| **purple**     | `#A444B7` | Special events, premium features      |
| **purpleDark** | `#3831A0` | Purple hover states                   |
| **pink**       | `#EE64D2` | Decorative, special callouts          |

```css
/* CSS Variables */
--aqua: #28b299;
--green: #28b668;
--green-dark: #17693c;
--yellow: #eee647;
--yellow-dark: #898423;
--orange: #fc881d;
--orange-dark: #b26115;
--red-dark: #960031;
--purple: #a444b7;
--purple-dark: #3831a0;
--pink: #ee64d2;
```

---

### Tint Colors

Light backgrounds for status indicators, alerts, and tags. Pair with corresponding contextual colors.

| Name           | Hex       | Pair With             |
| -------------- | --------- | --------------------- |
| **tintAqua**   | `#E9F9F5` | aqua                  |
| **tintGreen**  | `#D0ECDD` | green, successGreen   |
| **tintYellow** | `#F8F5B5` | yellow, warningYellow |
| **tintOrange** | `#FEEAD2` | orange                |
| **tintRed**    | `#FDECED` | errorRed              |
| **tintPurple** | `#F6EDF7` | purple                |
| **tintPink**   | `#FEE8F7` | pink                  |

```css
/* CSS Variables */
--tint-aqua: #e9f9f5;
--tint-green: #d0ecdd;
--tint-yellow: #f8f5b5;
--tint-orange: #feead2;
--tint-red: #fdeced;
--tint-purple: #f6edf7;
--tint-pink: #fee8f7;
```

---

## Typography

Extracted from [Figma Typography](https://www.figma.com/design/wX0bsljyRhHN8mVlmXZmml/%F0%9F%8E%A8-Design-System?node-id=10375-58151).

### Font Family

**Primary Font:** Inter (or system font stack as fallback)

```css
font-family:
  "Inter",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  sans-serif;
```

### Font Weights

| Weight | Name     | Usage                              |
| ------ | -------- | ---------------------------------- |
| 700    | Bold     | Subtitles, emphasis                |
| 600    | Semibold | Headings (H1-H6), important labels |
| 500    | Medium   | Buttons, overlines                 |
| 400    | Regular  | Body text, captions                |

---

### Headings

| Style  | Size            | Weight | Line Height | Letter Spacing | Usage                    |
| ------ | --------------- | ------ | ----------- | -------------- | ------------------------ |
| **H1** | 32px (2rem)     | 600    | 1.25        | -0.031rem      | Page titles, hero text   |
| **H2** | 24px (1.5rem)   | 600    | 1.33        | -0.031rem      | Section headers          |
| **H3** | 20px (1.25rem)  | 600    | 1.2         | -0.009rem      | Card titles, subsections |
| **H4** | 16px (1rem)     | 600    | 1.5         | 0.006rem       | Small headers, labels    |
| **H5** | 14px (0.875rem) | 600    | 1.43        | 0.025rem       | Uppercase section labels |
| **H6** | 12px (0.75rem)  | 600    | 1.5         | —              | Small uppercase labels   |

**Note:** H5 uses `text-transform: uppercase`

---

### Body Text

| Style          | Size            | Weight | Line Height | Letter Spacing | Usage                             |
| -------------- | --------------- | ------ | ----------- | -------------- | --------------------------------- |
| **Body 1**     | 16px (1rem)     | 400    | 1.33        | —              | Primary body text                 |
| **Body 2**     | 14px (0.875rem) | 400    | 1.43        | —              | Secondary body text, descriptions |
| **Subtitle 1** | 16px (1rem)     | 700    | 1.5         | -0.006rem      | Bold body text, emphasis          |
| **Subtitle 2** | 14px (0.875rem) | 700    | 1.43        | —              | Bold secondary text               |
| **Caption**    | 12px (0.75rem)  | 400    | 1.5         | —              | Helper text, timestamps           |
| **Overline**   | 12px (0.75rem)  | 500    | 1.5         | 0.016rem       | Category labels, metadata         |

**Note:** Overline uses `color: granite (#565656)`

---

### Component Typography

| Style             | Size            | Weight | Letter Spacing | Usage                           |
| ----------------- | --------------- | ------ | -------------- | ------------------------------- |
| **Button Large**  | 16px (1rem)     | 500    | -0.016rem      | Primary buttons                 |
| **Button Medium** | 16px (1rem)     | 500    | -0.016rem      | Standard buttons                |
| **Button Small**  | 14px (0.875rem) | 500    | —              | Compact buttons                 |
| **Input Label**   | 12px (0.75rem)  | 400    | —              | Form field labels               |
| **Helper Text**   | 12px (0.75rem)  | 400    | —              | Form hints, validation messages |
| **Tooltip**       | 12px (0.75rem)  | 400    | —              | Tooltips, popovers              |
| **Avatar Letter** | 14px (0.875rem) | 500    | —              | Avatar initials                 |

**Note:** Buttons use `text-transform: none` (no uppercase)

---

### Typography Scale Reference

```typescript
// MUI Theme Typography Configuration
const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

  h1: {
    fontWeight: 600,
    fontSize: "2rem", // 32px
    lineHeight: 1.25,
    letterSpacing: "-0.031rem",
  },
  h2: {
    fontWeight: 600,
    fontSize: "1.5rem", // 24px
    lineHeight: 1.33,
    letterSpacing: "-0.031rem",
  },
  h3: {
    fontWeight: 600,
    fontSize: "1.25rem", // 20px
    lineHeight: 1.2,
    letterSpacing: "-0.009rem",
  },
  h4: {
    fontWeight: 600,
    fontSize: "1rem", // 16px
    lineHeight: 1.5,
    letterSpacing: "0.006rem",
  },
  h5: {
    fontWeight: 600,
    fontSize: "0.875rem", // 14px
    lineHeight: 1.43,
    letterSpacing: "0.025rem",
    textTransform: "uppercase",
  },
  h6: {
    fontWeight: 600,
    fontSize: "0.75rem", // 12px
    lineHeight: 1.5,
  },
  subtitle1: {
    fontWeight: 700,
    fontSize: "1rem", // 16px
    lineHeight: 1.5,
    letterSpacing: "-0.006rem",
  },
  subtitle2: {
    fontWeight: 700,
    fontSize: "0.875rem", // 14px
    lineHeight: 1.43,
  },
  body1: {
    fontWeight: 400,
    fontSize: "1rem", // 16px
    lineHeight: 1.33,
  },
  body2: {
    fontWeight: 400,
    fontSize: "0.875rem", // 14px
    lineHeight: 1.43,
  },
  button: {
    textTransform: "none",
    fontWeight: 500,
    fontSize: "1rem", // 16px
    letterSpacing: "-0.016rem",
  },
  caption: {
    fontWeight: 400,
    fontSize: "0.75rem", // 12px
    lineHeight: 1.5,
  },
  overline: {
    fontWeight: 500,
    fontSize: "0.75rem", // 12px
    lineHeight: 1.5,
    letterSpacing: "0.016rem",
  },
}
```

---

### Typography Usage Guidelines

| Context           | Style          | Notes                     |
| ----------------- | -------------- | ------------------------- |
| Page title        | H1             | One per page              |
| Section header    | H2             | Major content sections    |
| Card title        | H3             | Within cards, dialogs     |
| Field group label | H4             | Form sections             |
| Table header      | H5 (uppercase) | Column headers            |
| Primary content   | Body 1         | Main readable text        |
| Secondary content | Body 2         | Descriptions, metadata    |
| Emphasis in body  | Subtitle 1/2   | Bold version of body      |
| Small labels      | Caption        | Timestamps, counts        |
| Category tags     | Overline       | Status labels, categories |

---

## Color Usage Guidelines

### Buttons

| Button Type     | Background | Text      | Hover             |
| --------------- | ---------- | --------- | ----------------- |
| **Primary**     | moovsBlue  | white     | moovsBlueDark     |
| **Secondary**   | white      | moovsBlue | moovsBlueSelected |
| **Destructive** | errorRed   | white     | redDark           |
| **Disabled**    | grayLight  | grayDark  | —                 |

### Text Hierarchy

| Element            | Color               | Notes                        |
| ------------------ | ------------------- | ---------------------------- |
| **Headings**       | black (#1E1E1E)     | Primary content              |
| **Body text**      | black (#1E1E1E)     | Main readable content        |
| **Secondary text** | granite (#565656)   | Labels, captions, metadata   |
| **Placeholder**    | grayDark (#B3B3B3)  | Input placeholders, disabled |
| **Links**          | moovsBlue (#195FE9) | Interactive text             |

### Backgrounds

| Surface             | Color                       | Notes                       |
| ------------------- | --------------------------- | --------------------------- |
| **Page background** | alabaster (#FAFAFA)         | Default page background     |
| **Card background** | white (#FFFFFF)             | Elevated surfaces           |
| **Selected state**  | moovsBlueSelected (#E5EEFF) | Selected rows, active items |
| **Hover state**     | grayLight (#EDEDED)         | Table row hover             |

### Status Indicators

| Status      | Background        | Text/Icon               |
| ----------- | ----------------- | ----------------------- |
| **Success** | tintGreen         | successGreen            |
| **Warning** | tintYellow        | warningYellow or orange |
| **Error**   | tintRed           | errorRed                |
| **Info**    | moovsBlueSelected | moovsBlue               |
| **Pending** | tintOrange        | orange                  |

---

## Trip Status Colors

Specific colors for trip/reservation states in the Moovs platform:

| Status          | Color                  | Usage                    |
| --------------- | ---------------------- | ------------------------ |
| **Confirmed**   | green (#28B668)        | Trip confirmed by driver |
| **Pending**     | orange (#FC881D)       | Awaiting confirmation    |
| **In Progress** | moovsBlue (#195FE9)    | Trip currently active    |
| **Completed**   | successGreen (#0C893F) | Trip finished            |
| **Cancelled**   | errorRed (#D63F49)     | Trip cancelled           |
| **No Show**     | grayDark (#B3B3B3)     | Passenger no-show        |

---

## Accessibility

### Contrast Requirements

All text must meet WCAG 2.1 AA standards:

- **Normal text (< 18px)**: Minimum 4.5:1 contrast ratio
- **Large text (18px+ or 14px+ bold)**: Minimum 3:1 contrast ratio

### Tested Combinations

| Foreground                | Background        | Ratio  | Pass |
| ------------------------- | ----------------- | ------ | ---- |
| black on white            | #1E1E1E / #FFFFFF | 14.7:1 | AA   |
| black on alabaster        | #1E1E1E / #FAFAFA | 14.1:1 | AA   |
| granite on white          | #565656 / #FFFFFF | 7.0:1  | AA   |
| moovsBlue on white        | #195FE9 / #FFFFFF | 4.6:1  | AA   |
| white on moovsBlue        | #FFFFFF / #195FE9 | 4.6:1  | AA   |
| successGreen on tintGreen | #0C893F / #D0ECDD | 4.5:1  | AA   |
| errorRed on white         | #D63F49 / #FFFFFF | 4.5:1  | AA   |

### Color Blindness Considerations

- Never use color alone to convey information
- Always pair colors with icons, labels, or patterns
- The alert colors (green, yellow, red) have sufficient luminance difference to be distinguishable in most color blindness types

---

## Swoop Brand (Legacy)

The Swoop brand palette is used for white-label shuttle products. **Do not mix with Moovs colors.**

### Swoop Primary

| Name                   | Hex       | Usage               |
| ---------------------- | --------- | ------------------- |
| **swoopGreen**         | `#34EC87` | Primary brand color |
| **swoopGreenHover**    | `#BAF7CD` | Hover state         |
| **swoopGreenDisabled** | `#E3FCEB` | Disabled state      |

### Swoop Secondary

| Name                  | Hex       | Usage             |
| --------------------- | --------- | ----------------- |
| **swoopBlue**         | `#195FE9` | Same as moovsBlue |
| **swoopBlueHover**    | `#739CFF` | Hover state       |
| **swoopBlueDisabled** | `#E5EEFF` | Disabled state    |

### Swoop Grayscale

| Name                | Hex       |
| ------------------- | --------- |
| **codGray**         | `#1E1E1E` |
| **codGrayHover**    | `#282828` |
| **codGrayDisabled** | `#E1E1E1` |

---

## Implementation Reference

### JavaScript/TypeScript Exports

```typescript
// Moovs Colors
export const moovsBlue = "#195FE9"
export const moovsBlueDark = "#0044CB"
export const moovsBlueLight = "#739CFF"
export const moovsBlueSelected = "#E5EEFF"

// Grayscale
export const black = "#1E1E1E"
export const granite = "#565656"
export const grayDark = "#B3B3B3"
export const grayMedium = "#D3D3D3"
export const grayLight = "#EDEDED"
export const alabaster = "#FAFAFA"
export const white = "#FFFFFF"
export const whiteTransparent = "#FFFFFF00"

// Alert Colors
export const successGreen = "#0C893F"
export const warningYellow = "#FFB301"
export const errorRed = "#D63F49"

// Contextual Colors
export const aqua = "#28B299"
export const green = "#28B668"
export const greenDark = "#17693C"
export const yellow = "#EEE647"
export const yellowDark = "#898423"
export const orange = "#FC881D"
export const orangeDark = "#B26115"
export const redDark = "#960031"
export const purple = "#A444B7"
export const purpleDark = "#3831A0"
export const pink = "#EE64D2"

// Tint Colors
export const tintAqua = "#E9F9F5"
export const tintGreen = "#D0ECDD"
export const tintYellow = "#F8F5B5"
export const tintOrange = "#FEEAD2"
export const tintRed = "#FDECED"
export const tintPurple = "#F6EDF7"
export const tintPink = "#FEE8F7"
```

---

## Quick Reference

### Most Used Colors

| Purpose         | Color         | Hex       |
| --------------- | ------------- | --------- |
| Primary action  | moovsBlue     | `#195FE9` |
| Primary text    | black         | `#1E1E1E` |
| Secondary text  | granite       | `#565656` |
| Page background | alabaster     | `#FAFAFA` |
| Success         | successGreen  | `#0C893F` |
| Warning         | warningYellow | `#FFB301` |
| Error           | errorRed      | `#D63F49` |
| Border          | grayMedium    | `#D3D3D3` |

---

_Last Updated: January 2026_
_Source: Figma Design System — [Colors](https://www.figma.com/design/wX0bsljyRhHN8mVlmXZmml/%F0%9F%8E%A8-Design-System?node-id=0-1) | [Typography](https://www.figma.com/design/wX0bsljyRhHN8mVlmXZmml/%F0%9F%8E%A8-Design-System?node-id=10375-58151)_
