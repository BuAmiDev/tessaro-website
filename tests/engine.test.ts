import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, defaultInputs, SCENARIOS } from '../src/lib/scenario-engine.ts';
import { migrate, toHandoff, emptySetup } from '../src/lib/setup-store.ts';

const base = (s = 'freezer-p1', ind = 'hvac-refrigeration') => defaultInputs(s, ind);

test('every scenario runs and ends with a record', () => {
  for (const sc of SCENARIOS) {
    const o = run(base(sc.id));
    assert.ok(o.steps.length >= 4, sc.id);
    assert.equal(o.steps.at(-1)!.kind, 'record');
    for (let i = 1; i < o.steps.length; i++) assert.ok(o.steps[i].at >= o.steps[i - 1].at, `${sc.id} sorted`);
  }
});
test('technician availability changes the assignment', () => {
  const a = run({ ...base(), availability: 'available' });
  const n = run({ ...base(), availability: 'none' });
  assert.ok(a.steps.some((s) => s.id === 'assign'));
  assert.ok(n.steps.some((s) => s.id === 'no-tech'));
  assert.equal(n.state, 'exception-recovered');
});
test('approval threshold changes the approval path', () => {
  const low = run({ ...base(), threshold: 500 });
  const high = run({ ...base(), threshold: 5000 });
  assert.ok(low.steps.some((s) => s.id === 'approval'));
  assert.ok(!high.steps.some((s) => s.id === 'approval'));
  assert.ok(high.steps.some((s) => s.id === 'within'));
});
test('warranty means nothing is chargeable', () => {
  const w = run({ ...base(), coverage: 'warranty' });
  assert.ok(!w.steps.some((s) => s.id === 'quote'));
});
test('declined quotation stays visible and recovers', () => {
  const d = run({ ...base(), threshold: 500, decision: 'decline' });
  assert.ok(d.steps.some((s) => s.id === 'declined'));
  assert.ok(d.steps.some((s) => s.id === 'makesafe'));
  assert.equal(d.state, 'exception-recovered');
});
test('pending approval leaves the scenario awaiting', () => {
  assert.equal(run({ ...base(), threshold: 500, decision: 'pending' }).state, 'awaiting');
});
test('setup migration upgrades v1 shape and handoff has no personal data', () => {
  const s = migrate({ version: 1, capabilities: { 'dispatch-board': true, sla: false }, scenarios: [] });
  assert.deepEqual(s.capabilities, ['dispatch-board']);
  assert.equal(s.version, 2);
  const h = toHandoff({ ...emptySetup(), notes: 'call Sara on 050…', capabilities: ['sla'] });
  assert.ok(!JSON.stringify(h).includes('Sara'));
});

import { validate, defaultConfig, recommendPlan } from '../src/lib/config-rules.ts';
test('configurator: defaults have no blockers except industry and WhatsApp consent', () => {
  const f = validate(defaultConfig()).filter((x) => x.level === 'blocker').map((x) => x.field).sort();
  assert.deepEqual(f, ['industry', 'whatsappConsent']);
});
test('configurator: critical slower than normal is a blocker', () => {
  const v = { ...defaultConfig('hvac-refrigeration'), whatsappConsent: true, p1Hours: 48, p2Hours: 24 };
  assert.ok(validate(v).some((x) => x.level === 'blocker' && x.field === 'p1Hours'));
});
test('configurator: more technicians than the largest plan is a warning, priced as extras', () => {
  const v = { ...defaultConfig('hvac-refrigeration'), whatsappConsent: true, technicians: 45 };
  const f = validate(v, [{ techs: 40 }]);
  assert.ok(f.some((x) => x.level === 'warning' && x.field === 'technicians'));
  assert.ok(!f.some((x) => x.level === 'blocker'));
  const r = recommendPlan(45, [{ id: 'a', techs: 10, price: 1 }, { id: 'b', techs: 40, price: 100 }], 3);
  assert.equal(r.extraTechs, 5); assert.equal(r.total, 115);
});
