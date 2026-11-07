/**
 * Scenario engine for the simulator. Pure functions: inputs in, a timeline out.
 * This is an ILLUSTRATIVE script driven by documented rules, not a live AI system.
 * The same inputs always produce the same outcome, so the simulator can be tested.
 */
export type ActorKind = 'assist' | 'rule' | 'person' | 'tech' | 'customer' | 'system';
export type StepKind = 'auto' | 'proposal' | 'approval' | 'human' | 'exception' | 'record';
export type Urgency = 'P1' | 'P2' | 'P3';
export type Coverage = 'amc' | 'warranty' | 'none';
export type Availability = 'available' | 'busy' | 'none';
export type Channel = 'whatsapp' | 'app' | 'email' | 'sms';
export type Decision = 'approve' | 'decline' | 'pending';

export interface Inputs {
  scenario: string;
  industry: string;
  sites: number;
  team: number;
  asset: string;
  urgency: Urgency;
  coverage: Coverage;
  threshold: number;      // AED, approval needed above this
  availability: Availability;
  channel: Channel;
  decision: Decision;     // what the approver does (lets visitors explore the declined path)
}

export interface Step {
  id: string;
  at: number;             // minutes from the event (compressed in playback)
  actor: ActorKind;
  kind: StepKind;
  title: string;
  detail: string;
  context?: string[];     // what was looked at
  rule?: { id: string; text: string };
  needs?: 'approve' | 'choose';
  tile?: number;          // which tile in the scene lights up (0..10)
}

export interface Outcome {
  steps: Step[];
  state: 'complete' | 'awaiting' | 'exception-recovered' | 'exception-open';
  summary: string;
  metrics: { label: string; value: string; note?: string }[];
  scenarioName: string;
}

export interface ScenarioDef {
  id: string;
  name: string;
  oneLine: string;
  issue: string;
  defaultInputs: Partial<Inputs>;
  cost: number;           // illustrative chargeable estimate, AED
  responseHours: Record<Urgency, number>;
}

export const SCENARIOS: ScenarioDef[] = [
  { id: 'freezer-p1', name: 'Critical freezer fault', oneLine: 'A low-temperature freezer stops cooling in a supermarket cold room.',
    issue: 'Freezer FZ-07 reads −6 °C against a −22 °C set point', cost: 1850,
    defaultInputs: { urgency: 'P1', coverage: 'amc', threshold: 1000, availability: 'available' }, responseHours: { P1: 2, P2: 4, P3: 24 } },
  { id: 'resident-ac', name: 'Resident reports AC not cooling', oneLine: 'A resident reports a warm bedroom AC through WhatsApp.',
    issue: 'Bedroom AC blowing warm air in Apt 1204', cost: 0,
    defaultInputs: { urgency: 'P2', coverage: 'amc', threshold: 2000, availability: 'available', channel: 'whatsapp' }, responseHours: { P1: 2, P2: 4, P3: 48 } },
  { id: 'helpdesk-intake', name: 'Helpdesk call becomes service work', oneLine: 'A call about an ice machine is logged, triaged and placed on the board.',
    issue: 'Ice machine not producing at a grocery store', cost: 420,
    defaultInputs: { urgency: 'P2', coverage: 'none', threshold: 500, availability: 'available' }, responseHours: { P1: 2, P2: 4, P3: 24 } },
  { id: 'owner-expense', name: 'Owner reviews a maintenance expense', oneLine: 'A compressor replacement needs the property owner’s approval.',
    issue: 'Rooftop chiller compressor needs replacing', cost: 14200,
    defaultInputs: { urgency: 'P3', coverage: 'none', threshold: 2000, availability: 'available' }, responseHours: { P1: 2, P2: 4, P3: 72 } },
  { id: 'access-blocked', name: 'Planned visit meets an access restriction', oneLine: 'A quarterly maintenance visit clashes with a store stock-take.',
    issue: 'Quarterly condenser cleaning at a store closed for stock-take', cost: 0,
    defaultInputs: { urgency: 'P3', coverage: 'amc', threshold: 1000, availability: 'available' }, responseHours: { P1: 2, P2: 4, P3: 120 } },
  { id: 'bms-alarm', name: 'Building alarm becomes work', oneLine: 'A fan coil unit alarm in an office building opens a work order with the asset already identified.',
    issue: 'FCU-L4-07 supply air at 21.6 °C against 14 °C design', cost: 640,
    defaultInputs: { urgency: 'P2', coverage: 'amc', threshold: 1000, availability: 'available', channel: 'email' }, responseHours: { P1: 2, P2: 4, P3: 24 } },
  { id: 'tech-finding', name: 'Technician finding needs follow-up', oneLine: 'During planned maintenance a technician finds a corroded drain line.',
    issue: 'Corroded condensate drain line found during PPM', cost: 680,
    defaultInputs: { urgency: 'P3', coverage: 'amc', threshold: 500, availability: 'busy' }, responseHours: { P1: 2, P2: 4, P3: 72 } },
];
export const scenarioById = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

export const CHANNEL_NAME: Record<Channel, string> = { whatsapp: 'WhatsApp', app: 'the mobile app', email: 'email', sms: 'SMS' };
const fmtAED = (n: number) => 'AED ' + new Intl.NumberFormat('en-AE').format(n);
const hrs = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : h % 1 ? `${h} h` : `${h} h`);

export function defaultInputs(scenario: string, industry: string, base?: Partial<Inputs>): Inputs {
  const s = scenarioById[scenario] ?? SCENARIOS[0];
  return {
    scenario: s.id, industry, sites: 12, team: 12, asset: 'Low-temperature freezer',
    urgency: 'P2', coverage: 'amc', threshold: 1000, availability: 'available', channel: 'whatsapp', decision: 'approve',
    ...base, ...s.defaultInputs,
  };
}

/** Who pays, given coverage. Warranty parts go to the manufacturer; AMC covers labour. */
export function chargeable(def: ScenarioDef, i: Inputs): number {
  if (def.cost === 0) return 0;
  if (i.coverage === 'warranty') return 0;
  if (i.coverage === 'amc') return Math.round(def.cost * 0.62); // parts only, labour covered (illustrative split)
  return def.cost;
}

function assignment(i: Inputs, responseH: number) {
  // Team size changes how likely a second-choice technician exists.
  const bench = Math.max(1, Math.round(i.team / 6));
  if (i.availability === 'available') return { who: 'Joseph M.', eta: 0.4, ok: true, why: 'matches the equipment skill, holds a valid certificate and is 12 minutes away' };
  if (i.availability === 'busy') {
    const eta = bench > 1 ? 1.2 : 2.6;
    return { who: bench > 1 ? 'Priya S.' : 'Rahul N.', eta, ok: eta <= responseH, why: `is the next qualified technician free; first choice is on another ${i.urgency === 'P1' ? 'P1 job' : 'job'}` };
  }
  return { who: '', eta: 0, ok: false, why: 'no qualified technician is on shift within the response window' };
}

export function run(inp: Inputs): Outcome {
  const def = scenarioById[inp.scenario] ?? SCENARIOS[0];
  const respH = def.responseHours[inp.urgency];
  const steps: Step[] = [];
  const add = (s: Step) => steps.push(s);
  const cost = chargeable(def, inp);
  const needsApproval = cost > inp.threshold;
  const a = assignment(inp, respH);
  const ch = CHANNEL_NAME[inp.channel];
  let state: Outcome['state'] = 'complete';

  // 1. Event and understanding
  const intakeBy: Record<string, string> = {
    'resident-ac': `Sara reports it in ${ch}. Guided questions ask for the room, whether air is moving and a photo.`,
    'helpdesk-intake': 'A store manager calls the helpdesk. The agent uses the guided form; it will not save without location, asset and access.',
    'freezer-p1': 'The cold-room supervisor scans the QR label on FZ-07 and reports “not cooling”, with a display photo.',
    'owner-expense': 'A technician’s survey of the rooftop chiller recommends replacing the compressor.',
    'access-blocked': 'The quarterly plan generates a condenser-cleaning visit for Thursday.',
    'bms-alarm': 'The building management system reports the supply-air alarm; a rule matches it to FCU-L4-07 in Room 4.07 and opens a request.',
    'tech-finding': 'During the planned visit, the technician photographs a corroded drain line and raises a finding.',
  };
  add({ id: 'event', at: 0, actor: inp.scenario === 'access-blocked' || inp.scenario === 'bms-alarm' ? 'system' : 'customer', kind: 'record', tile: 0,
    title: inp.scenario === 'access-blocked' ? 'Planned visit generated' : inp.scenario === 'bms-alarm' ? 'Alarm received' : 'Request received', detail: intakeBy[def.id] ?? def.oneLine });

  if (def.id !== 'access-blocked' && def.id !== 'owner-expense') {
    add({ id: 'triage', at: 1, actor: 'assist', kind: 'proposal', tile: 1,
      title: 'Request understood',
      detail: `Suggested ${inp.urgency}, trade and category from the description and the asset record. A person confirms or changes it.`,
      context: [`Asset: ${inp.asset}`, `Reported issue: ${def.issue}`, `${inp.sites} sites in this account`],
      rule: { id: 'R5', text: `Category and trade come from the asset type; ${inp.urgency} sets a ${hrs(respH)} response target.` } });
  }

  // 2. Coverage
  const covText = inp.coverage === 'amc' ? 'Covered by the annual maintenance contract: labour included, parts charged.'
    : inp.coverage === 'warranty' ? 'Under manufacturer warranty: no charge to the customer; the claim goes to the warrantor.'
    : 'No contract on this asset: the work is chargeable at the price list.';
  add({ id: 'coverage', at: 2, actor: 'rule', kind: 'auto', tile: 3, title: 'Coverage checked', detail: covText,
    context: [inp.coverage === 'none' ? 'Contract: none found' : inp.coverage === 'amc' ? 'Contract: Gold AMC, active' : 'Warranty: active, 14 months left'],
    rule: { id: 'C2', text: 'Coverage is decided by contract, warranty and threshold, never by who reported the job.' } });

  // 3. Scheduling or assignment
  if (def.id === 'access-blocked') {
    add({ id: 'clash', at: 3, actor: 'rule', kind: 'exception', tile: 7, title: 'Access restriction found',
      detail: 'The store has a stock-take block-out on Thursday. The visit cannot go ahead as planned.',
      context: ['Block-out: stock-take, all day', 'PPM due window: 14 days'], rule: { id: 'V1', text: 'Visits never book into a customer block-out date.' } });
    add({ id: 'reslot', at: 4, actor: 'assist', kind: 'proposal', tile: 7, title: 'New slot proposed',
      detail: 'Saturday 07:00–09:00, before trading hours, still inside the due window. The customer is asked to approve.' });
    add({ id: 'cust-ok', at: 120, actor: 'customer', kind: 'approval', needs: 'approve', tile: 8, title: 'Customer approves the new slot',
      detail: `The store manager approves in ${ch}. The plan, technician calendar and compliance report update together.` });
  } else if (!a.ok && inp.availability === 'none') {
    add({ id: 'no-tech', at: 3, actor: 'rule', kind: 'exception', tile: 4, title: 'No technician available',
      detail: `${a.why[0].toUpperCase()}${a.why.slice(1)}. The job stays visible at the top of the board with its clock running.`,
      rule: { id: 'E1', text: `Unassigned ${inp.urgency} work escalates to the duty manager after 15 minutes.` } });
    add({ id: 'escalate', at: 15, actor: 'person', kind: 'human', needs: 'choose', tile: 4, title: 'Duty manager chooses a recovery',
      detail: 'Options offered: send to an approved subcontractor, call in an off-shift technician, or agree a later time with the customer.' });
    add({ id: 'sub', at: 22, actor: 'person', kind: 'auto', tile: 5, title: 'Subcontractor accepts',
      detail: 'The partner contractor accepts in their portal. Evidence and invoice will return to the same work order.' });
    state = 'exception-recovered';
  } else {
    add({ id: 'assign', at: 3, actor: 'assist', kind: 'proposal', tile: 4, title: 'Technician matched',
      detail: `${a.who} ${a.why}.`, context: [`Team on shift: ${inp.team}`, `Response target: ${hrs(respH)}`, `ETA: ${hrs(a.eta)}`],
      rule: { id: 'D3', text: 'Offer only to technicians with the skill, a valid certificate and site access hours that fit.' } });
    add({ id: 'assign-ok', at: 4, actor: 'person', kind: 'human', tile: 4, title: 'Dispatcher confirms',
      detail: 'The dispatcher accepts the suggestion. Nothing is assigned without a person in this configuration.' });
    if (!a.ok) {
      add({ id: 'risk', at: 5, actor: 'rule', kind: 'exception', tile: 4, title: 'Response time at risk',
        detail: `ETA ${hrs(a.eta)} is past the ${hrs(respH)} target. The customer is told the new ETA and the manager is alerted.`,
        rule: { id: 'S4', text: 'When a clock is at risk, the customer gets a new ETA automatically.' } });
      state = 'exception-recovered';
    }
  }

  // 4. Customer informed
  if (def.id !== 'access-blocked') {
    add({ id: 'notify', at: 6, actor: 'assist', kind: 'auto', tile: 6, title: 'Customer updated',
      detail: `A message drafted from the approved template goes out in ${ch}: who is coming and when.` });
  }

  // 5. Work on site (people)
  if (def.id !== 'owner-expense' && def.id !== 'access-blocked') {
    add({ id: 'onsite', at: Math.round((a.eta || 0.5) * 60) + 6, actor: 'tech', kind: 'human', tile: 2, title: 'Technician on site',
      detail: def.id === 'tech-finding' ? 'Scans the unit tag, records the finding with in-app photos and a reading.' : 'Arrival recorded, asset tag scanned, safety check completed, diagnosis recorded with photos.' });
  }

  // 6. Commercial path
  if (cost > 0) {
    add({ id: 'quote', at: 60 + (a.eta || 0) * 60, actor: 'assist', kind: 'proposal', tile: 9, title: 'Quotation prepared',
      detail: `Quotation drafted from the price list: ${fmtAED(cost)} chargeable${inp.coverage === 'amc' ? ' (parts; labour covered)' : ''}. Reviewed before sending.`,
      context: [`Estimate: ${fmtAED(def.cost)}`, `Coverage: ${inp.coverage === 'none' ? 'none' : inp.coverage.toUpperCase()}`] });
    if (needsApproval) {
      const approver = def.id === 'owner-expense' ? 'Property owner' : inp.industry === 'property-management' ? 'Property manager' : 'Customer facilities manager';
      add({ id: 'approval', at: 75 + (a.eta || 0) * 60, actor: 'customer', kind: 'approval', needs: 'approve', tile: 9,
        title: 'Approval required', detail: `${fmtAED(cost)} is above the ${fmtAED(inp.threshold)} limit, so the ${approver.toLowerCase()} is asked to approve.`,
        rule: { id: 'A1', text: `Spend above ${fmtAED(inp.threshold)} needs approval from the person who pays.` } });
      if (inp.urgency === 'P1') add({ id: 'pause', at: 76 + (a.eta || 0) * 60, actor: 'rule', kind: 'auto', tile: 3, title: 'Clock paused while customer decides',
        detail: 'The rectification clock pauses only while the quote is with the customer, as the contract allows.', rule: { id: '7.3(b)', text: 'Customer approval of chargeable parts pauses rectification time.' } });
      if (inp.decision === 'decline') {
        add({ id: 'declined', at: 180, actor: 'customer', kind: 'exception', tile: 9, title: 'Quotation declined',
          detail: 'The approver declines. The job does not disappear: it moves to “Declined, make safe”, the clock resumes and the account manager is asked to follow up.' });
        add({ id: 'makesafe', at: 200, actor: 'tech', kind: 'human', tile: 2, title: 'Made safe and recorded',
          detail: 'Temporary measures are recorded with photos. A follow-up option is kept on the customer’s record.' });
        state = 'exception-recovered';
      } else if (inp.decision === 'pending') {
        add({ id: 'waiting', at: 240, actor: 'system', kind: 'exception', tile: 9, title: 'Waiting for approval',
          detail: 'No decision yet. A reminder goes after 4 hours and the request stays visible in the approver’s inbox.' });
        state = 'awaiting';
      } else {
        add({ id: 'approved', at: 150, actor: 'customer', kind: 'human', tile: 9, title: 'Approved', detail: `Approved in ${def.id === 'owner-expense' ? 'the owner portal' : ch}. Parts are reserved and the return visit booked.` });
      }
    } else {
      add({ id: 'within', at: 70, actor: 'rule', kind: 'auto', tile: 9, title: 'Within approval limit',
        detail: `${fmtAED(cost)} is within the ${fmtAED(inp.threshold)} limit, so work continues without waiting.`,
        rule: { id: 'A1', text: `Spend up to ${fmtAED(inp.threshold)} is pre-approved.` } });
    }
  }

  // 7. Completion
  if (state !== 'awaiting' && !(inp.decision === 'decline' && cost > inp.threshold)) {
    add({ id: 'complete', at: 260, actor: 'tech', kind: 'human', tile: 10,
      title: def.id === 'access-blocked' ? 'Visit completed on the new date' : def.id === 'tech-finding' ? 'Follow-up completed' : 'Work completed',
      detail: 'Before and after photos, readings and the checklist are attached. The customer signs off with a code.' });
  }
  add({ id: 'record', at: 270, actor: 'system', kind: 'record', tile: 10, title: state === 'awaiting' ? 'Recorded so far' : 'Completion recorded',
    detail: 'Every step, decision and message is on the work order timeline and the audit log. Reports update from the same record.' });

  steps.sort((x, y) => x.at - y.at); // stable: equal times keep their logical order
  const lastAt = steps[steps.length - 1].at;
  const summary = state === 'awaiting' ? 'Waiting on a decision. The work stays visible with its reminder scheduled.'
    : state === 'exception-recovered' ? 'An exception occurred and was recovered without losing track of the work.'
    : 'Resolved within the rules for this account.';
  return {
    steps, state, summary, scenarioName: def.name,
    metrics: [
      { label: 'Response target', value: hrs(respH) },
      { label: 'Chargeable', value: cost ? fmtAED(cost) : 'None', note: inp.coverage === 'warranty' ? 'Warranty claim' : undefined },
      { label: 'Approval', value: cost > inp.threshold ? (inp.decision === 'approve' ? 'Approved' : inp.decision === 'decline' ? 'Declined' : 'Waiting') : 'Not needed' },
      { label: 'People involved', value: String(new Set(steps.filter((s) => s.actor === 'person' || s.actor === 'tech' || s.actor === 'customer').map((s) => s.actor)).size) },
      { label: 'Compressed timeline', value: lastAt >= 60 ? `${Math.round(lastAt / 60 * 10) / 10} h` : `${lastAt} min`, note: 'Illustrative' },
    ],
  };
}
