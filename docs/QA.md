# QA record (7 November 2026)

Measured on the static build in this workspace (local server without compression). Targets and measurements are reported separately.

## Automated tests
- Unit tests (`npm test`): 10/10 pass. Scenario engine order and approvals, saved setup migration and handoff, configurator blockers/warnings and plan pricing.
- Journeys (`tests/e2e/journeys.py`): 34/34 pass. Simulator save → feature add → My setup → sign-in carries draft into account → configurator blockers, warnings, resume → demo prefill, consent, confirmation, handoff without personal data → trial with decline, recovery, success, provisioning failure and retry, welcome → onboarding persistence → help search and escalation → support → sign-out.

## Layout
No horizontal overflow on any of 34 pages at 320, 390, 768 and 1440 px (`tests/e2e/overflow.py`). Screenshots reviewed at 390, 768 and 1440.

## Accessibility (target WCAG 2.2 AA)
- axe-core 4.10 (WCAG 2.0/2.1/2.2 A and AA + best practice): 0 violations on all 34 pages at 1440 and 390 px, initial state. Dynamic states (errors, confirmations) were exercised by the journey tests but not separately scanned.
- Lighthouse accessibility: 100 on home, simulator, features, pricing.
- Manual: visible focus, skip link, keyboard mega menus and role tabs, status never by colour alone, reduced-motion path. Screen-reader testing with VoiceOver/NVDA not yet done.

## Performance (targets: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms)
Lighthouse 12.8, local server, no compression:

| Page | Form factor | Perf | LCP | CLS | TBT | Weight |
|---|---|---|---|---|---|---|
| Home | Mobile | 94 | 2.7 s | 0 | 0 ms | 303 KiB |
| Home | Desktop | 100 | 0.7 s | 0.004 | 0 ms | 310 KiB |
| Simulator | Mobile | 97 | 2.4 s | 0.002 | 0 ms | 251 KiB |
| Features | Mobile | 97 | 2.3 s | 0 | 0 ms | 274 KiB |
| Pricing | Mobile | 99 | 2.0 s | 0 | 0 ms | 175 KiB |

Home mobile LCP is 0.2 s over target in this uncompressed lab run; Vercel serves compressed files, so re-measure on the deployed URL. Before the change that keeps phones on the poster, home mobile TBT was 9.3 s with the 3D scene running in software rendering. The 3D scene's cost on real desktop GPUs was not measured here (the lab machine has 4 cores, so it also gets the poster). INP was not measured (needs field data).

## Design check
Impeccable detector on the built HTML: tiny-text findings fixed (mosaic tiles and simulator board now ≥ 11px or hidden when the tile is too narrow). Remaining "cramped padding" findings are full-width sections whose padding comes from the inner `.wrap`; reviewed and left as is.
