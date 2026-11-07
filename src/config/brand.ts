/**
 * Brand and business settings. Change values here; nothing else hard-codes them.
 * The brief's alternative spelling ("Tesaro") can be applied by changing `name`.
 */
export const brand = {
  name: 'Tessaro',
  legalEntity: 'Black or White Concepts',
  siteUrl: 'https://tessaro-website.vercel.app',
  productUrl: 'https://tessaro-prototype.vercel.app', // clickable product prototype
  appSignInUrl: '', // empty until the operational product has a public sign-in
  supportEmail: 'support@tessaropro.com',
  salesEmail: 'hello@tessaropro.com',
  phone: '+971 52 815 5771',
  region: 'UAE · Saudi Arabia · Qatar',
  defaultLocale: 'en-AE',
  defaultCurrency: 'AED',
  defaultTimeZone: 'Asia/Dubai',
} as const;

/**
 * Release status. Every capability claim on the site carries one of these.
 * Tessaro 2.0 has not shipped: the honest ceiling today is "designed".
 */
export const STATUS = {
  live: { label: 'Available', note: 'Running in production and verified.' },
  pilot: { label: 'Pilot release', note: 'Designed and scoped for the first pilot release.' },
  designed: { label: 'Designed', note: 'Fully designed and clickable in the product prototype; not yet released.' },
  proposed: { label: 'Proposed', note: 'A direction under product validation. Not a committed capability.' },
} as const;
export type StatusKey = keyof typeof STATUS;
