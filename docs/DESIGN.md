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
- **Data** (`story-data.ts`): one fault at Harbour Point, a fictional building. FCU-L4-07 in Room 4.07, work order WO-2611-0418, technician Rami S., dispatcher Lina K. Eight chapters, each with an actor (automatic / suggested and confirmed / person / technician), a source, a compressed clock and a still position. The record builds row by row, and readings change from normal to alert to verified.
- **Scene** (`scene.ts`): Three.js, everything in metres.
  - Building: 6 floors, 3.6 m slabs, curtain wall with instanced mullions, rooftop air-handling units, service entrance.
  - Room 4.07: suspended ceiling with an openable 3×3-tile cutaway. The fan coil unit is drawn in component view (blower, motor, copper coil, chilled-water valve, and an actuator that is swapped after repair).
  - Office: a wall screen and a desk screen drawn from the same work record.
  - People and site: people at human scale (about 1.75 m), a van and the technician's route, neighbouring portfolio buildings.
  - Camera: Catmull-Rom shots separated by three match cuts (0.535, 0.67, 0.755), each hidden by a short chalk fade.
  - Determinism: every visible state is a pure function of scroll progress, so going backward is consistent.
- **Component** (`Story.astro`):
  - **Live mode** (capable desktops): sticky 340vh section with chapter navigation, Replay, Overview and Skip story. Annotations are projected from 3D anchors each frame.
  - **Stills mode** (phones, low power, data saver, no WebGL): composed portrait or landscape stills rendered from the same scene, with cross-fades. Overlays still work.
  - **Static mode** (reduced motion): no pinned scroll; the chapter buttons and Previous/Next switch views directly.
  - **Story at a glance:** an HTML list of all eight chapters, which also serves as the text alternative.
- **Opening assembly:** the floors settle once over 1.5 s. The headline and navigation are usable immediately.

## Homepage order
Story, then the four domains with a shared drawing, then from one room to a portfolio (operating models), then scenarios (simulator preview), then shaping the setup (three choices with a live preview), then how the intelligence works (signal / context / rule / action / evidence layers), then what you can rely on, then two ways to start, then questions, then the footer.

## Regenerating stills
Run `npm run build`, then `python3 ../tools/story_stills.py dist <out> 0.03,0.215,0.38,0.47,0.6,0.795,0.865,1`, then convert to `public/story/c{i}-{l|p}.webp`. `/story-lab` is the internal page used for rendering (not indexed, not in the sitemap).
