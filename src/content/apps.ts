/**
 * The product experiences people outside the office use, shown with real
 * prototype screens (exported from the design source, sample data only).
 * Screen ids are the prototype's own labels; `key` is its URL hash.
 */
export type RoleId = 'requester' | 'technician' | 'portal';

export interface AppScreen { img: string; id: string; key: string; step: string; caption: string; note?: string }
export interface AppRole {
  id: RoleId; name: string; who: string; form: 'phone' | 'browser'; summary: string;
  screens: AppScreen[]; explore: { label: string; key: string };
}

export const ROLES: Record<RoleId, AppRole> = {
  requester: {
    id: 'requester', name: 'Requester app', who: 'Residents and building occupants', form: 'phone',
    summary: 'Report a problem, follow it to the visit, and confirm it is fixed.',
    screens: [
      { img: 'res-report', id: 'TR-010', key: 'R-02-2', step: 'Report', caption: 'Say where and what in a few taps. The questions adapt, so the request arrives complete.' },
      { img: 'res-progress', id: 'TR-018', key: 'R-03-4', step: 'Follow', caption: 'Every step has a time: received, technician booked, on the way, work done.' },
      { img: 'res-confirm', id: 'TR-024', key: 'R-04-4', step: 'Confirm', caption: 'See what was done and whether it costs anything, then confirm it is fixed, or say it isn’t.' },
    ],
    explore: { label: 'Explore the requester app', key: 'R-01-1' },
  },
  technician: {
    id: 'technician', name: 'Technician app', who: 'Field technicians', form: 'phone',
    summary: 'Review the job, do the work with the right checks, and close it with proof.',
    screens: [
      { img: 'tech-job', id: 'M-004', key: 'M-02-3', step: 'Review the job', caption: 'Before arriving: the equipment and its history, the response clock, who pays, and how to get in.' },
      { img: 'tech-checklist', id: 'M-012', key: 'M-03-3', step: 'Run the checklist', caption: 'The checklist pinned to this job. Photos and readings are required where they matter.' },
      { img: 'tech-complete', id: 'M-020', key: 'M-05-2', step: 'Complete', caption: 'Before closing, the app checks what is missing. Customer sign-off waits until it is done.' },
    ],
    explore: { label: 'Explore the technician app', key: 'M-01-3' },
  },
  portal: {
    id: 'portal', name: 'Customer portal', who: 'Business customers, in the browser', form: 'browser',
    summary: 'Open work, approvals, sites and service levels for the customer who pays.',
    screens: [
      { img: 'portal-home', id: 'PT-013', key: 'PT-013', step: 'Open work', caption: 'Open work across sites, quotes waiting for a decision, planned visits and response performance.' },
      { img: 'portal-approvals', id: 'PT-016', key: 'PT-016', step: 'Decide', caption: 'A quotation with the reason it is chargeable and the evidence beside it, approved or rejected in one place.' },
    ],
    explore: { label: 'Explore the customer portal', key: 'PT-013' },
  },
};

/** The fuller technician sequence for the field-service pages. */
export const TECHNICIAN_DEEP: AppRole = {
  ...ROLES.technician,
  screens: [
    ROLES.technician.screens[0],
    ROLES.technician.screens[1],
    { img: 'tech-photo', id: 'M-013', key: 'M-03-4', step: 'Capture evidence', caption: 'Photos are taken in the app only, stamped with time and job, and attached to the work order.' },
    ROLES.technician.screens[2],
    { img: 'tech-sync', id: 'M-022', key: 'M-05-4', step: 'Work offline', caption: 'Without signal, changes queue on the phone and sync later; conflicts are shown for a decision.', note: 'Offline sync is designed in the prototype; it is not yet in production.' },
  ],
};

/** How one piece of work moves between the two apps, for the connecting timeline. */
export const SHARED_TIMELINE: { t: string; who: RoleId | 'office'; links: Partial<Record<RoleId, number>> }[] = [
  { t: 'Problem reported', who: 'requester', links: { requester: 0 } },
  { t: 'Assigned by the office', who: 'office', links: { technician: 0 } },
  { t: 'Booked and on the way', who: 'requester', links: { requester: 1, technician: 0 } },
  { t: 'Checks, photos, readings', who: 'technician', links: { technician: 1 } },
  { t: 'Completed with evidence', who: 'technician', links: { technician: 2 } },
  { t: 'Confirmed by the requester', who: 'requester', links: { requester: 2 } },
];
