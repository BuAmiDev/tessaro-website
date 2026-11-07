# Sources, guidance and assumptions

## Product sources (internal)
- Tessaro 1.1 clickable prototype (https://tessaro-prototype.vercel.app): 256 screens. Every capability card links to the screens that evidence it. Product screenshots on the site are crops of those screens with their IDs.
- Project documents: Tessaro 2.0 executive approval pack ("nothing is implemented"), pricing decision (annual AED packages), feature matrix, product documentation and presentations.

## Primary references for v2 (studied in the browser; no artwork, copy or prompts reused)
| Reference | What we took | Why it suits Tessaro | Where |
|---|---|---|---|
| Tower Floors (MotionSites) | Exterior-to-interior camera move through a facade bay into a furnished room, keeping light and location consistent | Tessaro's subject is buildings, and entering one makes it physical | Story chapters 1–2 |
| Strata AI | Separated, translucent stacked planes with labels | Makes the invisible chain (signal, context, rule, action, evidence) tangible | “How the intelligence works” section |
| Medusa (robot jellyfish) | Engineered component view with selective annotations and readings | Diagnosis is credible when you see the part and its numbers | Inspection and verification chapters (component-view unit, valve and sensor callouts) |
| Ascend | Very large display type on a light ground, generous space, one strong material subject | Supports the retained Sora display face and an open, inviting composition | Opening headline, footer closing line, section heads |

## Reference sites studied for v1 (patterns only; no assets copied)
| Reference | Pattern taken | Where applied |
|---|---|---|
| Town | Headline and visual interleaved in the hero | Hero layout |
| Tines | Very large display line with two compact actions | Closing section |
| Tactile UI | Links as a control-panel tile grid | Footer |
| Superhero | Immersive hero, one primary action, each pathway with a disclosure, persistent support | Hero, status badges on claims, support in header |
| Navbar Gallery (Chesapeake / Cloudflare-style) | Grouped mega menu with descriptions and a featured card | Header mega menus with a featured scenario |
| MotionSites (Moss Island, Loops Virtual Store) | Miniature diorama hero | 3D tile building |
| Landdding (Enode, Gumloop) | "Orchestrating" positioning; visible agent steps | Assistance section, simulator timeline |
| Recent | Consistent framing of product renders | ProductShot component |
| 3dicons | Considered, not used | Avoided licence questions |

## Guidance used
Vercel web interface guidelines; Emil Kowalski's motion guidance (easing, durations, reduced motion); Impeccable design detector; ibelick UI skills; Anthropic frontend-design skill; WCAG 2.2 AA.

## Assumptions to confirm
- Brand spelling "Tessaro" (configurable).
- Terminology: CAFM, CMMS, FSM and EAM, calibrated against IFMA's CAFM definition and IBM's CMMS vs EAM comparison. Coverage is mapped to designed prototype screens in `src/content/domains.ts`, not to released features.
- The pilot client names and IDs that appear in prototype screens are excluded from the site; prototype screenshots were removed.
- Prices and packages are drafts from the pricing decision; VAT 5% excluded.
- Trial: 30 days, card verified not charged. Support hours: Sunday–Thursday, Dubai time; reply within one working day.
- Data region UAE; up to 3 countries per package; 5,000-asset fair use.
- Privacy retention period and legal texts: drafts for counsel.
- Contact emails at tessaropro.com and the phone number come from the brief.
