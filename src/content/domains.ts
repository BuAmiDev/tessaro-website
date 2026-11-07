/**
 * The four connected domains, in product language first, acronym second.
 * Coverage lists capability ids; availability comes from each capability.
 * Terminology calibrated against IFMA (CAFM) and IBM (CMMS vs EAM).
 */
export interface Domain { id: string; acronym: string; name: string; short: string; line: string; body: string; covers: string[]; evidence: string[]; question: string; }
export const DOMAINS: Domain[] = [
  { id: 'facilities', acronym: 'CAFM', name: 'Facilities', short: 'Spaces and services',
    line: 'Buildings, floors, rooms and the services that keep them working.',
    body: 'Model your portfolio from site to room, take requests from the people who use the space, and keep residents, tenants, customers and owners informed in their own channel.',
    question: 'Where is it, and who is affected?',
    covers: ['locations', 'guided-intake', 'whatsapp-intake', 'resident-app', 'owner-portal', 'customer-portal', 'energy'],
    evidence: ['W-031', 'W-032', 'W-033', 'W-016', 'R-02-1', 'PT-009', 'W-086'] },
  { id: 'maintenance', acronym: 'CMMS', name: 'Maintenance', short: 'Work, plans and parts',
    line: 'Planned and reactive maintenance, inspections, parts and the history behind every job.',
    body: 'Generate planned visits from schedules, run inspections with your own checklists, reserve parts, and keep a complete maintenance history on every asset.',
    question: 'What has to happen, and when?',
    covers: ['ppm', 'inspections', 'compliance', 'parts', 'work-orders', 'forms', 'visit-approvals'],
    evidence: ['W-055', 'W-057', 'W-058', 'W-080', 'W-071', 'W-072', 'W-019'] },
  { id: 'field-service', acronym: 'FSM', name: 'Field service', short: 'People on the move',
    line: 'Intake, dispatch, scheduling, technicians on site, customer updates and sign-off.',
    body: 'Match the right technician inside the response window, give them everything on their phone, capture evidence, and close the job with the customer’s confirmation.',
    question: 'Who goes, and how do we prove it’s done?',
    covers: ['dispatch-board', 'suggested-assignment', 'technician-skills', 'technician-app', 'evidence', 'safety', 'findings', 'subcontractors'],
    evidence: ['W-026', 'W-027', 'M-01-3', 'M-02-5', 'M-03-4', 'M-05-3', 'WA-1-4'] },
  { id: 'assets', acronym: 'EAM', name: 'Asset management', short: 'Condition and lifecycle',
    line: 'Asset hierarchies, readings, condition, warranty, cost and replacement decisions.',
    body: 'Hold every unit with its location, contract, warranty and history; bring in alarms and readings; and see reliability and cost so replacement becomes a planned decision.',
    question: 'What is it worth keeping, and for how long?',
    covers: ['asset-register', 'telemetry', 'asset-tags', 'warranties', 'lifecycle', 'installations', 'recommendations'],
    evidence: ['W-035', 'W-036', 'W-040', 'W-085', 'W-050', 'W-075', 'W-076'] },
];
/** What the four share. These are what make it one platform rather than four tools. */
export const SHARED = [
  { id: 'record', name: 'One asset and location record', text: 'Every request, visit and reading attaches to the same unit in the same room.' },
  { id: 'contracts', name: 'Contracts and commitments', text: 'Coverage, response clocks and KPIs come from the contract, not from memory.' },
  { id: 'approvals', name: 'Approvals and spend', text: 'Quotes go to the person who pays, by amount and by site.' },
  { id: 'people', name: 'People and roles', text: 'Office, technicians, subcontractors, residents and owners, each with their own view.' },
  { id: 'messages', name: 'Communication', text: 'WhatsApp, app, portal and email updates that follow the job’s real state.' },
  { id: 'evidence', name: 'Evidence and audit', text: 'Photos, readings, sign-offs and every change, kept with who and when.' },
];
export const domainById = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
