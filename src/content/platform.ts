import type { Group } from './capabilities';
export interface PlatformPage { slug: string; title: string; lead: string; groups: Group[]; scenario: string; }
export const PLATFORM: PlatformPage[] = [
  { slug: 'intake', title: 'Service intake', groups: ['intake'], scenario: 'helpdesk-intake', lead: 'Requests arrive by phone, QR label, WhatsApp, app or portal. Each one is guided to completeness, so the right trade and priority can be set before anyone drives anywhere.' },
  { slug: 'coordination', title: 'Dispatch and scheduling', groups: ['coordination'], scenario: 'freezer-p1', lead: 'One board of technicians, jobs and response deadlines. Suggestions state their reasons; dispatchers decide.' },
  { slug: 'field', title: 'Technician app and evidence', groups: ['field'], scenario: 'tech-finding', lead: 'Everything a technician needs on site, online or offline, and proof of what was done that the customer can trust.' },
  { slug: 'contracts', title: 'Contracts and service levels', groups: ['contracts'], scenario: 'freezer-p1', lead: 'Coverage, response clocks and KPIs come from the contract, not from memory. Clocks pause only where the contract allows.' },
  { slug: 'commercial', title: 'Quotations and approvals', groups: ['commercial'], scenario: 'owner-expense', lead: 'Quotes from price lists, routed to the person who pays by amount and site. Work below the limit keeps moving.' },
  { slug: 'stakeholders', title: 'Residents, customers and owners', groups: ['stakeholders'], scenario: 'resident-ac', lead: 'Each person outside your team gets the view they need: an app for residents, portals for customers and owners, and WhatsApp for everyone.' },
  { slug: 'reporting', title: 'Reporting and insight', groups: ['reporting'], scenario: 'freezer-p1', lead: 'Dashboards by role, KPIs measured from records providers cannot edit, and reports that send themselves.' },
  { slug: 'configuration', title: 'Configuration', groups: ['configuration'], scenario: 'owner-expense', lead: 'Forms, rules, approvals, notifications and branding are configured by your administrators and published with review.' },
  { slug: 'trust', title: 'Control and traceability', groups: ['trust'], scenario: 'freezer-p1', lead: 'Scoped permissions, a full audit log and support access only inside grants you approve.' },
];
