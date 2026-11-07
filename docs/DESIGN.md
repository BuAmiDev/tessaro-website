# Design

## Concept: "Every operational piece, intelligently connected"
The Tessaro mark is a mosaic of tiles. The site uses the same idea: requests, technicians, assets, contracts and decisions are tiles on one plate, joined by a 3-unit grout line (`.tilegrid`). Emerald marks the one tile that needs attention now. Outer corners are crisp, inner corners soft (from the logo).

## Tokens (`src/styles/tokens.css`)
- Palette: Graphite (900 #0E1413), Forest, Porcelain, Steel, Ink; Emerald 600 #0B8457 (light surfaces), Emerald 400 #2BC48A (dark), Mint #E4F6EC for selected states.
- Semantic: ok, wait, alert, info, neutral, each with a tint. Always paired with text and an icon.
- Surfaces: `data-surface="dark" | "forest"` re-maps every token, including text colour.
- Type: Sora variable for display (600, tight tracking), IBM Plex Sans 400/500/600 for text, Plex Sans Arabic for Arabic. Scale `--t-xs` to `--t-hero`. Minimum functional text 11px.
- Radii `--r-xs` to `--r-lg`; elevation `--e-float`, `--e-overlay`; motion `--ease-out`, `--ease-in-out`, `--ease-drawer`, durations `--d-press` 120 ms, `--d-fast`, `--d-panel` 280 ms.
- Live specimen: `/design-system` (not indexed).

## Status system
Available / Pilot release / Designed / Proposed (`src/config/brand.ts`). Proposed items use dashed borders and cannot be added to a setup.

## Hero storyboard (14.2 s)
1. Freezer FZ-07 stops cooling (amber pin). 2. Request understood (robot wakes, suggestion). 3. Coverage checked (contract tile). 4. Technician matched (dispatcher confirms). 5. Approval required (customer decides). 6. Customer updated (drafted message). 7. Technician on site. 8. Completion recorded (evidence card, plate settles).
- First frame: poster image (`/hero/poster.webp`, mobile `/hero/poster-mobile.webp`), rendered from the scene itself with `?hero-still=7.3`.
- Phones, ≤4-core devices and data-saver: poster plus "Play animation". Reduced motion: final state, full step list, Play on request.
- Controls: Play/Pause, Replay. Pauses off-screen and in background tabs. Falls back to the poster if WebGL is unavailable.

## Components
Header with mega menus (keyboard: Esc, focus-out), mobile sheet; footer tile panel; PageIntro; Status; ProductShot (screen ID, "Designed screen", link to prototype); CapCard; SignInForm; notices (`.notice`, `.notice-test`); form fields with inline errors and `aria-invalid`.
