# QA record: v5 continuous real-time 3D (8 November 2026)

Scope: the persistent Three.js story, the glass hero app views and the slim showcase frame. The lab has no GPU: WebGL runs on SwiftShader (CPU), which makes every frame slow and inflates the blocking-time figures.

- **Story** (`tests/e2e/story.py`, rewritten for live 3D): 27/27 pass. Coverage:
  - live mode starts and the canvas replaces the poster;
  - six floor outlines projected from the 3D floors;
  - floor picker by focus, click and touch;
  - chapter travel is sampled during the move: 20 samples, strictly increasing, with intermediate values;
  - a wheel interrupts travel where it is;
  - completion is never shown before the evidence;
  - glass app reveals and the enlarge dialog;
  - Replay and Skip story;
  - static mode for reduced motion;
  - the stills fallback without WebGL;
  - mobile role switching.
- **Travel on slow devices:** the first lab run showed a chapter click arriving in one step, because one software-rendered frame took longer than the whole move. Chapter travel now advances at most 60 ms per frame, so a slow device moves more slowly but never skips the route.
- **Journeys:** 35/35 pass. **Overflow:** none at 390, 768 or 1440 px. **axe-core:** clean.
- **Lighthouse, home (lab, no GPU):**

  | Run | Perf | LCP | TBT | CLS | A11y | Best practice | SEO |
  |---|---|---|---|---|---|---|---|
  | Desktop | 65 | 0.9 s | 6.5 s | 0 | 100 | 100 | 100 |
  | Mobile | 54 | 3.6 s | 13.9 s | 0.013 | 100 | 100 | 100 |

  LCP is unchanged from v4 (the poster paints first). The blocking time comes from model decoding and WebGL rendering on the CPU after `load`. It must be re-measured on real devices with a GPU before launch.
- **Recording:** uncut, 87 s at 25 fps, captured frame by frame with a virtual clock. It covers a full forward journey, a reverse from Portfolio to mid-Office, and two nonadjacent chapter clicks (Office → Verify, then Verify → Room). Contact sheets confirm both clicks travel through the facade, plaza, yard and van rather than cutting.
- **Path smoothness:** measured numerically along the spline. The worst turn rate is about 36° per 1% of progress.

# QA record: v4 refinements (8 November 2026)

Scope: the opening story, its transitions, and the app screens. Measured on the static build, served locally without compression.

- **Story** (`tests/e2e/story.py`, new): 24/24 pass. Coverage:
  - floor picker by keyboard focus, click and touch, plus "Follow Level 4";
  - chapter buttons, Replay and Skip story;
  - static mode for reduced motion, with Next;
  - completion never shown before the evidence and verification records;
  - office, technician and verify app reveals, and the enlarge dialog;
  - annotation placement;
  - homepage showcase steps and the timeline driving both phones;
  - mobile role switching.
- **Journeys:** 35/35 still pass (simulator, configurator, saved setup, demo, trial, onboarding, help, sign-out).
- **Overflow:** none on any page at 320, 390, 768 or 1440 px.
- **axe-core:** all pages at 1440 and 390 px are clean. One finding (an empty screen link while the app panel was hidden) was fixed; the hidden panel is now `inert`.
- **Lighthouse, home:**

  | Run | Perf | LCP | CLS | A11y | Best practice |
  |---|---|---|---|---|---|
  | Desktop | 98–99 | 0.9–1.0 s | 0 | 100 | 100 |
  | Mobile | 86–88 | 3.6–3.7 s | 0.013 | 100 | 100 |

  Mobile LCP was 2.9 s before v4. The photographic opening frame is now the LCP element. It is preloaded, the next frames wait for `load`, and the portrait frame is 78 KB. The remaining time goes to the 115 KB HTML document and the fonts on the throttled profile. Re-measure on the deployed URL with compression before deciding on further work.
- **Visual review:**
  - Desktop 1440 × 900: all eight chapters.
  - Mobile 390 × 844 and 360 × 640: opening, floor, inspect, office, technician and verify.
  - Fixed during review: the headline overlapping the facade (scrim and smaller headline); a label under the record panel; the empty first app reveal; a reduced-motion offset that let the overview cover the chapter controls; the off-palette office display.
  - Two generated frames were rejected: one with a navy sleeve breaking continuity, and one where the phone camera faced the technician instead of the part.

# QA record: v2 redesign (7 November 2026)

Measured on the static build in this workspace (local server, no compression). Targets and measurements are reported separately.

## Automated
- **Unit tests** (`npm test`): 10/10 pass.
- **Journeys** (`tests/e2e/journeys.py`): 35/35 pass. Coverage:
  - simulator save
  - feature search and save
  - My setup
  - sign-in carrying the device draft into the account
  - configurator: three starting choices, then details, with blockers, warnings, WhatsApp consent, plan for 45 technicians and resume
  - demo: prefill, consent, confirmation, and a handoff with no personal data
  - trial: decline, recovery, success, provisioning failure and retry, then welcome
  - onboarding persistence
  - help search and escalation
  - support
  - sign-out
- **Layout:** no horizontal overflow on any of 38 pages at 320, 390, 768 or 1440 px.
- **Accessibility (axe-core 4.10, WCAG 2.0/2.1/2.2 A and AA + best practice):** the last full run on all pages at 1440 and 390 px flagged two things. Both are fixed:
  - small drawing labels with low contrast;
  - a nested complementary landmark.

  Lighthouse accessibility was 100 on the simulator, configurator and features pages; the homepage scored 97 for one drawing label, which is now fixed. That fix has not been re-scanned yet.

## Performance (Lighthouse 12.8; targets LCP ≤ 2.5 s, CLS ≤ 0.1)
| Page | Mobile perf | Mobile LCP | Desktop perf | Desktop LCP | CLS | Weight |
|---|---|---|---|---|---|---|
| Home | 93 | 2.9 s | 100 | 0.8 s | ≤ 0.013 | 415–511 KiB |
| Simulator | 98 | 2.2 s | 100 | 0.5 s | ≤ 0.046 | 213 KiB |
| Configurator | 98 | 2.1 s | 100 | 0.5 s | ≤ 0.049 | 202 KiB |
| Features | 97 | 2.3 s | 100 | 0.5 s | ≤ 0.009 | 252 KiB |

- **Home on mobile:** LCP is 0.4 s over target in this uncompressed lab run. Re-measure on the deployed URL.
- **3D scene cost:** the lab machine has 4 cores, so Lighthouse measured the stills path, not the live 3D scene. The real-time scene's cost on desktop GPUs was not measured.
- **INP:** needs field data.
- **SEO:** configurator scores 63 because it is deliberately not indexed.

## Visual review
- **Story:** stills at 1600 × 980 and 760 × 1352 reviewed for every chapter. Fixed during review:
  - camera framing that lost the subject;
  - the technician's head intersecting the ceiling;
  - the cutaway hiding the valve;
  - a TV blocking the inspection view;
  - portrait exteriors being cropped;
  - annotations hidden behind the record panel.
- **Pages at 1440 px:** platform, Facilities, simulator, configurator, pricing, features and an industry page.
- **Pages at 390 px:** story, configurator, simulator and platform.
- **Not individually reviewed after the sweep:** demo, trial, sign-in, onboarding, help, support, company, legal, 404. They use the shared components and pass the journey, overflow and axe checks.

## Known limits
- The scene is a clean architectural model, not photoreal.
- People are neutral mannequins.
- Screen-reader testing with VoiceOver/NVDA has not been done.
