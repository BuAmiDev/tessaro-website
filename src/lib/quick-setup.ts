/**
 * Three approachable starting choices and what they imply. Used by the
 * homepage preview and the configurator's starting screen. Pure, testable.
 */
import type { ConfigValues } from './config-rules';

export type Manage = 'spaces' | 'equipment' | 'both';
export type Model = 'inhouse' | 'provider' | 'manager';
export type Focus = 'response' | 'planned' | 'spend' | 'visibility';
export interface Choices { manage: Manage; model: Model; focus: Focus }

export const MANAGE: Record<Manage, { label: string; note: string }> = {
  spaces: { label: 'Buildings and spaces', note: 'Floors, rooms, tenants and the services that keep them running' },
  equipment: { label: 'Equipment at customer sites', note: 'Units you install, maintain and repair for others' },
  both: { label: 'Both', note: 'Your own portfolio and the equipment inside it' },
};
export const MODEL: Record<Model, { label: string; note: string }> = {
  inhouse: { label: 'Our own team does the work', note: 'In-house engineers and technicians' },
  provider: { label: 'We serve customers under contract', note: 'Maintenance contracts, response times, quotations' },
  manager: { label: 'We manage several providers', note: 'You coordinate; contractors do the work' },
};
export const FOCUS: Record<Focus, { label: string; note: string }> = {
  response: { label: 'Respond faster', note: 'Clear requests, the right person, inside the window' },
  planned: { label: 'Planned work on time', note: 'Schedules, inspections and compliance' },
  spend: { label: 'Control spend', note: 'Quotes go to whoever pays, with limits' },
  visibility: { label: 'Keep people informed', note: 'Residents, customers and owners see progress' },
};

export interface Derived {
  industry: string; template: string;
  domains: { id: string; weight: 'lead' | 'support' }[];
  people: string[]; work: string[]; assets: string[]; communication: string[]; oversight: string[];
  capabilities: string[]; patch: Partial<ConfigValues>;
}

export function derive(c: Choices): Derived {
  const industry = c.manage === 'equipment' ? 'hvac-refrigeration' : c.model === 'manager' ? 'property-management' : 'facilities-maintenance';
  const template = { 'hvac-refrigeration': 'Equipment service', 'property-management': 'Property management', 'facilities-maintenance': 'Facilities maintenance' }[industry]!;
  const lead = c.manage === 'equipment' ? ['field-service', 'assets'] : c.manage === 'spaces' ? ['facilities', 'maintenance'] : ['facilities', 'assets'];
  const domains = ['facilities', 'maintenance', 'field-service', 'assets'].map((id) => ({ id, weight: (lead.includes(id) ? 'lead' : 'support') as 'lead' | 'support' }));
  const people = ['Managers and dispatchers', c.model === 'manager' ? 'Contractor portals' : 'Technicians on the mobile app'];
  if (c.model === 'provider') people.push('Customer facilities teams');
  if (c.manage !== 'equipment') people.push(c.model === 'manager' ? 'Residents and owners' : 'Building occupants');
  const work = c.focus === 'planned' ? ['Planned maintenance plans', 'Inspections and compliance', 'Reactive requests'] : ['Guided requests', 'Dispatch board', c.focus === 'spend' ? 'Quotations' : 'Planned visits'];
  const assets = c.manage === 'spaces' ? ['Sites, floors and rooms', 'Building services equipment'] : c.manage === 'equipment' ? ['Units by customer site', 'Warranty and contract coverage'] : ['Portfolio hierarchy', 'Equipment with lifecycle and cost'];
  const communication = c.focus === 'visibility' ? ['WhatsApp updates', c.model === 'manager' ? 'Resident app and owner portal' : 'Customer portal'] : ['Email and app updates', 'WhatsApp when you switch it on'];
  const oversight = c.focus === 'spend' ? ['Approval limits by amount and site', 'Budgets'] : c.focus === 'response' ? ['Response clocks from the contract', 'Dashboards by role'] : ['Compliance tracking', 'Reports on schedule'];
  const caps = new Set<string>(['guided-intake', 'work-orders', 'technician-app', 'evidence']);
  if (c.manage !== 'spaces') caps.add('asset-register').add('warranties');
  if (c.manage !== 'equipment') caps.add('locations');
  if (c.model === 'provider') caps.add('contracts').add('sla').add('customer-portal');
  if (c.model === 'manager') caps.add('subcontractors').add('owner-portal').add('resident-app');
  if (c.focus === 'response') caps.add('dispatch-board').add('suggested-assignment');
  if (c.focus === 'planned') caps.add('ppm').add('inspections').add('compliance');
  if (c.focus === 'spend') caps.add('quotations').add('approvals');
  if (c.focus === 'visibility') caps.add('whatsapp-intake');
  const patch: Partial<ConfigValues> = {
    industry, company: c.model === 'manager' ? 'manager' : c.model === 'provider' ? 'provider' : 'inhouse',
    subcontractors: c.model === 'manager', ppm: true, approvalsOn: c.focus === 'spend' || c.model !== 'inhouse',
    approver: c.model === 'manager' ? 'owner' : c.model === 'provider' ? 'customer' : 'manager',
    contractTypes: c.model === 'provider' ? ['amc', 'adhoc'] : ['amc'],
    channels: c.focus === 'visibility' ? ['whatsapp', 'app'] : ['app', 'email'],
    roles: ['manager', 'dispatcher', 'technician', 'admin', ...(c.model === 'provider' ? ['customer'] : []), ...(c.model === 'manager' ? ['owner', 'resident'] : [])],
  };
  return { industry, template, domains, people, work, assets, communication, oversight, capabilities: [...caps], patch };
}
