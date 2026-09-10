# Asset wishlist — Cyberpunk Journal

Things worth making as real assets (Figma/Illustrator/Midjourney/etc.) instead of more hand-coded CSS or inline SVG. Written after the full six-page redesign pass (landing, login, register, planner, journal, to-do).

## 1. A real wordmark / logo mark

**What:** A designed logo — even a simple geometric glyph next to "CYBERPUNK JOURNAL," not just styled text.
**Where:** Header (`#public-header` / `#app-header`, every page) and footer (`index.html`).
**Why:** Right now the "logo" is just two colored words (`.wordmark` in `styles.css`). Every game HUD reference you gave has an actual mark or crest, not a text lockup. A small vector mark would make the header read as a real product identity instead of a placeholder name.

## 2. App icon / favicon

**What:** A proper favicon built from the same mark as #1.
**Where:** `mock/assets/favicon.svg`, referenced in every page's `<head>`.
**Why:** Current one is a generic placeholder shape, not a designed icon — first thing that shows in a browser tab.

## 3. A background texture ("wallpaper")

**What:** A subtle noise, scanline, or fine circuit-trace texture image (or a couple of variants — one darker for busy pages, one calmer for reading pages like the journal editor).
**Where:** `body` background in `styles.css` (currently a flat repeating CSS gradient grid, `body { background-image: linear-gradient(...) }`), most visible on the landing hero and the planner hub.
**Why:** A CSS grid pattern is flat and repeats identically everywhere. A real texture (even very subtle) reads as "designed surface" rather than "generated background," which is exactly the kind of generic tell the redesign pass is working against.

## 4. A custom icon set

**What:** A small icon set (12–15 icons: journal, tasks, chat, friends, posts, search, lock, calendar, bolt, plus whatever new pages need) with actual character — not uniform thin outline strokes.
**Where:** Every `[data-icon]` usage — nav, planner hub nodes, journal sidebar, task rows. Defined centrally in `assets/common.js`'s `ICONS` object.
**Why:** Current icons are minimal single-weight inline SVGs I wrote by hand — functional but generic. A cohesive hand-designed set (even a licensed icon pack in this aesthetic) would read as a deliberate visual system instead of "whatever a placeholder icon looks like."

## 5. A hero visual for the landing page

**What:** A small looping glitch/scanline animation, or a single striking illustration/photo-treatment panel — something with real visual weight, not just text and CSS boxes.
**Where:** `index.html` hero section, likely inside or beside `.hero-terminal`.
**Why:** Every reference screenshot you gave pairs a list/data panel with an actual image (a car photo, a location thumbnail). Our hero terminal is currently list-only — text and checkboxes. One real visual asset here would close that gap and give the page an actual "hero" moment instead of a UI mockup pretending to be one.

## Notes

- None of these block functionality — the site works fully without them. They're upgrades to visual richness that CSS alone can't deliver.
- Keep the approved palette (`concept/docs/color.md`, Option 1) for anything you make — don't let a generated asset drift the hex values.
- Start with #1 (logo) and #4 (icon set) — they touch every page immediately, so they'll have the biggest visible impact for the least new surface area.
