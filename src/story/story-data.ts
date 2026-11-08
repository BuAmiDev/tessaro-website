/**
 * One illustrative fault, told once, with the same identifiers in every scene.
 * Everything visible in the story derives from progress p ∈ [0, 1] through
 * stateAt(p), so scrolling backward never leaves an inconsistent task state.
 */
export const STORY = {
  building: 'Harbour Point',
  location: 'Level 4 · Room 4.07',
  asset: 'FCU-L4-07',
  assetName: 'Fan coil unit, ceiling void',
  wo: 'WO-2611-0418',
  contract: 'Maintenance contract · 4 h response',
  technician: 'Rami S.',
  dispatcher: 'Lina K.',
};

export type ActorKind = 'auto' | 'suggest' | 'person' | 'tech';
export const ACTOR: Record<ActorKind, string> = {
  auto: 'Automatic',
  suggest: 'Suggested by Tessaro, confirmed by a person',
  person: 'Decided by a person',
  tech: 'Performed by the technician',
};

export interface Chapter {
  id: string; at: number; end: number;
  nav: string;          // short chapter name
  label: string;        // crisp state label shown on screen
  text: string;         // one-sentence explanation
  actor: ActorKind;
  source?: string;      // where the information came from
  time: string;         // compressed, illustrative clock
  still: number;        // progress used for this chapter's composed still
}

export const CHAPTERS: Chapter[] = [
  { id: 'building', still: .03, at: 0, end: .12, nav: 'Building', label: 'Operating normally', time: '13:58',
    text: 'Harbour Point runs on equipment you rarely see: plant on the roof, fan coil units above every ceiling, sensors reporting into the building management system.', actor: 'auto', source: 'Asset register · 1,240 assets' },
  { id: 'room', still: .215, at: .12, end: .26, nav: 'Room', label: 'Narrowing down', time: '14:02',
    text: 'From building to floor to room. Room 4.07 is 3.8 °C warmer than its setpoint, and the unit serving it is FCU-L4-07.', actor: 'auto', source: 'Room sensor · Level 4' },
  { id: 'inspect', still: .38, at: .26, end: .40, nav: 'Inspect', label: 'Condition changed', time: '14:02',
    text: 'The valve is commanded fully open but has barely moved. Supply air is far above design. A rule flags the actuator as the likely cause.', actor: 'auto', source: 'BMS alarm feed · supply-air sensor' },
  { id: 'context', still: .47, at: .40, end: .53, nav: 'Context', label: 'Context checked', time: '14:03',
    text: 'Same asset, more context: covered by the maintenance contract, 4-hour response, actuator out of warranty, a meeting booked in the room at 16:00. A work record forms.', actor: 'auto', source: 'Contract, warranty and room booking' },
  { id: 'office', still: .6, at: .53, end: .67, nav: 'Office', label: 'Work assigned', time: '14:05',
    text: 'The operations office sees the same event. Tessaro suggests Rami, who has the skill and the part, 18 minutes away. Lina confirms, and the tenant’s facilities manager gets an update.', actor: 'suggest', source: 'Skills, shifts and van stock' },
  { id: 'technician', still: .8, at: .67, end: .85, nav: 'Technician', label: 'Repair in progress', time: '15:12',
    text: 'Rami arrives at the service entrance, scans the unit’s tag, and replaces the actuator. Photos and readings attach to the same work order.', actor: 'tech', source: 'Technician app · asset tag' },
  { id: 'verify', still: .89, at: .85, end: .93, nav: 'Verify', label: 'Repair verified', time: '15:41',
    text: 'Readings are compared with the alarm: valve follows command, supply air back to 14 °C, room recovering. The facilities manager confirms.', actor: 'auto', source: 'Before and after readings' },
  { id: 'portfolio', still: 1, at: .93, end: 1, nav: 'Portfolio', label: 'Record complete', time: '15:44',
    text: 'One closed loop, recorded with evidence. The same record serves facilities, maintenance, field service and asset decisions across every building you run.', actor: 'auto', source: 'Work order · asset history' },
];

export const chapterAt = (p: number) => CHAPTERS.findIndex((c) => p >= c.at && p < c.end) === -1 ? CHAPTERS.length - 1 : CHAPTERS.findIndex((c) => p >= c.at && p < c.end);

/** The work record, built up step by step. A row is reached at `at`. */
export const RECORD = [
  { id: 'detect', at: .30, label: 'Condition changed', value: 'Valve 12% of 100% command · supply 21.6 °C', actor: 'auto' as ActorKind },
  { id: 'context', at: .44, label: 'Context checked', value: 'Covered · 4 h response · out of warranty', actor: 'auto' as ActorKind },
  { id: 'assign', at: .58, label: 'Work assigned', value: 'Rami S. · confirmed by Lina K.', actor: 'suggest' as ActorKind },
  { id: 'update', at: .62, label: 'Update sent', value: 'Facilities manager, Harbour Point', actor: 'suggest' as ActorKind },
  { id: 'repair', at: .855, label: 'Actuator replaced', value: '2 photos · part from van stock', actor: 'tech' as ActorKind },
  { id: 'verify', at: .88, label: 'Repair verified', value: 'Valve 98% · supply 14.1 °C', actor: 'auto' as ActorKind },
  { id: 'signoff', at: .91, label: 'Signed off', value: 'Facilities manager, after the evidence', actor: 'person' as ActorKind },
  { id: 'close', at: .955, label: 'Record complete', value: 'Summary filed to asset history', actor: 'auto' as ActorKind },
];

export interface Readings { supply: string; valve: string; room: string; tone: 'normal' | 'alert' | 'ok' }
export function readingsAt(p: number): Readings {
  if (p < .28) return { supply: '14.0 °C', valve: '100% · 99%', room: p < .14 ? '23.1 °C' : '26.9 °C', tone: p < .14 ? 'normal' : 'alert' };
  if (p < .855) return { supply: '21.6 °C', valve: '100% · 12%', room: '26.9 °C', tone: 'alert' };
  return { supply: '14.1 °C', valve: '100% · 98%', room: p < .92 ? '24.2 °C ↓' : '23.4 °C', tone: 'ok' };
}
