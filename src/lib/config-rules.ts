/**
 * Configurator model and validation. Pure functions so they can be tested and
 * reused by the product import (W-104 applies its own checks as well).
 * Blockers stop a draft from being sent for setup; warnings are worth reading
 * but don't stop anything.
 */
export interface ConfigValues {
  company?: string;            // company type label only, not a name
  industry?: string;
  countries: number;
  sites: number;
  assets: number;
  assetTypes: string[];
  technicians: number;
  dispatchers: number;
  subcontractors: boolean;
  roles: string[];
  contractTypes: string[];     // amc, warranty, adhoc
  p1Hours: number;
  p2Hours: number;
  ppm: boolean;
  approvalsOn: boolean;
  threshold: number;
  approver: string;            // customer, owner, finance, manager
  channels: string[];          // whatsapp, app, email, sms
  languages: string[];         // en, ar
  whatsappConsent: boolean;
  assisted: boolean;
}

export const CONFIG_STEPS = [
  { id: 'company', title: 'Company and industry' },
  { id: 'sites', title: 'Sites and equipment' },
  { id: 'team', title: 'Team and roles' },
  { id: 'contracts', title: 'Contracts and response times' },
  { id: 'approvals', title: 'Approvals' },
  { id: 'channels', title: 'Channels and languages' },
  { id: 'review', title: 'Review' },
] as const;

export const defaultConfig = (industry?: string): ConfigValues => ({
  industry, countries: 1, sites: 10, assets: 300, assetTypes: [], technicians: 12, dispatchers: 2, subcontractors: false,
  roles: ['manager', 'dispatcher', 'technician'], contractTypes: ['amc'], p1Hours: 4, p2Hours: 24, ppm: true,
  approvalsOn: true, threshold: 2000, approver: 'customer', channels: ['whatsapp', 'app'], languages: ['en'],
  whatsappConsent: false, assisted: false,
});

export interface Finding { level: 'blocker' | 'warning'; step: number; field: string; text: string }
const PROPOSED_INDUSTRIES = ['retail-facilities', 'cold-chain'];

export function validate(v: ConfigValues, plans: { techs: number }[] = [{ techs: 40 }]): Finding[] {
  const f: Finding[] = [];
  const B = (step: number, field: string, text: string) => f.push({ level: 'blocker', step, field, text });
  const W = (step: number, field: string, text: string) => f.push({ level: 'warning', step, field, text });
  if (!v.industry) B(0, 'industry', 'Choose an industry so we can apply the right template.');
  if (PROPOSED_INDUSTRIES.includes(v.industry || '')) W(0, 'industry', 'This industry is proposed: the template reuses designed parts and will need extra review during setup.');
  if (!(v.countries >= 1)) B(0, 'countries', 'Enter at least one country.');
  if (v.countries > 3) W(0, 'countries', 'Packages include up to 3 countries. More countries are quoted separately.');
  if (!(v.sites >= 1)) B(1, 'sites', 'Enter at least one site.');
  if (v.assets > 5000) W(1, 'assets', 'More than 5,000 assets is above fair use and is quoted separately.');
  if (v.assetTypes.length === 0) W(1, 'assetTypes', 'No equipment types chosen. You can add them later, but checklists start empty.');
  if (!(v.technicians >= 1)) B(2, 'technicians', 'Enter at least one technician.');
  const max = Math.max(...plans.map((p) => p.techs));
  if (v.technicians > max) W(2, 'technicians', `More than ${max} technicians: each extra technician is added to the largest package.`);
  if (v.dispatchers < 1 && v.technicians > 5) W(2, 'dispatchers', 'No dispatcher with more than 5 technicians. Someone will need to confirm assignments.');
  if (!v.roles.includes('admin')) W(2, 'roles', 'No administrator chosen. Every workspace needs one; we will make the first person to sign in the administrator.');
  if (v.contractTypes.length === 0) B(3, 'contractTypes', 'Choose at least one contract type so coverage can be checked.');
  if (!(v.p1Hours > 0) || !(v.p2Hours > 0)) B(3, 'p1Hours', 'Enter response times for critical and normal jobs.');
  else if (v.p1Hours > v.p2Hours) B(3, 'p1Hours', 'Critical jobs have a longer response time than normal jobs. Check the two values.');
  if (!v.ppm) W(3, 'ppm', 'Planned maintenance is off. Most contracts require it; you can switch it on later.');
  if (v.approvalsOn && !(v.threshold >= 0)) B(4, 'threshold', 'Enter the amount above which approval is needed (0 means every quote).');
  if (v.approvalsOn && !v.approver) B(4, 'approver', 'Choose who approves.');
  if (v.approvalsOn && v.approver === 'owner' && !v.roles.includes('owner')) W(4, 'approver', 'Owners approve, but the owner portal is not in your roles. It will be added.');
  if (!v.approvalsOn) W(4, 'approvalsOn', 'Without approvals, chargeable work proceeds without the payer confirming it.');
  if (v.channels.length === 0) B(5, 'channels', 'Choose at least one channel for requests and updates.');
  if (v.channels.includes('whatsapp') && !v.whatsappConsent) B(5, 'whatsappConsent', 'WhatsApp needs a consent step for residents and customers. Confirm you will collect it.');
  if (v.channels.includes('sms')) W(5, 'channels', 'SMS updates are proposed and not in the first release.');
  if (v.languages.length === 0) B(5, 'languages', 'Choose at least one language.');
  return f;
}

export function recommendPlan(techs: number, plans: { id: string; techs: number; price: number }[], extra: number) {
  const fit = plans.find((p) => p.techs >= techs);
  if (fit) return { plan: fit, extraTechs: 0, total: fit.price };
  const top = plans[plans.length - 1];
  const extraTechs = techs - top.techs;
  return { plan: top, extraTechs, total: top.price + extraTechs * extra };
}

/** A plain-language preview of how one chargeable job would flow under this configuration. */
export function workflowPreview(v: ConfigValues): string[] {
  const ch = v.channels.includes('whatsapp') ? 'WhatsApp' : v.channels.includes('app') ? 'the app' : v.channels[0] || 'a channel';
  const out = [
    `A request arrives by ${ch}${v.languages.includes('ar') ? ' in English or Arabic' : ''}.`,
    `Coverage is checked against ${v.contractTypes.map((c) => ({ amc: 'AMC', warranty: 'warranty', adhoc: 'ad-hoc' } as Record<string, string>)[c]).join(', ') || 'no'} contracts.`,
    `Critical jobs must be answered within ${v.p1Hours} h, normal jobs within ${v.p2Hours} h.`,
    `A technician is suggested from ${v.technicians}${v.subcontractors ? ' in-house and subcontracted' : ''} technicians; ${v.dispatchers > 0 ? 'a dispatcher confirms' : 'the manager confirms'}.`,
  ];
  if (v.approvalsOn) out.push(v.threshold === 0 ? `Every quote waits for the ${v.approver}.` : `Quotes above AED ${v.threshold.toLocaleString('en-AE')} wait for the ${v.approver}; smaller work continues.`);
  out.push('Evidence and sign-off are recorded on the job; KPIs update from that record.');
  if (v.ppm) out.push('Planned maintenance visits are generated from asset schedules.');
  return out;
}
