import type { StatusKey } from '../config/brand';

/**
 * Capability content model. Every capability links to product evidence
 * (screen IDs in the clickable prototype) and carries an availability status.
 * Status rules: nothing is "live" until it runs in production and is verified.
 * Tessaro 2.0 is designed and approved for a pilot build; see docs/SOURCES.md.
 */
export type Role = 'manager' | 'dispatcher' | 'technician' | 'resident' | 'customer' | 'owner' | 'admin' | 'finance';
export type Group =
  | 'intake' | 'coordination' | 'assets' | 'maintenance' | 'contracts'
  | 'commercial' | 'field' | 'stakeholders' | 'reporting' | 'configuration' | 'trust';

export interface Capability {
  id: string;
  name: string;
  group: Group;
  outcome: string;      // what it helps someone accomplish
  example: string;      // a concrete sentence from the product's world
  roles: Role[];
  status: StatusKey;
  evidence: string[];   // prototype screen keys
  scenarios: string[];  // scenario ids
  dependsOn?: string[]; // capability ids
  ai?: boolean;         // involves suggestion or drafting assistance
}

export const GROUPS: Record<Group, { name: string; question: string }> = {
  intake: { name: 'Service intake', question: 'How does a request arrive and become clear?' },
  coordination: { name: 'Work coordination', question: 'Who goes, when, and in what order?' },
  assets: { name: 'Assets and locations', question: 'What equipment is where, and what is its history?' },
  maintenance: { name: 'Planned maintenance', question: 'What must happen before anything breaks?' },
  contracts: { name: 'Contracts and service commitments', question: 'What is covered and how fast must we respond?' },
  commercial: { name: 'Quotations and approvals', question: 'Who pays, and who has to agree first?' },
  field: { name: 'Technician execution', question: 'What does the technician need on site?' },
  stakeholders: { name: 'Residents, customers and owners', question: 'Who needs to know, and how?' },
  reporting: { name: 'Reporting and insight', question: 'Are we keeping our commitments?' },
  configuration: { name: 'Configuration', question: 'Can it work the way we work?' },
  trust: { name: 'Control and traceability', question: 'Who can do what, and can we prove it?' },
};

export const ROLE_NAMES: Record<Role, string> = {
  manager: 'Service or maintenance manager', dispatcher: 'Dispatcher', technician: 'Technician',
  resident: 'Resident or tenant', customer: 'Customer facilities team', owner: 'Property owner',
  admin: 'Administrator', finance: 'Finance approver',
};

export const CAPABILITIES: Capability[] = [
  // Intake
  { id: 'guided-intake', name: 'Guided request intake', group: 'intake', status: 'designed',
    outcome: 'Turn a phone call, QR scan or chat message into a complete, consistent service request.',
    example: 'A helpdesk agent logs a call for an ice machine; the form asks for location, asset and access before it can be saved.',
    roles: ['dispatcher', 'customer', 'resident'], evidence: ['W-016', 'W-015', 'PT-001'], scenarios: ['helpdesk-intake', 'resident-ac'] },
  { id: 'suggested-triage', name: 'Suggested triage', group: 'intake', status: 'designed', ai: true,
    outcome: 'Get a proposed category, priority and trade for each request, with the rule that produced it.',
    example: 'Suggested by rule R5: Refrigeration · ice machine, priority P2, 4 h response. The agent confirms or changes it.',
    roles: ['dispatcher'], evidence: ['W-016', 'W-017'], scenarios: ['helpdesk-intake'], dependsOn: ['guided-intake'] },
  { id: 'whatsapp-intake', name: 'WhatsApp requests and updates', group: 'intake', status: 'designed',
    outcome: 'Let residents and customers report and follow work in the chat app they already use.',
    example: 'A resident answers three guided questions in WhatsApp; the same mandatory steps apply as on the web form.',
    roles: ['resident', 'customer'], evidence: ['WA-1-1', 'WA-1-2', 'WA-1-3'], scenarios: ['resident-ac'] },
  { id: 'fault-groups', name: 'Repeat-fault grouping', group: 'intake', status: 'designed',
    outcome: 'See when the same unit keeps failing, even when people describe the fault differently.',
    example: 'Three requests for one freezer over 30 days are grouped, so the repeat failure is visible to the manager.',
    roles: ['manager'], evidence: ['W-025', 'W-073'], scenarios: ['freezer-p1'] },

  // Coordination
  { id: 'dispatch-board', name: 'Dispatch board', group: 'coordination', status: 'designed',
    outcome: 'Place every job on a timeline of technicians, with response deadlines visible.',
    example: 'Unscheduled jobs are sorted by time to breach; drag one onto a technician or press A to assign.',
    roles: ['dispatcher'], evidence: ['W-026', 'W-027'], scenarios: ['freezer-p1', 'helpdesk-intake'] },
  { id: 'suggested-assignment', name: 'Assignment suggestions with reasons', group: 'coordination', status: 'designed', ai: true,
    outcome: 'Get a proposed technician with the reasons stated, then accept or change it.',
    example: 'Joseph M. has the rack-systems skill, is 12 minutes away and the site is open 24/7. Assign at 14:30?',
    roles: ['dispatcher'], evidence: ['W-026'], scenarios: ['freezer-p1', 'resident-ac', 'access-blocked'], dependsOn: ['technician-skills'] },
  { id: 'technician-skills', name: 'Skills, shifts and territories', group: 'coordination', status: 'designed',
    outcome: 'Match work to people who are qualified, certified and on shift.',
    example: 'A refrigerant job cannot be offered to a technician whose handling certificate has expired.',
    roles: ['manager', 'dispatcher'], evidence: ['W-067', 'W-068', 'W-069'], scenarios: ['freezer-p1'] },
  { id: 'work-orders', name: 'Work orders end to end', group: 'coordination', status: 'designed',
    outcome: 'Follow each job from request to verified completion in one record.',
    example: 'LT-WO-2027-00142 shows the request, assignment, diagnosis, quote, pause and sign-off on one timeline.',
    roles: ['manager', 'dispatcher'], evidence: ['W-018', 'W-019', 'W-019B'], scenarios: ['freezer-p1', 'resident-ac'] },

  // Assets
  { id: 'asset-register', name: 'Asset register and history', group: 'assets', status: 'designed',
    outcome: 'Know every installed unit, where it is, its condition and everything done to it.',
    example: 'Scan FZ-07 on site: model, refrigerant charge, warranty, open work and twelve months of calls appear.',
    roles: ['manager', 'technician', 'customer'], evidence: ['W-035', 'W-036', 'W-040'], scenarios: ['freezer-p1'] },
  { id: 'locations', name: 'Sites, buildings and units', group: 'assets', status: 'designed',
    outcome: 'Model portfolios, buildings, floors and units, or customer sites and rooms.',
    example: 'Marina Heights › Tower A › Floor 12 › Apt 1204, with the AC units that belong to it.',
    roles: ['manager', 'owner', 'admin'], evidence: ['W-031', 'W-032', 'W-033'], scenarios: ['resident-ac', 'owner-expense'] },
  { id: 'asset-tags', name: 'QR, barcode and NFC tags', group: 'assets', status: 'designed',
    outcome: 'Identify equipment in one scan, even offline.',
    example: 'The technician scans QR-LT-003118; the app confirms it matches the job before work can start.',
    roles: ['technician'], evidence: ['W-039', 'M-02-4', 'M-02-6'], scenarios: ['freezer-p1'] },
  { id: 'data-import', name: 'Guided data import', group: 'assets', status: 'designed',
    outcome: 'Bring existing asset, site and contract lists in from spreadsheets, with checks.',
    example: 'An import flags 14 rows with no location before anything is written.',
    roles: ['admin'], evidence: ['W-034', 'CC-009'], scenarios: [] },

  // Maintenance
  { id: 'ppm', name: 'Planned maintenance plans', group: 'maintenance', status: 'designed',
    outcome: 'Generate visits automatically from plans and keep them on schedule.',
    example: 'Quarterly condenser cleaning creates 38 visits for November and shows which are at risk.',
    roles: ['manager'], evidence: ['W-055', 'W-056', 'W-057'], scenarios: ['access-blocked'] },
  { id: 'visit-approvals', name: 'Visit approvals and block-out dates', group: 'maintenance', status: 'pilot',
    outcome: 'Respect customer trading hours, stock-takes and shutdowns when booking visits.',
    example: 'A stock-take blocks Qusais on 12 Nov; affected visits move and the customer approves the new slots.',
    roles: ['manager', 'customer'], evidence: ['W-057B'], scenarios: ['access-blocked'] },
  { id: 'compliance', name: 'Compliance and statutory checks', group: 'maintenance', status: 'designed',
    outcome: 'Track inspections, certificates and refrigerant logs that regulators and insurers ask for.',
    example: 'Legionella testing for Tower B is due in 6 days; the certificate from last year is attached.',
    roles: ['manager'], evidence: ['W-058', 'W-059', 'W-079'], scenarios: [] },

  // Contracts
  { id: 'contracts', name: 'Contracts and coverage', group: 'contracts', status: 'designed',
    outcome: 'Know instantly whether a job is covered, chargeable or under warranty.',
    example: 'Coverage lookup: FZ-07 is on Gold AMC; labour covered, parts above AED 500 need approval.',
    roles: ['manager', 'dispatcher', 'finance'], evidence: ['W-045', 'W-046', 'W-048'], scenarios: ['freezer-p1', 'owner-expense'] },
  { id: 'sla', name: 'Response and resolution clocks', group: 'contracts', status: 'designed',
    outcome: 'Run the right clock per contract and priority, and pause it only when the rules allow.',
    example: 'The rectification clock pauses while the customer considers the quote, under clause 7.3(b).',
    roles: ['manager', 'dispatcher', 'customer'], evidence: ['W-053', 'W-006'], scenarios: ['freezer-p1', 'quote-declined'] },
  { id: 'renewals', name: 'Contract renewal reminders', group: 'contracts', status: 'pilot',
    outcome: 'Renew annual contracts on time with reminders at 30, 15 and 7 days.',
    example: 'AMC-2026-017 ends 30 Nov; the account owner is reminded with the year’s service history attached.',
    roles: ['manager'], evidence: ['W-046B'], scenarios: [] },

  // Commercial
  { id: 'quotations', name: 'Quotations', group: 'commercial', status: 'designed',
    outcome: 'Price chargeable work from price lists and get it accepted in one link.',
    example: 'QT-0381: defrost heater AED 1,850; the customer opens the link, reviews photos and approves.',
    roles: ['manager', 'customer', 'technician'], evidence: ['W-060', 'W-061', 'W-062', 'PT-006'], scenarios: ['freezer-p1', 'quote-declined'] },
  { id: 'approvals', name: 'Approval routing and limits', group: 'commercial', status: 'designed',
    outcome: 'Send spend to the right person based on amount, site and who pays.',
    example: 'Up to AED 2,000 the property manager approves; above it, the owner is asked in their portal.',
    roles: ['finance', 'owner', 'manager'], evidence: ['W-063', 'W-099', 'PT-011'], scenarios: ['owner-expense', 'freezer-p1'] },
  { id: 'recommendations', name: 'Replacement and contract recommendations', group: 'commercial', status: 'designed', ai: true,
    outcome: 'See which assets to replace and which customers would save with a contract, from service history.',
    example: 'FZ-07 failed 6 times this year; a replacement proposal is suggested before renewal.',
    roles: ['manager'], evidence: ['W-076', 'W-075'], scenarios: [] },

  // Field
  { id: 'technician-app', name: 'Technician app, online or offline', group: 'field', status: 'designed',
    outcome: 'Give technicians the day’s jobs, manuals and checklists, and keep working without signal.',
    example: 'No signal in Cold room 2: three changes queue on the phone and sync when the van is back outside.',
    roles: ['technician'], evidence: ['M-01-3', 'M-01-4', 'M-05-4'], scenarios: ['freezer-p1', 'tech-finding'] },
  { id: 'evidence', name: 'Evidence and verified completion', group: 'field', status: 'designed',
    outcome: 'Prove what was done with in-app photos, readings, arrival checks and customer sign-off.',
    example: 'Before and after photos are stamped with time and job number; the resident signs off with a code.',
    roles: ['technician', 'manager', 'customer'], evidence: ['M-03-4', 'M-05-2', 'M-05-3', 'W-022', 'W-024'], scenarios: ['resident-ac', 'freezer-p1'] },
  { id: 'safety', name: 'Safety checks and permits', group: 'field', status: 'designed',
    outcome: 'Block the start of work until hazards, controls and permits are confirmed.',
    example: 'Lock-out at DB-2 must be confirmed before the freezer job can start.',
    roles: ['technician', 'manager'], evidence: ['M-03-1', 'W-077'], scenarios: ['freezer-p1'] },
  { id: 'findings', name: 'Findings and follow-up work', group: 'field', status: 'designed',
    outcome: 'Turn what a technician finds on site into a request, quote or survey without retyping.',
    example: 'A corroded drain line found during PPM becomes a follow-up request with photos attached.',
    roles: ['technician', 'manager'], evidence: ['M-05-1', 'M-04-5'], scenarios: ['tech-finding'] },

  // Stakeholders
  { id: 'resident-app', name: 'Resident app', group: 'stakeholders', status: 'designed',
    outcome: 'Let residents report, book, let technicians in and confirm the fix, in English or Arabic.',
    example: 'Sara sees “Joseph · 14 min away”, approves entry and signs off with a 4-digit code.',
    roles: ['resident'], evidence: ['R-01-5', 'R-02-1', 'R-04-5', 'R-07-2'], scenarios: ['resident-ac'] },
  { id: 'owner-portal', name: 'Owner portal', group: 'stakeholders', status: 'designed',
    outcome: 'Show owners their portfolio, approvals and monthly reports without phone calls.',
    example: 'Khalid approves a compressor replacement and reads the monthly report for 4 buildings.',
    roles: ['owner'], evidence: ['PT-009', 'PT-010', 'PT-011', 'PT-012'], scenarios: ['owner-expense'] },
  { id: 'customer-portal', name: 'Customer portal', group: 'stakeholders', status: 'designed',
    outcome: 'Give customers their sites, equipment, contracts, quotations and sign-offs in one place.',
    example: 'Qusais facilities sees open jobs, the PPM calendar and QT-0381 waiting for them.',
    roles: ['customer'], evidence: ['PT-013', 'PT-014', 'PT-015', 'PT-016'], scenarios: ['freezer-p1'] },
  { id: 'subcontractors', name: 'Subcontractor portal', group: 'stakeholders', status: 'designed',
    outcome: 'Hand work to subcontractors and get their evidence, quotes and invoices back in the same record.',
    example: 'Gulf Cool accepts a job, uploads photos and submits an invoice against the work order.',
    roles: ['manager'], evidence: ['PT-018', 'PT-019', 'PT-020'], scenarios: [] },

  // Reporting
  { id: 'dashboards', name: 'Role dashboards', group: 'reporting', status: 'designed',
    outcome: 'Start each day with the exceptions that need you, by role.',
    example: 'The engineering overview shows 2 of 3 sites healthy, 31 hours of critical downtime and PPM at 92.4%.',
    roles: ['manager', 'dispatcher', 'finance'], evidence: ['W-007', 'W-008', 'W-013', 'W-014'], scenarios: [] },
  { id: 'kpi', name: 'KPIs, scorecards and deductions', group: 'reporting', status: 'designed',
    outcome: 'Measure providers on the KPIs the owner set, from records they cannot edit.',
    example: 'Quarterly P1 response for a provider: 94% against a 95% target, deduction calculated by the contract rule.',
    roles: ['owner', 'manager'], evidence: ['W-054', 'W-074'], scenarios: [] },
  { id: 'reports', name: 'Reports and scheduled exports', group: 'reporting', status: 'designed',
    outcome: 'Send the monthly report automatically, in the format each audience reads.',
    example: 'Owners receive a monthly PDF; finance receives the billing lines as a spreadsheet.',
    roles: ['manager', 'owner', 'finance'], evidence: ['W-081', 'W-082', 'W-083'], scenarios: [] },

  // Configuration
  { id: 'forms', name: 'Forms and checklists', group: 'configuration', status: 'designed',
    outcome: 'Build your own inspection and service checklists without code.',
    example: 'A cold-room checklist requires a temperature reading and a photo before the job can close.',
    roles: ['admin'], evidence: ['W-096'], scenarios: [] },
  { id: 'rules', name: 'Rules, approval matrices and notifications', group: 'configuration', status: 'designed',
    outcome: 'Set priorities, escalations, approval limits and messages as editable tables.',
    example: 'An approval matrix change is reviewed by a second admin before it is published.',
    roles: ['admin'], evidence: ['W-098', 'W-099', 'W-100', 'W-104'], scenarios: ['owner-expense'] },
  { id: 'integrations', name: 'ERP, CRM and messaging connections', group: 'configuration', status: 'proposed',
    outcome: 'Exchange purchase approvals, units and tenancies with systems such as SAP and Salesforce.',
    example: 'A purchase request above the threshold is sent to SAP for PO approval; the decision returns to the job.',
    roles: ['admin', 'finance'], evidence: ['W-105'], scenarios: [] },
  { id: 'branding', name: 'Your logo, colours and languages', group: 'configuration', status: 'designed',
    outcome: 'Present apps and portals under your own brand, in English and Arabic.',
    example: 'Residents see “Amwal Care, powered by Tessaro” in the app store listing and in WhatsApp.',
    roles: ['admin'], evidence: ['W-095', 'R-07-2'], scenarios: [] },

  // Trust
  { id: 'roles', name: 'Roles and permissions', group: 'trust', status: 'designed',
    outcome: 'Give each person exactly the access their job needs, per organization and site.',
    example: 'A senior technician can assign work in their own region but cannot see prices.',
    roles: ['admin'], evidence: ['W-089', 'W-090'], scenarios: [] },
  { id: 'audit', name: 'Audit log', group: 'trust', status: 'pilot',
    outcome: 'See who changed what and when, for every record and setting.',
    example: 'The clock pause on LT-WO-2027-00142 shows who approved it, when and under which clause.',
    roles: ['admin', 'manager'], evidence: ['W-093'], scenarios: ['freezer-p1'] },
  { id: 'support-access', name: 'Customer-approved support access', group: 'trust', status: 'designed',
    outcome: 'Vendor staff can only see your records inside a time-limited grant you approve.',
    example: 'Support opens a 4-hour grant for one case; it expires automatically and is logged.',
    roles: ['admin'], evidence: ['W-092', 'CC-029', 'CC-030'], scenarios: [] },

  // Proposed direction
  { id: 'orchestration', name: 'Coordinated AI operations', group: 'coordination', status: 'proposed', ai: true,
    outcome: 'Let an assistant carry routine steps across intake, coverage, assignment and updates, asking people where rules require it.',
    example: 'A request is understood, coverage checked and a technician proposed in one pass; a person approves.',
    roles: ['manager', 'dispatcher'], evidence: [], scenarios: ['freezer-p1', 'resident-ac'], dependsOn: ['suggested-triage', 'suggested-assignment'] },
];

export const capabilityById = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c]));
