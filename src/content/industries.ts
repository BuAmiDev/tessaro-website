import type { StatusKey } from '../config/brand';

export interface Industry {
  id: string;
  name: string;
  short: string;
  status: StatusKey;           // 'designed' = grounded in prototype workflows; 'proposed' = not yet validated
  who: string;
  pains: string[];
  scenarios: string[];         // scenario ids, first is the default
  capabilities: string[];      // capability ids to feature
  operatingModel: string;
  defaults: { sites: number; team: number; asset: string; channel: Channel };
}
export type Channel = 'whatsapp' | 'app' | 'email' | 'sms';

export const INDUSTRIES: Industry[] = [
  {
    id: 'hvac-refrigeration', name: 'HVAC and refrigeration service', short: 'HVAC & refrigeration', status: 'designed',
    who: 'Companies that install, warrant and maintain chillers, freezers, cold rooms and AC for supermarkets, cold stores and commercial buildings.',
    pains: ['Emergency calls compete with planned visits', 'Contract coverage is checked by hand', 'Quotes wait in inboxes while response clocks run', 'Refrigerant and warranty records are scattered'],
    scenarios: ['freezer-p1', 'helpdesk-intake', 'tech-finding', 'access-blocked'],
    capabilities: ['dispatch-board', 'suggested-assignment', 'contracts', 'sla', 'quotations', 'technician-app', 'asset-register', 'ppm'],
    operatingModel: 'Equipment service provider',
    defaults: { sites: 38, team: 18, asset: 'Low-temperature freezer', channel: 'whatsapp' },
  },
  {
    id: 'property-management', name: 'Property management and residential maintenance', short: 'Property management', status: 'designed',
    who: 'Property managers and owners running residential towers, villa communities and mixed-use buildings with several maintenance providers.',
    pains: ['Residents chase updates by phone', 'Owners approve spend over email', 'Several providers report their own KPIs', 'Access to units is arranged ad hoc'],
    scenarios: ['resident-ac', 'owner-expense', 'access-blocked'],
    capabilities: ['resident-app', 'whatsapp-intake', 'owner-portal', 'approvals', 'locations', 'kpi', 'evidence', 'sla'],
    operatingModel: 'Property manager working with several providers',
    defaults: { sites: 12, team: 9, asset: 'Split AC unit', channel: 'whatsapp' },
  },
  {
    id: 'facilities-maintenance', name: 'Facilities maintenance', short: 'Facilities maintenance', status: 'designed',
    who: 'FM companies and in-house engineering teams maintaining offices, hospitals, retail estates and campuses.',
    pains: ['Helpdesk calls arrive incomplete', 'Planned maintenance slips without anyone noticing', 'Repeat faults hide behind different descriptions', 'Compliance evidence is hard to assemble'],
    scenarios: ['helpdesk-intake', 'tech-finding', 'access-blocked'],
    capabilities: ['guided-intake', 'suggested-triage', 'fault-groups', 'ppm', 'compliance', 'dashboards', 'roles', 'audit'],
    operatingModel: 'FM company or in-house engineering',
    defaults: { sites: 24, team: 30, asset: 'Air handling unit', channel: 'email' },
  },
  {
    id: 'retail-facilities', name: 'Retail facilities', short: 'Retail facilities', status: 'proposed',
    who: 'Retail chains coordinating refrigeration, HVAC and building repairs across many stores and trading hours.',
    pains: ['Repairs must avoid trading hours and stock-takes', 'Stores report the same fault differently', 'Regional managers lack one view'],
    scenarios: ['access-blocked', 'freezer-p1'],
    capabilities: ['visit-approvals', 'fault-groups', 'dashboards', 'contracts'],
    operatingModel: 'Multi-site retailer with external providers',
    defaults: { sites: 60, team: 12, asset: 'Multideck display case', channel: 'app' },
  },
  {
    id: 'cold-chain', name: 'Cold-chain operations', short: 'Cold chain', status: 'proposed',
    who: 'Cold stores and distribution centres where a temperature excursion means lost stock.',
    pains: ['A failed unit becomes a stock-loss event within hours', 'Refrigerant handling must be logged', 'Downtime must be evidenced for insurers'],
    scenarios: ['freezer-p1'],
    capabilities: ['sla', 'compliance', 'asset-register', 'evidence'],
    operatingModel: 'Cold-store operator with a service provider',
    defaults: { sites: 6, team: 8, asset: 'Cold room evaporator', channel: 'sms' },
  },
];

export const industryById = Object.fromEntries(INDUSTRIES.map((i) => [i.id, i]));
