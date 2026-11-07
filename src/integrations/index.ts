/**
 * Integration adapters. Each service has one interface and, today, one TEST
 * adapter that runs in the browser so every journey can be walked end to end.
 * Replace an adapter by implementing the same interface against the real
 * service (see docs/INTEGRATIONS.md). The UI shows a "Test mode" notice
 * wherever a test adapter stands in for a real service.
 */
import { load, save, toHandoff, type Setup, type Handoff } from '../lib/setup-store';

export type IntegrationState = 'connected' | 'test' | 'needs-business-input' | 'not-started';
export const INTEGRATIONS: { id: string; name: string; state: IntegrationState; note: string }[] = [
  { id: 'auth', name: 'Sign-in and accounts', state: 'test', note: 'Test adapter: accounts and verification codes live in this browser. Connect an identity provider (the platform plan names Keycloak).' },
  { id: 'payments', name: 'Payments', state: 'test', note: 'Test adapter imitates a hosted checkout (approve, decline, interrupted). Connect Stripe Checkout or a regional provider with test keys first.' },
  { id: 'provisioning', name: 'Workspace provisioning', state: 'test', note: 'Simulated states. The Control Center provisioning API is designed (CC-011) but not built.' },
  { id: 'demo', name: 'Demo requests to sales', state: 'test', note: 'Stored in this browser and shown on the confirmation. Connect a CRM or a form endpoint.' },
  { id: 'scheduling', name: 'Meeting scheduling', state: 'not-started', note: 'No scheduling integration yet, so the demo form asks for preferred times instead of booking a slot.' },
  { id: 'email', name: 'Welcome and activation emails', state: 'test', note: 'Messages are rendered on screen. Connect a transactional email service.' },
  { id: 'product-api', name: 'Configuration draft to product', state: 'test', note: 'Drafts export as versioned JSON. The product applies its own validation and publishing rules (W-104).' },
  { id: 'analytics', name: 'Funnel analytics', state: 'test', note: 'Events are logged to the browser console with sensitive fields removed. Connect an analytics tool.' },
  { id: 'pricing', name: 'Plans and prices', state: 'needs-business-input', note: 'Draft annual packages in AED from the pricing decision; confirm before publishing.' },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
function ls(): Storage | null { try { return window.localStorage; } catch { return null; } }
function getJSON<T>(k: string, d: T): T { try { return JSON.parse(ls()?.getItem(k) || 'null') ?? d; } catch { return d; } }
function setJSON(k: string, v: unknown) { try { ls()?.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
const uid = (p: string) => p + '_' + Math.random().toString(36).slice(2, 10);

// ---------------- Auth ----------------
export interface Account { id: string; email: string; name: string; company?: string; verified: boolean; createdAt: string }
export const auth = {
  current(): Account | null { return getJSON<Account | null>('tessaro.session', null); },
  async startSignIn(email: string): Promise<{ codeForTestMode: string }> {
    await delay(500);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setJSON('tessaro.pending', { email: email.trim().toLowerCase(), code, at: Date.now() });
    return { codeForTestMode: code };
  },
  async verify(code: string, profile?: { name?: string; company?: string }): Promise<{ ok: true; account: Account; carried: boolean } | { ok: false; error: string }> {
    await delay(400);
    const p = getJSON<{ email: string; code: string; at: number } | null>('tessaro.pending', null);
    if (!p) return { ok: false, error: 'This code has expired. Request a new one.' };
    if (Date.now() - p.at > 10 * 60 * 1000) return { ok: false, error: 'This code has expired. Request a new one.' };
    if (code.trim() !== p.code) return { ok: false, error: 'That code does not match. Check the latest code and try again.' };
    const accounts = getJSON<Record<string, Account>>('tessaro.accounts', {});
    const acc = accounts[p.email] ?? { id: uid('acct'), email: p.email, name: profile?.name || '', company: profile?.company, verified: true, createdAt: new Date().toISOString() };
    if (profile?.name) acc.name = profile.name; if (profile?.company) acc.company = profile.company;
    accounts[p.email] = acc; setJSON('tessaro.accounts', accounts); setJSON('tessaro.session', acc);
    ls()?.removeItem('tessaro.pending');
    // Carry the device draft into the account (merge, account wins on conflicts).
    const device = load();
    const saved = getJSON<Record<string, Setup>>('tessaro.accountSetups', {});
    const existing = saved[acc.id];
    const merged: Setup = existing ? {
      ...existing, storage: 'account', accountId: acc.id, industry: existing.industry || device.industry,
      capabilities: Array.from(new Set([...existing.capabilities, ...device.capabilities])),
      scenarios: [...device.scenarios.filter((d) => !existing.scenarios.some((e) => e.id === d.id)), ...existing.scenarios].slice(0, 20),
      notes: [existing.notes, device.notes].filter(Boolean).join('\n'), config: existing.config || device.config,
    } : { ...device, storage: 'account', accountId: acc.id };
    saved[acc.id] = merged; setJSON('tessaro.accountSetups', saved); save(merged);
    track('account_signed_in', { carried_items: device.capabilities.length + device.scenarios.length });
    return { ok: true, account: acc, carried: device.capabilities.length + device.scenarios.length > 0 };
  },
  signOut() { const s = load(); if (s.accountId) { const all = getJSON<Record<string, Setup>>('tessaro.accountSetups', {}); all[s.accountId] = s; setJSON('tessaro.accountSetups', all); } ls()?.removeItem('tessaro.session'); save({ ...s, storage: 'device', accountId: undefined, capabilities: [], scenarios: [], notes: '', config: undefined }); },
  persistAccountCopy() { const s = load(); if (s.accountId) { const all = getJSON<Record<string, Setup>>('tessaro.accountSetups', {}); all[s.accountId] = s; setJSON('tessaro.accountSetups', all); } },
};

// ---------------- Payments (hosted checkout, test) ----------------
export type PaymentResult = { status: 'paid'; reference: string } | { status: 'failed'; reason: string; recoverable: true } | { status: 'cancelled' };
export const payments = {
  /** Idempotent: the same key never charges twice. */
  async checkout(opts: { idempotencyKey: string; amountNow: number; currency: string; outcome: 'success' | 'decline' | 'cancel' }): Promise<PaymentResult> {
    const done = getJSON<Record<string, PaymentResult>>('tessaro.payments', {});
    if (done[opts.idempotencyKey]?.status === 'paid') return done[opts.idempotencyKey];
    await delay(1200);
    const r: PaymentResult = opts.outcome === 'success' ? { status: 'paid', reference: uid('pay_test') }
      : opts.outcome === 'decline' ? { status: 'failed', reason: 'The card was declined by the issuer (test).', recoverable: true } : { status: 'cancelled' };
    done[opts.idempotencyKey] = r; setJSON('tessaro.payments', done);
    return r;
  },
};

// ---------------- Provisioning ----------------
export const PROVISION_STEPS = ['Workspace reserved', 'Data region assigned (UAE)', 'Industry template applied', 'Your setup draft imported', 'Roles and first admin created', 'Ready to sign in'];
export const provisioning = {
  async run(onStep: (i: number) => void, opts: { failAt?: number } = {}): Promise<{ ok: boolean; failedStep?: number }> {
    for (let i = 0; i < PROVISION_STEPS.length; i++) {
      await delay(650);
      if (opts.failAt === i) return { ok: false, failedStep: i };
      onStep(i);
    }
    return { ok: true };
  },
};

// ---------------- Demo requests ----------------
export interface DemoRequest { id: string; createdAt: string; topics: string[]; preferredTimes: string; handoff: Handoff; contact: { name: string; email: string; company: string; phone?: string; role?: string }; message?: string }
export const demo = {
  async submit(req: Omit<DemoRequest, 'id' | 'createdAt' | 'handoff'>): Promise<DemoRequest> {
    await delay(700);
    const full: DemoRequest = { ...req, id: uid('demo'), createdAt: new Date().toISOString(), handoff: toHandoff(load()) };
    const all = getJSON<DemoRequest[]>('tessaro.demoRequests', []); all.unshift(full); setJSON('tessaro.demoRequests', all.slice(0, 10));
    track('demo_requested', { scenarios: full.handoff.scenarios.length, capabilities: full.handoff.capabilities.length, industry: full.handoff.industry });
    return full;
  },
  last(): DemoRequest | null { return getJSON<DemoRequest[]>('tessaro.demoRequests', [])[0] ?? null; },
};

// ---------------- Trial / onboarding progress ----------------
export interface TrialState { step: number; plan?: string; company?: string; industry?: string; workspace?: string; paymentRef?: string; paymentAttempts: number; provisioned?: boolean; activationDone: string[]; idempotencyKey: string; updatedAt: string }
export const trial = {
  get(): TrialState { return getJSON<TrialState>('tessaro.trial', { step: 0, paymentAttempts: 0, activationDone: [], idempotencyKey: uid('chk'), updatedAt: new Date().toISOString() }); },
  set(t: TrialState) { t.updatedAt = new Date().toISOString(); setJSON('tessaro.trial', t); },
  reset() { ls()?.removeItem('tessaro.trial'); },
};

// ---------------- Analytics ----------------
const BLOCKED = /email|name|phone|company|message|note|inputs/i;
export function track(event: string, props: Record<string, unknown> = {}) {
  const clean = Object.fromEntries(Object.entries(props).filter(([k, v]) => !BLOCKED.test(k) && (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length < 40))));
  // Test adapter: console only. Replace with your analytics client.
  if (typeof console !== 'undefined') console.info('[analytics:test]', event, clean);
}
