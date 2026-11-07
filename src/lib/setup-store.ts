/**
 * "My setup": everything a visitor saves while evaluating Tessaro.
 * Saved on this device (localStorage) until the visitor signs in; then the
 * auth adapter carries the draft into their account (see integrations/auth.ts).
 * The handoff payload is versioned and contains no personal information, so it
 * can travel to the demo request, trial and configurator safely.
 */
import type { Inputs } from './scenario-engine';

export const SETUP_VERSION = 2;
const KEY = 'tessaro.setup';

export interface SavedScenario { id: string; savedAt: string; name: string; inputs: Inputs; state: string; note?: string }
export interface ConfigDraft { step: number; values: Record<string, unknown>; updatedAt: string }
export interface Setup {
  version: number;
  storage: 'device' | 'account';
  accountId?: string;
  industry?: string;
  capabilities: string[];
  scenarios: SavedScenario[];
  notes: string;
  config?: ConfigDraft;
  updatedAt: string;
}

export const emptySetup = (): Setup => ({ version: SETUP_VERSION, storage: 'device', capabilities: [], scenarios: [], notes: '', updatedAt: new Date().toISOString() });

/** Upgrades older saved shapes so a returning visitor never loses work. */
export function migrate(raw: any): Setup {
  if (!raw || typeof raw !== 'object') return emptySetup();
  const s: Setup = { ...emptySetup(), ...raw };
  if (!raw.version || raw.version < 2) {
    // v1 stored capabilities as an object map and had no storage field
    if (raw.capabilities && !Array.isArray(raw.capabilities)) s.capabilities = Object.keys(raw.capabilities).filter((k) => raw.capabilities[k]);
    s.storage = raw.accountId ? 'account' : 'device';
  }
  s.capabilities = Array.from(new Set((s.capabilities || []).filter((x) => typeof x === 'string')));
  s.scenarios = Array.isArray(s.scenarios) ? s.scenarios.slice(0, 20) : [];
  s.version = SETUP_VERSION;
  return s;
}

type Store = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
function store(): Store | null { try { const s = window.localStorage; s.getItem('x'); return s; } catch { return null; } }

export function load(): Setup { const s = store(); if (!s) return emptySetup(); try { return migrate(JSON.parse(s.getItem(KEY) || 'null')); } catch { return emptySetup(); } }
export function save(setup: Setup): boolean {
  const s = store(); setup.updatedAt = new Date().toISOString();
  if (!s) return false;
  try { s.setItem(KEY, JSON.stringify(setup)); window.dispatchEvent(new CustomEvent('setup:change', { detail: setup })); return true; } catch { return false; }
}
export function update(fn: (s: Setup) => void): Setup { const s = load(); fn(s); save(s); return s; }
export function clear() { const s = store(); s?.removeItem(KEY); window.dispatchEvent(new CustomEvent('setup:change', { detail: emptySetup() })); }

export function toggleCapability(id: string, on?: boolean): boolean {
  let now = false;
  update((s) => { const has = s.capabilities.includes(id); now = on ?? !has; s.capabilities = now ? Array.from(new Set([...s.capabilities, id])) : s.capabilities.filter((c) => c !== id); });
  return now;
}
export function saveScenario(sc: Omit<SavedScenario, 'id' | 'savedAt'>): SavedScenario {
  const item: SavedScenario = { ...sc, id: 'sc_' + Math.random().toString(36).slice(2, 9), savedAt: new Date().toISOString() };
  update((s) => { s.scenarios = [item, ...s.scenarios].slice(0, 20); if (!s.industry) s.industry = sc.inputs.industry; });
  return item;
}

/** Versioned handoff used by demo request, trial and configurator. No names, emails or phone numbers. */
export interface Handoff {
  v: number; industry?: string; capabilities: string[];
  scenarios: { id: string; scenario: string; inputs: Inputs }[];
  configRef?: { step: number; updatedAt: string };
  assumptions: string[];
}
export function toHandoff(s: Setup): Handoff {
  return {
    v: SETUP_VERSION, industry: s.industry, capabilities: s.capabilities,
    scenarios: s.scenarios.map((x) => ({ id: x.id, scenario: x.inputs.scenario, inputs: x.inputs })),
    configRef: s.config ? { step: s.config.step, updatedAt: s.config.updatedAt } : undefined,
    assumptions: ['Sample data', 'Compressed timelines', 'Illustrative costs in AED'],
  };
}
export const countItems = (s: Setup) => s.capabilities.length + s.scenarios.length + (s.config ? 1 : 0);
