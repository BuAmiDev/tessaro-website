# Tessaro website

The flagship marketing and evaluation site for Tessaro: homepage with the live 3D hero, scenario simulator, feature explorer, industries, platform pages, saved setup, configurator, pricing, demo request, trial with checkout and provisioning, onboarding, help and support.

**Status of the product it describes:** Tessaro 2.0 is designed (256 clickable screens) and preparing its first pilot release. Every capability on the site carries a status (Available, Pilot release, Designed, Proposed). Nothing is labelled Available today.

## Stack and why

| Choice | Why |
|---|---|
| Astro 7, static output | Every page is pre-rendered HTML; JavaScript loads only for interactive islands. Fast first paint, simple hosting, nothing to run on a server yet. |
| Vanilla TypeScript islands | The interactive parts (simulator, configurator, trial) are forms and state machines; no framework runtime needed. |
| Three.js (lazy) | The hero scene loads after the page is idle, only on capable devices with WebGL. Phones, low-power devices, data-saver and reduced-motion visitors get the poster frame and a Play button. |
| Self-hosted fonts | Sora (display), IBM Plex Sans and Plex Sans Arabic, OFL licences in `public/fonts`. |
| Lucide icons, inlined | ISC licence; no icon font, no runtime fetch. |

## Commands

```
npm install
npm run dev            # local development
npm run build          # static site in dist/ (+ brand rename step)
npm test               # unit tests: scenario engine, saved setup, configurator rules
CHROME=/path/to/chrome npm run test:journeys   # end-to-end journeys against dist/ (Python Playwright)
python3 tests/e2e/overflow.py dist             # horizontal overflow at 320/390/768/1440
python3 tests/e2e/axe.py dist path/to/axe.min.js
```

## Where things live

- `src/config/brand.ts`: name, legal entity, URLs, contact, locale, release statuses. Change the brand here.
- `src/content/`: capabilities (with status and prototype evidence), industries, platform areas, pricing (draft), navigation, FAQ and help articles.
- `src/lib/scenario-engine.ts`: deterministic simulator rules. `src/lib/setup-store.ts`: saved setup (versioned, migrates old shapes). `src/lib/config-rules.ts`: configurator validation (blockers vs warnings), plan suggestion, workflow preview.
- `src/integrations/index.ts`: one interface per external service, each with a test adapter. See `docs/INTEGRATIONS.md`.
- `src/hero/`: the 3D scene. `src/pages/`: one file per route.

## Changing the brand spelling

`brand.name` drives the source. For a quick switch on an existing build, `BRAND_NAME=Tesaro npm run build` rewrites the display name in `dist`. Domains and storage keys keep `tessaro`. The logo wordmark is a drawn path and needs a design update.

## Docs

- `docs/SOURCES.md`: reference sites studied, guidance used, assumptions.
- `docs/INTEGRATIONS.md`: integration status checklist and how to replace each adapter.
- `docs/DESIGN.md`: concept, tokens, components, motion, hero storyboard.
- `docs/QA.md`: what was tested and measured, with results.
