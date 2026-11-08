# Opening story and app screens (v4)

v4 changes only three things on the accepted redesign: the opening scene, the story transitions, and how the apps are shown. Identity, type, colour, navigation, scenarios, configuration and conversion flows are unchanged.

## What is real-time and what is rendered

| Part | How it is made | Live or rendered |
|---|---|---|
| Building, floor, room, ceiling void, office, service entrance, repair, portfolio | Nine rendered stills of one building (see the asset list) | Rendered media |
| Moving between places | Scroll-driven dissolves between stills. No zooming or panning of a flat image to fake a camera move | Live (opacity only) |
| Floor picker | SVG polygons traced on the exterior, mirrored by six real buttons (L5–G). Hover, focus or tap highlights a floor; choosing Level 4 continues into the room | Live |
| Annotations | HTML labels attached to points in the image (fractions of the source), recomputed for every viewport with the same `object-fit: cover` maths. They flip sides or hide rather than cover the record or app panels | Live |
| Work record, readings, chapter text, controls | HTML driven by scroll progress, as before | Live |
| App screens in the story | Real prototype screens exported with this event's sample data, revealed as front-facing panels; click to enlarge | Rendered (static images of real UI) |
| Reduced motion | Static chapters with Previous/Next, no pinned scroll, no dissolves | Live |

The Three.js scene (`src/story/scene.ts`) and the `three` dependency were removed. The procedural model was the source of the "early geometric model" look. Keeping it as a fallback would have shown placeholder geometry as the finished state.

## Continuity

- **One building:** every frame was generated from the chosen exterior as a reference image, so the same bronze fins, limestone bands and late-afternoon light carry through.
- **One room:** the interior frames (inspection, repair, evidence) were generated from the same room render.
- **One event:** Level 4, Room 4.07, FCU-L4-07, WO-2611-0418, technician Rami S., dispatcher Lina K. These appear in the captions, record, labels and app fixtures.
- **Floor numbering:** G (service entrance and lobby), then L1–L5. Level 4 is the second band from the top; the "selected floor" frame shows Levels 4 and 5 with Room 4.07 on Level 4.
- **Order of states** (enforced by `tests/e2e/story.py`):
  1. The customer sees the assignment and visit at 14:06.
  2. The technician sees the job, scan and photo between 15:12 and 15:29.
  3. Technician completion appears only after the repair evidence exists.
  4. The requester's "Work completed" appears only after the repair is verified.
  5. Sign-off is a separate record row after that.
- **Trigger:** the building alarm is kept. The requester's own reporting flow appears only in the separate showcase.

## Brand fit

All frames are colour-graded toward the site palette by `scripts/assets/grade.py`: lower saturation, warm highlights pulled toward neutral, shadows nudged toward ink. The office wall display was neutralised inside its own outline.

The pictures contain no logos, signage or legible text. The technician's shirt is the dark green already used in the palette.

## App screens

- **Source:** the prototype's own screen HTML (`tessaro-prototype/s/*.html`), rendered with the product's fonts (Plus Jakarta Sans, IBM Plex Mono). Only the phone screen (`.ph`) or the portal app (`.app`) is captured, without the prototype toolbar, index, arrows or canvas.
- **Generic data:** `scripts/assets/fixtures.py` replaces text only. Every replacement must match the source, otherwise the script stops, and it refuses any output that still contains a pilot client name.
- **Changed state:** one story fixture (technician "Ready to close?", M-020) is shown in its completed state, using the same row, radio and button styles from the screen itself.
- **Kept apart:** showcase screens are separate examples (an AC fault at home, a refrigeration job, a retail customer) and are labelled as such. They are not presented as the Harbour Point record.

| Where | Requester app | Technician app | Customer portal (browser) |
|---|---|---|---|
| Story · Office (14:06) | TR-019 Technician booked | | |
| Story · Technician | | M-004 Job detail, M-007 Scan, M-013 Camera capture | |
| Story · Verify | TR-024 Work completed (after evidence) | M-020 Complete and validate | |
| Homepage `#apps` | TR-010 Report, TR-018 Timeline, TR-024 Confirm | M-004 Job, M-012 Checklist, M-020 Complete | PT-013 Home, PT-016 Approvals |
| `/platform/field-service#technician-app` and `/platform/field` | | M-004, M-012, M-013, M-020, M-022 Sync center (marked designed, not in production) | |
| `/platform/stakeholders#customer-apps` and `/platform/facilities` | TR-010, TR-018, TR-024 | | PT-013, PT-016 |

Platform menu: a new group, "The apps", links to both anchors.

### Rebuilding the screens

```
PROTO_SCREENS=../tessaro-prototype/s FIXTURES_OUT=.fixtures python3 scripts/assets/fixtures.py
SRC=.fixtures PRODUCT_FONTS=<dir with @fontsource-variable/plus-jakarta-sans and @fontsource/ibm-plex-mono> \
  python3 scripts/assets/export_screens.py <out> none <KEY,KEY-story,…>
```

Then convert to WebP in `public/apps/`.

## Asset list

**Frames** in `public/story/v4/`, 1920 and 1024 wide, plus `e1p-900` (portrait). Each was generated with GPT Image 2.6 (Higgsfield), 2K, then graded.

| File | Shows | Reference used |
|---|---|---|
| e1 / e1p | Exterior, three-quarter, plaza, service entrance (landscape and portrait) | none (master) / e1 |
| e2 | Levels 4–5, Room 4.07 visible through glass | e1 |
| r1 | Room 4.07 interior, suspended ceiling, slot diffuser | e1 |
| r2 | Same room, two tiles lifted: FCU, chilled-water pipes, valve actuator | r1 |
| o1 | Operations office, dispatcher | e1 |
| t1 | Service entrance, van, technician arriving | e1 |
| t2 | Technician on a step ladder at the open ceiling | r1 |
| v1 | Over the shoulder: phone lens aimed at the new actuator | r2 |
| p1 | Aerial portfolio with Harbour Point among other building types | e1 |

**App screens** in `public/apps/`: 16 WebP files, phones at 720 × 1520 (2×) and the portal at 1680 wide.

**Removed:** `public/story/c*.webp` (old procedural stills), `src/story/scene.ts`, the `three` dependency.

## Remaining production-asset requirements

Generated stills are good enough for a preview. For launch, these are recommended:

1. **A modelled building and room.** Commission a modelled scene (Blender, Unreal or V-Ray) of the same building, Room 4.07 and the FCU, to allow true camera moves (exterior to floor to room) rendered as a short image sequence or video. Deliver at 2560 × 1440 and 1080 × 1920, with matching first and last frames per chapter so the current dissolves can become continuous moves.
2. **Accuracy check by an HVAC engineer** of the ceiling-void frames r2, t2 and v1: valve orientation, actuator type, insulation, condensate drain and hanger spacing.
3. **Rights:** confirm Higgsfield's commercial terms for the generated frames, or replace them with commissioned renders.
4. **Portrait variants** for r2, t2 and v1. Today they are cropped from the landscape frames on phones.
5. **People:** the technician is always seen from behind. If a face is wanted, use a model-released photo shoot or a commissioned render.
6. **Live product screens:** when the apps ship, replace the exported fixtures with screens captured from the production build and remove the "designed, not in production" labels as items become Available.
