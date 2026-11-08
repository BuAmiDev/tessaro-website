# Design (v2 redesign)

## What changed and why
The first version leaned on a templated look: mint buttons, dark-green banners, equal white cards, repeated status badges, a decorative mosaic and a boxed footer. v2 replaces the shared system, not just its colours.

| Was | Now |
|---|---|
| Small logo in a crowded, translucent header | Logo +20% (29 px desktop, 27 px mobile). Opaque chalk header. Five nav groups; Support moved into Resources. One solid action (Book a demo), one outlined (Start a trial). |
| Miniature tile diorama in a rounded frame | A full-scale building at 1:1 metres: exterior, Level 4, Room 4.07, the ceiling void, the operations office, the service yard, then the portfolio. |
| Dark-green page banners | `PageIntro` in two sizes: `editorial` for reading pages, `tool` for task pages. Light, typographic, with different compositions per page. |
| Mint primary and dark boxed secondary buttons | Solid ink primary, outlined secondary, underlined text tertiary. 6 px radius, 48 px height. On dark surfaces the primary becomes chalk. |
| Equal white cards everywhere | Open rows with top rules for prose. Panels only for controls, saved objects and comparisons. |
| Status badges on every block | Plain-text availability only in detail rows, plus one availability table (`/features#availability`). |
| Mosaic illustration | Removed. A section drawing of one building shows how the four domains share one record. |
| IBM Plex Sans | Instrument Sans variable (OFL) for all text and controls. Sora is kept as the display face. Plex Sans Arabic stays only for Arabic script, which Instrument Sans lacks. |
| Boxed footer columns | An open footer: a closing statement, a 40 px logo, four plain link groups. |

## Tokens (`src/styles/tokens.css`)
- **Palette:** chalk #F7F7F4, white, ink #202522 (with 7.6:1 and 5.2:1 tints), line #D9DDD7, green #245B46 (7.9:1 on chalk), green tint #E8EFEB, night #121614, brass #B8863B. Semantic ok, wait, alert and info always appear with text.
- **Dark:** `data-surface="dark"` only. Used in the specimen; the story itself stays on light architecture.
- **Type:** text 17–18 px body; display steps from `--t-xl` up to `--t-hero`; secondary text never below 13 px.
- **Spacing:** 4 px base; sections 88–168 px.
- **Radii:** 4 / 6 / 10 / 16.
- **Depth:** `--e-1`, `--e-float`, `--e-overlay`.
- **Motion:** ease-out, ease-in-out, drawer curves; 120 / 180 / 300 ms.
- **Specimen:** `/design-system` (not indexed).

## The architectural story (`src/story/`)
Since v4 the story uses rendered frames of one building, with live HTML for floor picking, annotations, the work record and app reveals. See [STORY.md](STORY.md) for what is real-time, the asset list, the continuity rules and the remaining asset requirements.
- **Data:** `story-data.ts` holds the event, the chapters and the record. `story-frames.ts` holds the frames, dissolve points, floor polygons, image-space anchors and app steps.
- **Modes:** **frames** (default, pinned scroll at 360vh) and **static** (reduced motion, chapter buttons). `?story-still=<p>` renders a fixed progress for captures.

## Homepage order
Story, then the four domains with a shared drawing, then the apps (requester, technician, customer portal), then from one room to a portfolio (operating models), then scenarios (simulator preview), then shaping the setup (three choices with a live preview), then how the intelligence works (signal / context / rule / action / evidence layers), then what you can rely on, then two ways to start, then questions, then the footer.

## Regenerating frames and screens
See [STORY.md](STORY.md). The scripts are in `scripts/assets/`.
