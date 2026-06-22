# KriCar — "Desert Premium" Design System

A complete visual redesign of the KriCar frontend. The product, architecture, routing,
i18n (ar/fr/en + RTL), dark mode, and all backend wiring are unchanged — **only the visual
layer was rebuilt**. The goal: trade the generic bright‑orange SaaS look for a warm,
editorial, distinctly North‑African aesthetic that reads bespoke rather than templated.

Tokens live in two places:
- **`tailwind.config.js`** — color ramps, fonts, type scale, radius, shadow, animation.
- **`src/index.css`** — CSS custom properties (light + dark), component classes, motion.

---

## 1. Color

Everything maps to a token; no arbitrary hexes are scattered in components.

### Clay / terracotta — primary accent (`primary` / `clay`)
The single confident accent. Drives CTAs, links, active states, brand mark.

| Stop | Hex | Use |
|------|-----|-----|
| 50  | `#FBF1EA` | tints, hover wells |
| 100 | `#F5DECE` | soft fills, badges |
| 500 | `#B5471D` | **base** — buttons, links (AA on white) |
| 600 | `#9E3C18` | hover |
| 700 | `#7E2F14` | text on light tints |
| dark accent | `#D9703F` | brightened clay for dark surfaces |

### Warm stone — neutrals (`gray`, redefined)
Tailwind's cold `gray` ramp was **replaced** with a warm sand/taupe ramp, so every existing
`gray-*` utility across the app warmed up in one move.

| Stop | Hex | Role |
|------|-----|------|
| 50  | `#FAF6EF` | page wells |
| 100 | `#F3ECE0` | sunken surfaces |
| 200 | `#E7DCCB` | hairline borders |
| 500 | `#8A7C66` | muted text |
| 700 | `#4A4234` | strong body text |
| 900 | `#1E1A13` | ink / footer / hero |

### Pine — trust & success (`pine`)
Earthy green for verified badges, KYC, success states, "available". Complements terracotta
without the clash of a generic blue. Base `#2F6B4F`.

### Honey — ratings & warnings (`honey`)
Warm gold for star ratings and "pending"/warning states. Base `#D9962B`.

### Semantic surface variables (`index.css`)
| Variable | Light | Dark |
|----------|-------|------|
| `--bg` | `#F7F1E7` | `#16130D` |
| `--surface` | `#FFFDF8` | `#211C14` |
| `--border` | `#E7DCCB` | `#342C1E` |
| `--text` | `#211C16` | `#F3ECE0` |
| `--muted` | `#6B5F4E` | `#B3A488` |
| `--accent` | `#B5471D` | `#D9703F` |

> No purple, no blue-by-default. The palette is intentional and restrained — one accent (clay),
> one trust hue (pine), one highlight (honey), warm neutrals.

## 2. Typography

A characterful pairing replaces "Inter at three sizes."

| Role | Family | Notes |
|------|--------|-------|
| Display / headings | **Fraunces** (variable serif) | editorial, optical sizing; `.font-display` / `.section-title` |
| Body / UI | **Plus Jakarta Sans** | modern, legible, distinct |
| Arabic (all) | **IBM Plex Sans Arabic** | premium RTL; auto-swaps the whole stack under `[dir="rtl"]`, and replaces Fraunces for Arabic headings (Fraunces has no Arabic glyphs) |

Display scale: `display-sm` 2.25rem · `display` 3rem · `display-lg` 3.75rem (tight tracking).

## 3. Space, radius, elevation

- **Radius:** `xl` 1rem, `2xl` 1.25rem, `3xl` 1.75rem. Cards use `2xl`; buttons `xl`.
- **Elevation:** warm‑tinted shadows (`rgba(46,33,18,…)`), never pure black. Scale `sm → xl`
  plus `shadow-clay` for the brand glow on primary buttons / logo.
- Generous section padding (`py-20`), `max-w-7xl` containers.

## 4. Motion (Framer Motion)

Motion is powered by **Framer Motion**, wrapped app-wide in `<MotionConfig reducedMotion="user">`
so everything automatically respects `prefers-reduced-motion`. Reusable primitives live in
`src/lib/motion.jsx`: `fadeUp`, `fadeIn`, `scaleIn`, `staggerContainer`, springs, plus the
`<Reveal>`, `<StaggerGroup>`, `<AnimatedHeading>`, and `<ScrollProgress>` helpers.

Where it's applied:
- **Hero** — word-by-word headline reveal, cascading eyebrow/subtitle/stats, spring search card.
- **Cards & grids** — `CarCard` lifts on hover / dips on tap (spring); featured, "Why", and stat
  grids stagger in on scroll.
- **Navigation** — route cross-fade (`motion.main` keyed by pathname), spring mobile menu,
  animated profile dropdown, rotating theme-toggle icon swap.
- **CarDetail** — gallery main image cross-fades between photos.
- **Dashboards** — booking lists and stat cards stagger in.
- **Global** — a thin clay scroll-progress bar; floating buttons spring in with hover/tap feedback.

Legacy CSS keyframes (`animate-slide-up`, `animate-float`, shimmer skeletons, scroll-reveal) remain
for lightweight cases; the CSS `prefers-reduced-motion` block disables them too.

## 5. Components (`index.css`)

`.btn-primary` (clay + glow) · `.btn-pine` · `.btn-secondary` · `.btn-ghost` ·
`.input` · `.card` · `.badge` + `.badge-pine` / `.badge-clay` / `.badge-honey` ·
`.section-title` · `.eyebrow` · `.skeleton`. Restyling these propagates app‑wide.

## 6. Icons

All emoji in the UI were replaced with inline outline SVG icons (Heroicons style) in the
brand palette — **no new dependency added**. Country flags remain in the language switcher
as functional locale indicators.

## 7. Do / Don't (avoid the "AI-generated" tells)

| Do | Don't |
|----|-------|
| One confident accent (clay) | Six competing accent colors / rainbow gradients |
| Warm sand neutrals | Cold `#f9fafb` / `#6b7280` grays |
| Fraunces display + Jakarta body | Inter everywhere at 3 sizes |
| Inline SVG icon set | Emoji as UI icons |
| Generous, asymmetric whitespace | Cramped uniform padding |
| Pine/honey/clay for semantics | Purple or default-blue chips |

---

## Functional fix made during the redesign

`react-leaflet` was pinned to `^5.0.0`, which **requires React 19** as a peer dependency,
while the project runs React `18.3.1`. That mismatch crashed every Leaflet map (CarDetail GPS,
Search map view, TrackCar) with a `Context.Consumer` error. It was downgraded to
**`react-leaflet@^4.2.1`** (the React‑18‑compatible line, identical API for `MapContainer`,
`TileLayer`, `Marker`, `Popup`, `useMap`, `divIcon`). This restores map functionality; no
map markup changed beyond recoloring the marker to clay.
