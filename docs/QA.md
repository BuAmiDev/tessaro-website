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
