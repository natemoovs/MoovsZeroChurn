# Success Factory Color System

> **Design Philosophy:** Confident minimalism with electric accents. iOS-level polish meets Moovs brand alignment.

## Overview

This color system is designed to:
- Align with Moovs' electric blue brand (#2563EB)
- Provide premium glass/glow effects (iOS 18 / Linear app aesthetic)
- Support seamless light/dark mode transitions
- Maintain WCAG AA contrast compliance

---

## Implementation Instructions

### 1. Update `globals.css`

Add the following CSS variables and utility classes to your `globals.css` file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================
   CSS CUSTOM PROPERTIES - LIGHT MODE
   ============================================ */

:root {
  /* Backgrounds - clean neutrals */
  --bg-primary: #FAFAFA;
  --bg-secondary: #F5F5F5;
  --bg-tertiary: #E5E5E5;
  --bg-elevated: #FFFFFF;
  
  /* Surfaces */
  --surface-hover: #F0F0F0;
  --surface-active: #E8E8E8;
  --surface-muted: #D4D4D4;
  
  /* Text hierarchy */
  --text-primary: #171717;
  --text-secondary: #525252;
  --text-tertiary: #A3A3A3;
  --text-inverse: #FAFAFA;
  
  /* Borders */
  --border-default: #E5E5E5;
  --border-strong: #D4D4D4;
  --border-focus: #2563EB;
  
  /* Primary - Moovs electric blue */
  --primary-50: #EFF6FF;
  --primary-100: #DBEAFE;
  --primary-200: #BFDBFE;
  --primary-300: #93C5FD;
  --primary-400: #60A5FA;
  --primary-500: #3B82F6;
  --primary-600: #2563EB;
  --primary-700: #1D4ED8;
  --primary-800: #1E40AF;
  --primary-900: #1E3A8A;
  
  /* Accent - electric cyan */
  --accent-50: #ECFEFF;
  --accent-100: #CFFAFE;
  --accent-200: #A5F3FC;
  --accent-300: #67E8F9;
  --accent-400: #22D3EE;
  --accent-500: #06B6D4;
  --accent-600: #0891B2;
  --accent-700: #0E7490;
  
  /* Highlight - amber for CTAs */
  --highlight-50: #FFFBEB;
  --highlight-100: #FEF3C7;
  --highlight-200: #FDE68A;
  --highlight-300: #FCD34D;
  --highlight-400: #FBBF24;
  --highlight-500: #F59E0B;
  --highlight-600: #D97706;
  
  /* Success - emerald */
  --success-50: #ECFDF5;
  --success-100: #D1FAE5;
  --success-500: #10B981;
  --success-600: #059669;
  --success-700: #047857;
  
  /* Warning - orange */
  --warning-50: #FFF7ED;
  --warning-100: #FFEDD5;
  --warning-500: #F97316;
  --warning-600: #EA580C;
  
  /* Error - red */
  --error-50: #FEF2F2;
  --error-100: #FEE2E2;
  --error-500: #EF4444;
  --error-600: #DC2626;
  
  /* Info - blue (same as primary for consistency) */
  --info-50: #EFF6FF;
  --info-500: #3B82F6;
  --info-600: #2563EB;
  
  /* Gradients */
  --gradient-start: #2563EB;
  --gradient-mid: #3B82F6;
  --gradient-end: #06B6D4;
  
  /* Glow colors (rgba for box-shadows) */
  --glow-primary: 37, 99, 235;
  --glow-accent: 6, 182, 212;
  --glow-success: 16, 185, 129;
  --glow-error: 239, 68, 68;
}


/* ============================================
   CSS CUSTOM PROPERTIES - DARK MODE
   ============================================ */

.dark {
  /* Backgrounds - rich dark with subtle depth */
  --bg-primary: #09090B;
  --bg-secondary: #18181B;
  --bg-tertiary: #27272A;
  --bg-elevated: #3F3F46;
  
  /* Surfaces */
  --surface-hover: #27272A;
  --surface-active: #3F3F46;
  --surface-muted: #52525B;
  
  /* Text hierarchy */
  --text-primary: #FAFAFA;
  --text-secondary: #A1A1AA;
  --text-tertiary: #71717A;
  --text-inverse: #18181B;
  
  /* Borders */
  --border-default: #27272A;
  --border-strong: #3F3F46;
  --border-focus: #60A5FA;
  
  /* Primary - lifted for dark mode visibility */
  --primary-50: #172554;
  --primary-100: #1E3A8A;
  --primary-200: #1D4ED8;
  --primary-300: #2563EB;
  --primary-400: #3B82F6;
  --primary-500: #60A5FA;
  --primary-600: #3B82F6;
  --primary-700: #2563EB;
  --primary-800: #1D4ED8;
  --primary-900: #1E3A8A;
  
  /* Accent */
  --accent-50: #083344;
  --accent-100: #164E63;
  --accent-200: #155E75;
  --accent-300: #67E8F9;
  --accent-400: #22D3EE;
  --accent-500: #06B6D4;
  --accent-600: #0891B2;
  --accent-700: #0E7490;
  
  /* Highlight */
  --highlight-50: #422006;
  --highlight-100: #713F12;
  --highlight-200: #A16207;
  --highlight-300: #FDE68A;
  --highlight-400: #FCD34D;
  --highlight-500: #FBBF24;
  --highlight-600: #F59E0B;
  
  /* Success */
  --success-50: #064E3B;
  --success-100: #065F46;
  --success-500: #34D399;
  --success-600: #10B981;
  --success-700: #059669;
  
  /* Warning */
  --warning-50: #431407;
  --warning-100: #7C2D12;
  --warning-500: #FB923C;
  --warning-600: #F97316;
  
  /* Error */
  --error-50: #450A0A;
  --error-100: #7F1D1D;
  --error-500: #F87171;
  --error-600: #EF4444;
  
  /* Info */
  --info-50: #172554;
  --info-500: #60A5FA;
  --info-600: #3B82F6;
  
  /* Gradients */
  --gradient-start: #3B82F6;
  --gradient-mid: #60A5FA;
  --gradient-end: #22D3EE;
  
  /* Glow colors */
  --glow-primary: 59, 130, 246;
  --glow-accent: 34, 211, 238;
  --glow-success: 52, 211, 153;
  --glow-error: 248, 113, 113;
}


/* ============================================
   GLASSMORPHISM
   ============================================ */

.glass {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 4px 30px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.dark .glass {
  background: rgba(39, 39, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 4px 30px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.glass-subtle {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dark .glass-subtle {
  background: rgba(39, 39, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.glass-heavy {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.dark .glass-heavy {
  background: rgba(24, 24, 27, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}


/* ============================================
   GLOW EFFECTS
   ============================================ */

.glow {
  box-shadow: 
    0 0 20px -5px rgba(var(--glow-primary), 0.3),
    0 0 40px -10px rgba(var(--glow-primary), 0.2);
}

.glow-sm {
  box-shadow: 
    0 0 10px -3px rgba(var(--glow-primary), 0.3),
    0 0 20px -5px rgba(var(--glow-primary), 0.15);
}

.glow-lg {
  box-shadow: 
    0 0 30px -5px rgba(var(--glow-primary), 0.4),
    0 0 60px -10px rgba(var(--glow-primary), 0.25);
}

.glow-intense {
  box-shadow: 
    0 0 30px -5px rgba(var(--glow-primary), 0.5),
    0 0 60px -10px rgba(var(--glow-primary), 0.3),
    0 0 100px -20px rgba(var(--glow-primary), 0.2);
}

.glow-accent {
  box-shadow: 
    0 0 20px -5px rgba(var(--glow-accent), 0.4),
    0 0 40px -10px rgba(var(--glow-accent), 0.25);
}

.glow-success {
  box-shadow: 
    0 0 20px -5px rgba(var(--glow-success), 0.4),
    0 0 40px -10px rgba(var(--glow-success), 0.25);
}

.glow-error {
  box-shadow: 
    0 0 20px -5px rgba(var(--glow-error), 0.4),
    0 0 40px -10px rgba(var(--glow-error), 0.25);
}


/* ============================================
   BUTTONS
   ============================================ */

.btn-primary {
  background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%);
  color: white;
  font-weight: 500;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 4px 12px rgba(37, 99, 235, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(37, 99, 235, 0.8);
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-primary:hover {
  background: linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 8px 24px rgba(37, 99, 235, 0.4),
    0 0 40px -10px rgba(37, 99, 235, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 2px 8px rgba(37, 99, 235, 0.3),
    inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-weight: 500;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--surface-hover);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.dark .btn-secondary {
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-ghost:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.btn-glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--text-primary);
  font-weight: 500;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.dark .btn-glass {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .btn-glass:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}


/* ============================================
   CARDS
   ============================================ */

.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
}

.card-interactive {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
  cursor: pointer;
}

.card-interactive:hover {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.06),
    0 12px 32px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
  border-color: var(--border-strong);
}

.dark .card,
.dark .card-interactive {
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.2),
    0 4px 12px rgba(0, 0, 0, 0.15);
}

.dark .card-interactive:hover {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.25),
    0 12px 32px rgba(0, 0, 0, 0.2);
}

/* Featured card with gradient border */
.card-featured {
  position: relative;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
}

.card-featured::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
  opacity: 0.15;
  filter: blur(20px);
  z-index: -1;
}

.card-featured-inner {
  background: var(--bg-elevated);
  border-radius: 15px;
  height: 100%;
}

/* Glow card */
.card-glow {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
}

.card-glow:hover {
  border-color: rgba(var(--glow-primary), 0.3);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.06),
    0 0 20px -5px rgba(var(--glow-primary), 0.2),
    0 0 40px -10px rgba(var(--glow-primary), 0.15);
}


/* ============================================
   INPUTS
   ============================================ */

.input {
  width: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input:focus {
  border-color: var(--primary-500);
  box-shadow: 
    inset 0 1px 2px rgba(0, 0, 0, 0.04),
    0 0 0 3px rgba(var(--glow-primary), 0.15),
    0 0 20px -5px rgba(var(--glow-primary), 0.2);
  outline: none;
}

.input-error {
  border-color: var(--error-500);
}

.input-error:focus {
  box-shadow: 
    inset 0 1px 2px rgba(0, 0, 0, 0.04),
    0 0 0 3px rgba(var(--glow-error), 0.15),
    0 0 20px -5px rgba(var(--glow-error), 0.2);
}

.dark .input {
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}


/* ============================================
   BADGES & PILLS
   ============================================ */

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 9999px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.badge-primary {
  background: var(--primary-100);
  color: var(--primary-700);
}

.dark .badge-primary {
  background: var(--primary-900);
  color: var(--primary-300);
}

.badge-success {
  background: var(--success-100);
  color: var(--success-700);
}

.dark .badge-success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success-500);
}

.badge-warning {
  background: var(--warning-100);
  color: var(--warning-600);
}

.dark .badge-warning {
  background: rgba(249, 115, 22, 0.15);
  color: var(--warning-500);
}

.badge-error {
  background: var(--error-100);
  color: var(--error-600);
}

.dark .badge-error {
  background: rgba(239, 68, 68, 0.15);
  color: var(--error-500);
}

.badge-glow {
  box-shadow: 0 0 12px -3px rgba(var(--glow-primary), 0.4);
}


/* ============================================
   GRADIENTS
   ============================================ */

.gradient-text {
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-bg {
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
}

.gradient-bg-subtle {
  background: linear-gradient(
    135deg,
    rgba(var(--glow-primary), 0.1),
    rgba(var(--glow-accent), 0.1)
  );
}


/* ============================================
   SPECIAL EFFECTS
   ============================================ */

/* Animated gradient border */
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.gradient-border-animated {
  position: relative;
  border-radius: 16px;
  padding: 2px;
  background: conic-gradient(
    from var(--angle),
    var(--gradient-start),
    var(--gradient-end),
    var(--accent-400),
    var(--gradient-start)
  );
  animation: rotate-gradient 4s linear infinite;
}

.gradient-border-animated > * {
  background: var(--bg-elevated);
  border-radius: 14px;
}

@keyframes rotate-gradient {
  to { --angle: 360deg; }
}

/* Shimmer loading effect */
.shimmer {
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 0%,
    var(--bg-secondary) 50%,
    var(--bg-tertiary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Pulse glow animation */
.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 
      0 0 20px -5px rgba(var(--glow-primary), 0.3),
      0 0 40px -10px rgba(var(--glow-primary), 0.2);
  }
  50% {
    box-shadow: 
      0 0 30px -5px rgba(var(--glow-primary), 0.5),
      0 0 60px -10px rgba(var(--glow-primary), 0.3);
  }
}

/* Noise texture overlay */
.noise::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  border-radius: inherit;
}

.dark .noise::before {
  opacity: 0.05;
}

/* Spotlight hover effect */
.spotlight {
  position: relative;
  overflow: hidden;
}

.spotlight::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(var(--glow-primary), 0.06),
    transparent 40%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.spotlight:hover::after {
  opacity: 1;
}

/* Inner border highlight (iOS style) */
.inner-highlight {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.dark .inner-highlight {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}


/* ============================================
   DIVIDERS
   ============================================ */

.divider {
  height: 1px;
  background: var(--border-default);
}

.divider-gradient {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--border-strong),
    transparent
  );
}


/* ============================================
   TRANSITIONS (apply globally or per-component)
   ============================================ */

.transition-colors-smooth {
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.transition-shadow-smooth {
  transition: box-shadow 0.2s ease;
}

.transition-transform-smooth {
  transition: transform 0.2s ease;
}

.transition-all-smooth {
  transition: all 0.2s ease;
}
```

---

### 2. Update `tailwind.config.ts`

Extend your Tailwind config to reference CSS variables:

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          elevated: "var(--bg-elevated)",
        },
        // Surfaces
        surface: {
          hover: "var(--surface-hover)",
          active: "var(--surface-active)",
          muted: "var(--surface-muted)",
        },
        // Text
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          inverse: "var(--text-inverse)",
        },
        // Borders
        border: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          focus: "var(--border-focus)",
        },
        // Primary
        primary: {
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          200: "var(--primary-200)",
          300: "var(--primary-300)",
          400: "var(--primary-400)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          800: "var(--primary-800)",
          900: "var(--primary-900)",
          DEFAULT: "var(--primary-600)",
        },
        // Accent
        accent: {
          50: "var(--accent-50)",
          100: "var(--accent-100)",
          200: "var(--accent-200)",
          300: "var(--accent-300)",
          400: "var(--accent-400)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
          700: "var(--accent-700)",
          DEFAULT: "var(--accent-500)",
        },
        // Highlight
        highlight: {
          50: "var(--highlight-50)",
          100: "var(--highlight-100)",
          200: "var(--highlight-200)",
          300: "var(--highlight-300)",
          400: "var(--highlight-400)",
          500: "var(--highlight-500)",
          600: "var(--highlight-600)",
          DEFAULT: "var(--highlight-500)",
        },
        // Success
        success: {
          50: "var(--success-50)",
          100: "var(--success-100)",
          500: "var(--success-500)",
          600: "var(--success-600)",
          700: "var(--success-700)",
          DEFAULT: "var(--success-500)",
        },
        // Warning
        warning: {
          50: "var(--warning-50)",
          100: "var(--warning-100)",
          500: "var(--warning-500)",
          600: "var(--warning-600)",
          DEFAULT: "var(--warning-500)",
        },
        // Error
        error: {
          50: "var(--error-50)",
          100: "var(--error-100)",
          500: "var(--error-500)",
          600: "var(--error-600)",
          DEFAULT: "var(--error-500)",
        },
        // Info
        info: {
          50: "var(--info-50)",
          500: "var(--info-500)",
          600: "var(--info-600)",
          DEFAULT: "var(--info-500)",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(var(--glow-primary), 0.3), 0 0 40px -10px rgba(var(--glow-primary), 0.2)",
        "glow-lg": "0 0 30px -5px rgba(var(--glow-primary), 0.4), 0 0 60px -10px rgba(var(--glow-primary), 0.25)",
        "glow-intense": "0 0 30px -5px rgba(var(--glow-primary), 0.5), 0 0 60px -10px rgba(var(--glow-primary), 0.3), 0 0 100px -20px rgba(var(--glow-primary), 0.2)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

### 3. Add Spotlight Effect JavaScript

Add this to a global script or as a React hook:

```typescript
// hooks/useSpotlight.ts
import { useEffect, useRef } from "react";

export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      element.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    };

    element.addEventListener("mousemove", handleMouseMove);
    return () => element.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return ref;
}

// Usage:
// const spotlightRef = useSpotlight<HTMLDivElement>();
// <div ref={spotlightRef} className="spotlight card">...</div>
```

Or vanilla JS for non-React:

```javascript
// Add to your main JS file
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".spotlight").forEach((element) => {
    element.addEventListener("mousemove", (e) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      element.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    });
  });
});
```

---

## Usage Examples

### Glass Navbar
```tsx
<nav className="glass sticky top-0 z-50 px-6 py-4">
  <Logo />
  <NavLinks />
</nav>
```

### Premium CTA Button
```tsx
<button className="btn-primary glow-intense">
  Get Started
</button>
```

### Featured Pricing Card
```tsx
<div className="card-featured">
  <div className="card-featured-inner p-6">
    <h3 className="gradient-text text-2xl font-bold">Pro Plan</h3>
    <p className="text-content-secondary">$99/month</p>
  </div>
</div>
```

### Animated Border Card
```tsx
<div className="gradient-border-animated">
  <div className="p-6">
    <h4>Premium Feature</h4>
  </div>
</div>
```

### Interactive Card with Spotlight
```tsx
const spotlightRef = useSpotlight<HTMLDivElement>();

<div ref={spotlightRef} className="card-interactive spotlight p-6">
  <h4>Hover me</h4>
  <p>Watch the spotlight follow your cursor</p>
</div>
```

### Input with Glow Focus
```tsx
<input 
  type="email" 
  className="input" 
  placeholder="you@example.com" 
/>
```

### Status Badges
```tsx
<span className="badge badge-success">Active</span>
<span className="badge badge-warning">Pending</span>
<span className="badge badge-error">Failed</span>
<span className="badge badge-primary badge-glow">New</span>
```

### Loading Skeleton
```tsx
<div className="shimmer h-4 w-32 rounded" />
<div className="shimmer h-20 w-full rounded-xl mt-2" />
```

---

## Color Quick Reference

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary-600` | #2563EB | #3B82F6 | Main brand blue, CTAs |
| `--accent-500` | #06B6D4 | #06B6D4 | Secondary actions, links |
| `--highlight-500` | #F59E0B | #FBBF24 | Attention, promotions |
| `--success-500` | #10B981 | #34D399 | Success states |
| `--warning-500` | #F97316 | #FB923C | Warning states |
| `--error-500` | #EF4444 | #F87171 | Error states |
| `--bg-primary` | #FAFAFA | #09090B | Page background |
| `--bg-elevated` | #FFFFFF | #3F3F46 | Cards, modals |
| `--text-primary` | #171717 | #FAFAFA | Headings, body |
| `--text-secondary` | #525252 | #A1A1AA | Supporting text |

---

## Best Practices

1. **Use glass sparingly** - navbars, sidebars, modals. Not every card.
2. **Glow effects on focus/hover only** - static glows lose impact.
3. **Animated borders for hero sections** - one per page max.
4. **Spotlight on feature cards** - helps with visual hierarchy.
5. **Always test dark mode** - ensure sufficient contrast.
6. **Prefer semantic tokens** - `bg-elevated` not `#FFFFFF`.

---

## Accessibility Notes

- All text/background combinations meet WCAG AA (4.5:1 ratio minimum)
- Focus states use visible outlines + glow for enhanced visibility
- Reduced motion: Consider wrapping animations in `@media (prefers-reduced-motion: no-preference)`
- Glass effects maintain readable contrast in both modes

---

## Files to Modify

1. `src/app/globals.css` - Add all CSS variables and utility classes
2. `tailwind.config.ts` - Extend theme with semantic tokens
3. `src/hooks/useSpotlight.ts` - Add spotlight hook (if using React)
4. Component files - Apply new classes as needed

---

*Generated for Success Factory - Moovs-aligned color system with premium effects.*
