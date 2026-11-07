# Integration status

Every external service sits behind one interface in `src/integrations/index.ts`. Today each has a **test adapter** that runs in the browser so all journeys can be walked end to end. The UI shows a "Test mode" notice wherever a test adapter stands in.

| Service | State | What the test adapter does | To go live |
|---|---|---|---|
| Sign-in and accounts | Test | Email + 6-digit code; the code is shown on screen. Accounts live in browser storage. On sign-in, the device setup merges into the account (account wins on conflicts). | Connect an identity provider (the platform plan names Keycloak). Keep the merge rule server-side. |
| Payments | Test | Imitates a hosted checkout: approved, declined, closed. Idempotency key per attempt; a paid key never charges twice; a decline issues a new key. | Stripe Checkout or a regional provider in test mode first. Redirect and webhook confirm; never collect card data on the site. |
| Workspace provisioning | Test | Six simulated steps with an optional failure at step 3 and retry from the failed step. | Control Center provisioning API (designed as CC-011, not built). |
| Demo requests | Test | Stored in the browser; confirmation shows exactly what would be sent. | CRM or form endpoint. Payload: contact + versioned setup handoff. |
| Meeting scheduling | Not started | The demo form asks for preferred times instead. | Calendar booking integration. |
| Welcome and activation email | Test | Rendered on the trial's last step. | Transactional email service. |
| Configuration draft to product | Test | JSON export (`tessaro.config-draft` v1) with findings. | Product import (W-104) re-validates before publishing. |
| Funnel analytics | Test | `track()` logs to console; drops names, emails, phones, company names, free text, scenario inputs. | Connect an analytics tool behind the same function. |
| Support desk | Test | Ticket with reference and optional setup context stored in the browser. | Help desk integration. |
| Plans and prices | Needs business input | Draft packages in AED (`src/content/pricing.ts`, `confirmed: false`). Trial length and card requirement are assumptions. | Confirm values, set `confirmed: true`; draft labels disappear. |

## Handoff contract (no personal data)

`toHandoff()` in `src/lib/setup-store.ts` produces `{ v, industry, capabilities[], scenarios[{id, scenario, inputs}], configRef, assumptions[] }`. It is versioned (`v`), and `migrate()` upgrades older saved shapes. Contact details travel separately and only with consent.
