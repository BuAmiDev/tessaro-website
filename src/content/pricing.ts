/**
 * Plans, prices and trial terms. DRAFT: taken from the September 2026 pricing
 * decision (annual packages, AED, excluding VAT). Confirm every value before
 * launch; the site labels prices as draft while `confirmed` is false.
 */
export const pricing = {
  confirmed: false,
  currency: 'AED',
  billing: 'annual',
  vatNote: 'Prices exclude 5% VAT.',
  trial: {
    days: 30,                    // ASSUMPTION — business to confirm
    cardRequired: true,          // ASSUMPTION — card is verified, not charged
    amountNow: 0,
    afterTrial: 'At the end of the trial your annual plan starts and the first annual invoice is charged, unless you cancel before then.',
    cancellation: 'Cancel any time during the trial from Billing. Nothing is charged.',
    includedUsage: 'Up to 10 technicians and 2,000 assets during the trial.',
  },
  plans: [
    { id: 'starter', name: 'Starter', techs: 10, price: 36000, for: 'Single-trade teams starting with structured work orders and planned maintenance.' },
    { id: 'team', name: 'Team', techs: 15, price: 45000, for: 'Growing service teams adding contracts, approvals and customer updates.' },
    { id: 'business', name: 'Business', techs: 25, price: 63000, for: 'Multi-site providers running several contracts, regions and subcontractors.', featured: true },
    { id: 'scale', name: 'Scale', techs: 40, price: 90000, for: 'Larger operations needing more technicians, sites and integration work.' },
  ],
  extraTech: 3000,               // per technician per year beyond the package
  included: ['5 admin and supervisor users', 'Unlimited requesters, residents and customers', 'Up to 3 countries', 'Fair use up to 5,000 assets', 'WhatsApp intake and updates', 'Technician app with offline mode'],
  services: [
    { name: 'Guided setup', price: 18000, note: 'Template, data import, roles and first workflows, with a named specialist.' },
    { name: 'Workflow customisation', price: 30000, note: 'Custom forms, rules and integrations, scoped per project.' },
  ],
};

export function formatMoney(n: number, currency = pricing.currency, locale = 'en-AE') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}
