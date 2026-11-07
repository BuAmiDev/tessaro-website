/** Navigation, FAQs and help-center content. Edit here; pages read from this file. */

export const NAV = [
  {
    id: 'platform', label: 'Platform', href: '/platform',
    groups: [
      { title: 'Run the work', links: [
        { label: 'Service intake', href: '/platform/intake', desc: 'Calls, QR scans and chats become complete requests' },
        { label: 'Dispatch and scheduling', href: '/platform/coordination', desc: 'The right technician, inside the response window' },
        { label: 'Technician app', href: '/platform/field', desc: 'Jobs, checklists and evidence, online or offline' },
      ] },
      { title: 'Keep commitments', links: [
        { label: 'Contracts and service levels', href: '/platform/contracts', desc: 'Coverage, clocks and KPIs from the contract' },
        { label: 'Quotations and approvals', href: '/platform/commercial', desc: 'Spend goes to the person who pays' },
        { label: 'Assets and maintenance', href: '/platform/assets', desc: 'Every unit, its history and its next visit' },
      ] },
      { title: 'Shape and control', links: [
        { label: 'Residents, customers, owners', href: '/platform/stakeholders', desc: 'Apps, portals and WhatsApp updates' },
        { label: 'Configuration', href: '/platform/configuration', desc: 'Forms, rules and approvals without code' },
        { label: 'Control and traceability', href: '/platform/trust', desc: 'Permissions, audit and approved support access' },
      ] },
    ],
    featured: { title: 'See one job from start to finish', text: 'Follow a freezer failure from the first report to sign-off.', href: '/simulator?scenario=freezer-p1' },
  },
  {
    id: 'industries', label: 'Industries', href: '/industries',
    groups: [
      { title: 'Designed with operators', links: [
        { label: 'HVAC and refrigeration service', href: '/industries/hvac-refrigeration', desc: 'Contracts, emergencies and planned visits' },
        { label: 'Property management', href: '/industries/property-management', desc: 'Residents, owners and several providers' },
        { label: 'Facilities maintenance', href: '/industries/facilities-maintenance', desc: 'Helpdesk, PPM and compliance' },
      ] },
      { title: 'Proposed', links: [
        { label: 'Retail facilities', href: '/industries/retail-facilities', desc: 'Repairs around trading hours' },
        { label: 'Cold-chain operations', href: '/industries/cold-chain', desc: 'Temperature failures before stock is lost' },
      ] },
    ],
    featured: { title: 'Resident reports an AC fault', text: 'From a WhatsApp message to a signed-off repair.', href: '/simulator?scenario=resident-ac&industry=property-management' },
  },
  { id: 'simulator', label: 'Interactive demo', href: '/simulator' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
  {
    id: 'resources', label: 'Resources', href: '/features',
    groups: [
      { title: 'Explore', links: [
        { label: 'Feature explorer', href: '/features', desc: 'Every capability, who uses it and its status' },
        { label: 'Scenario simulator', href: '/simulator', desc: 'Change the inputs, see the outcome' },
        { label: 'Configurator', href: '/configurator', desc: 'Draft your setup step by step' },
      ] },
      { title: 'Plan', links: [
        { label: 'My setup', href: '/my-setup', desc: 'Everything you have saved' },
        { label: 'Help center', href: '/help', desc: 'Setup guides and answers' },
        { label: 'Product prototype', href: 'https://tessaro-prototype.vercel.app', desc: 'Click through 256 designed screens', external: true },
      ] },
    ],
  },
  { id: 'support', label: 'Support', href: '/support' },
] as const;

export const FAQS = [
  { q: 'Is Tessaro available today?', a: 'Tessaro is designed end to end and the first pilot release is being prepared. Every capability on this site shows its status: designed, pilot release or proposed. Book a demo to see the clickable product and the pilot timeline.' },
  { q: 'Does the AI make decisions on its own?', a: 'In the designed product, Tessaro suggests triage and assignments and drafts messages and quotations, with the reason shown. A person confirms. Rules you configure decide when approval is required. Broader automation is a proposed direction and is labelled that way.' },
  { q: 'Can we keep our existing providers and systems?', a: 'Yes. Property managers can run several providers in one place, and providers work in their own portal. Connections to ERP and CRM systems such as SAP and Salesforce are proposed for later releases; until then, data moves through import and scheduled exports.' },
  { q: 'Does it work in Arabic?', a: 'The resident app, portals and messages are designed in English and Arabic, including right-to-left layouts. Office screens are designed in English first.' },
  { q: 'What happens to our data if we stop?', a: 'You can export your records at any time. Customer data stays in the UAE data region planned for the platform, and support staff can only see your records inside a time-limited grant you approve.' },
  { q: 'How long does setup take?', a: 'A guided setup for one operating model typically covers template, data import, roles and first workflows. The configurator on this site produces a draft that a specialist reviews with you; timing depends on your data readiness.' },
  { q: 'Do we need a card for the trial?', a: 'In the planned trial a card is verified at the start but not charged. Trial terms are still being confirmed and are shown in full before you enter any details.' },
];

export const HELP = [
  { id: 'getting-started', cat: 'Getting started', title: 'Your first week with Tessaro', body: 'Start with one site and one team. Import your assets, invite your dispatcher and two technicians, and run your next three jobs through Tessaro end to end. Use the activation checklist in onboarding to track progress.', tags: ['trial', 'activation', 'first steps'] },
  { id: 'choose-template', cat: 'Getting started', title: 'Choosing an industry template', body: 'Templates set default priorities, response targets, checklists and roles. Equipment service suits companies that maintain their own customers’ equipment. Property management suits managers working with residents, owners and several providers. You can change everything later.', tags: ['template', 'industry', 'setup'] },
  { id: 'import-assets', cat: 'Data import', title: 'Preparing your asset spreadsheet', body: 'One row per asset. Required columns: asset tag, category, site, location within the site. Recommended: make, model, serial number, install date, warranty end, refrigerant type and charge. The import checks each row before anything is written and lists rows to fix.', tags: ['import', 'excel', 'assets', 'csv'] },
  { id: 'import-sites', cat: 'Data import', title: 'Sites, buildings and units', body: 'Describe your hierarchy first: portfolio, site or building, floor, unit or room. Each asset must point to a location. Residents and customers are linked to units or sites, which controls what they can see.', tags: ['import', 'locations', 'hierarchy'] },
  { id: 'roles', cat: 'Roles and permissions', title: 'How roles work', body: 'A role is a set of permissions, scoped to organizations and regions. Start from templates (Administrator, Service manager, Dispatcher, Technician, Storekeeper) and derive custom roles. Changes are compared against the template and published with a second approver.', tags: ['roles', 'permissions', 'access'] },
  { id: 'approvals', cat: 'Configuration', title: 'Setting approval limits', body: 'Approval matrices route spend by amount, site and who pays. Example: up to AED 2,000 the property manager approves; above it, the owner. Work below the limit continues without waiting.', tags: ['approvals', 'threshold', 'rules'] },
  { id: 'sla', cat: 'Configuration', title: 'Response and resolution targets', body: 'Targets come from the contract and priority. Business calendars decide whether nights and weekends count. A clock pauses only for reasons the contract allows, such as waiting for the customer to approve a quote.', tags: ['sla', 'clock', 'contract'] },
  { id: 'whatsapp', cat: 'Technician and stakeholder experiences', title: 'WhatsApp for residents and customers', body: 'Residents opt in on first contact and choose a language. Guided questions follow the same mandatory steps as the web form. Messages use approved templates, and replying STOP opts out at any time.', tags: ['whatsapp', 'residents', 'messages'] },
  { id: 'offline', cat: 'Technician and stakeholder experiences', title: 'Working offline in the technician app', body: 'Jobs, manuals and checklists for the next days are stored on the phone. Photos, readings and sign-offs queue while offline and sync automatically. The sync center shows what is waiting.', tags: ['offline', 'technician', 'sync'] },
  { id: 'trial-billing', cat: 'Billing and trial', title: 'Trial, renewal and cancellation', body: 'The trial terms shown at signup apply: what is charged now, whether a card is needed and what happens at the end. You can cancel during the trial from Billing. Plans are annual; extra technicians can be added at any time.', tags: ['trial', 'billing', 'cancel', 'payment'] },
  { id: 'payment-failed', cat: 'Billing and trial', title: 'My payment did not go through', body: 'Your progress is saved. Return to the trial page and choose a different card or try again; you will not be charged twice. If a payment shows as taken but your workspace is not ready, contact support with the payment reference.', tags: ['payment', 'failed', 'declined', 'card'] },
  { id: 'cant-sign-in', cat: 'Troubleshooting', title: 'I can’t sign in', body: 'Codes expire after 10 minutes; request a new one. Check the address you used. If your organization uses company sign-in, use the “Continue with company sign-in” option and contact your administrator.', tags: ['sign in', 'code', 'login'] },
  { id: 'provisioning', cat: 'Troubleshooting', title: 'My workspace setup needs attention', body: 'If provisioning stops, your setup draft and payment are kept. Retry from onboarding; if it stops again, support can see the exact step that failed.', tags: ['provisioning', 'workspace', 'setup'] },
];
