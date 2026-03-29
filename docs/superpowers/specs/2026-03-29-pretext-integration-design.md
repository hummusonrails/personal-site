---
title: Pretext Integration Design
date: 2026-03-29
status: approved
---

# Pretext Integration Design

Two features integrating @chenglou/pretext into the portfolio site.

## Feature 1: Editorial Engine Hero (Home Page)

Replace the `.chat-empty` greeting area on the home page with a canvas-rendered editorial engine layout inspired by Pretext's Mockup 147 and somnai-dreams' editorial demos.

### Behavior
- Randomized greeting text becomes the **headline** rendered large in serif typography (top-left)
- Bio/portfolio summary text flows as **editorial body text** in two columns below the headline
- A **draggable glowing orb** acts as an obstacle — text reflows around it at 60fps
- **Drop cap** on the first paragraph character
- Suggestion buttons and chat input remain as DOM elements below the canvas
- On mobile/touch: static editorial layout without drag interaction (orb fixed position)

### Technical Approach
- Full `<canvas>` element rendered via Pretext
- `prepareWithSegments()` for headline and body text (one-time)
- `layoutNextLine()` per frame with varying widths based on orb position
- Orb position tracked via mousedown/mousemove/mouseup (drag) and mousemove (hover glow)
- Column layout: canvas divided into two columns with a gap, text fills left then right
- Headline uses `layoutWithLines()` at full width before columns begin
- `requestAnimationFrame` loop only active during drag; static render otherwise
- Canvas sized to container via ResizeObserver
- Font: Sohne for body, Georgia/serif for headline and drop cap
- Colors: #ececec text, #10a37f accent (orb, drop cap), #212121 background

### Accessibility
- Hidden `<div class="sr-only">` contains the greeting + subtitle text for screen readers
- Canvas has `aria-hidden="true"`
- Mobile fallback: static DOM rendering (no canvas)

### Files
- `src/components/PretextHero.astro` — new component, canvas + script tag
- `src/lib/pretext-hero.ts` — canvas rendering loop, orb drag, column layout, font loading
- `src/pages/index.astro` — swap `.chat-empty` content with `<PretextHero>`

## Feature 2: Magnetic Characters (Sub-Page Headings)

Page `<h1>` headings across about, blog, talks, projects, and book pages gain a magnetic cursor effect.

### Behavior
- Characters subtly drift **toward** the cursor when it's near the heading
- Nearest characters shift position (translate) and tint to the site's green accent (#10a37f)
- Intensity scales with proximity — closest characters move most
- Characters smoothly return to original position when cursor leaves
- Effect radius: ~120px from cursor
- Max displacement: ~8px translate
- Disabled on mobile/touch devices (no persistent cursor)

### Technical Approach
- Pure DOM manipulation, no canvas or Pretext needed
- Client-side JS splits heading text into per-character `<span>` elements on page load
- Each span gets `display: inline-block` and `transition: transform 0.15s ease, color 0.15s ease`
- Mousemove listener on the heading container:
  - For each character span, calculate distance from cursor to character center
  - If within radius, compute displacement vector pointing toward cursor
  - Apply `transform: translate(dx, dy)` scaled by proximity
  - Apply color interpolation toward #10a37f scaled by proximity
- Mouseleave: reset all transforms and colors
- Throttle mousemove to requestAnimationFrame

### Targeting
- Applied to `<h1>` elements that have `data-magnetic` attribute
- Added to: about.astro, blog/[...page].astro, talks.astro, projects.astro, book.astro
- Also applied to ListWithTagsLayout heading and PostLayout title

### Files
- `src/lib/magnetic-title.ts` — character splitting, mousemove handler, displacement math
- Modified pages: add `data-magnetic` attribute to h1 elements + import magnetic script
- `src/layouts/ListWithTagsLayout.astro` — add `data-magnetic` to heading
- `src/layouts/PostLayout.astro` — add `data-magnetic` to title h1

## Dependencies
- `@chenglou/pretext` (npm package, MIT license, ~0.0.3)
- No other new dependencies

## Mobile Strategy
- Hero: falls back to static DOM layout (current greeting text, no canvas)
- Headings: magnetic effect disabled, headings render normally
- Detection: `window.matchMedia('(hover: hover)')` or touch event detection
