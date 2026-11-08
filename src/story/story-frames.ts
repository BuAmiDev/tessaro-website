/**
 * Rendered frames for the opening story.
 *
 * The architecture, room and equipment are pre-rendered stills of one
 * building (generated as a consistent set, then colour-graded to the site
 * palette). Everything that carries meaning stays live HTML on top of them:
 * floor picking, annotations, the work record and the app screens. See
 * docs/STORY.md for which parts are real-time and which are rendered media.
 *
 * Coordinates are fractions of the source image (u across, v down), so labels
 * stay attached to the same floor or component at any viewport size.
 */
export type FrameId = 'e1' | 'e2' | 'r1' | 'r2' | 'o1' | 't1' | 't2' | 'v1' | 'p1';

export interface Frame {
  id: FrameId;
  alt: string;
  /** object-position used when the viewport is narrower than the image */
  focus: [number, number];
  /** a dedicated portrait render, used on tall viewports */
  portrait?: string;
}

export const FRAMES: Record<FrameId, Frame> = {
  e1: { id: 'e1', focus: [.66, .5], portrait: 'e1p', alt: 'Harbour Point, a six-storey office building with bronze fins and limestone bands, in late-afternoon light.' },
  e2: { id: 'e2', focus: [.78, .7], alt: 'Closer view of Levels 4 and 5. Through the glass of Level 4, a meeting room with an oak table.' },
  r1: { id: 'r1', focus: [.45, .5], alt: 'Room 4.07, an eight-person meeting room with a suspended ceiling and a linear air diffuser by the window.' },
  r2: { id: 'r2', focus: [.62, .3], alt: 'The same room with two ceiling tiles lifted, showing the fan coil unit, insulated chilled-water pipes and the valve actuator.' },
  o1: { id: 'o1', focus: [.3, .5], alt: 'The operations office, where a dispatcher works at a desk by tall windows.' },
  t1: { id: 't1', focus: [.72, .5], alt: 'A technician walks from a service van to the building’s service entrance with a tool bag and a boxed part.' },
  t2: { id: 't2', focus: [.36, .4], alt: 'In Room 4.07, the technician stands on a step ladder working on the unit in the open ceiling.' },
  v1: { id: 'v1', focus: [.62, .35], alt: 'Over the technician’s shoulder: he photographs the newly fitted valve actuator with his phone.' },
  p1: { id: 'p1', focus: [.68, .5], alt: 'Aerial view of a district with Harbour Point among other buildings: homes, retail, a school, a clinic and a warehouse.' },
};

/** Which frame is on screen at progress p. Changes are dissolves, never zooms. */
export const SHOTS: { frame: FrameId; from: number }[] = [
  { frame: 'e1', from: 0 },
  { frame: 'e2', from: .125 },   // floor selected
  { frame: 'r1', from: .19 },    // inside Room 4.07
  { frame: 'r2', from: .27 },    // ceiling opened, inspect and context
  { frame: 'o1', from: .535 },   // operations office
  { frame: 't1', from: .67 },    // arrival at the service entrance
  { frame: 't2', from: .725 },   // repair in the same room
  { frame: 'v1', from: .82 },    // evidence on the new part
  { frame: 'p1', from: .92 },    // portfolio
];
export const DISSOLVE = .018;

export const frameAt = (p: number) => { let i = 0; SHOTS.forEach((s, k) => { if (p >= s.from) i = k; }); return i; };

/** Chapter → frame used for the overview and the static (reduced motion) mode. */
export const CHAPTER_FRAME: FrameId[] = ['e1', 'r1', 'r2', 'r2', 'o1', 't2', 'v1', 'p1'];

/** Floors on the exterior, as polygons in image pixels (landscape 2688×1520, portrait 1520×2688). */
export interface Floor { id: string; name: string; use: string; note: string; story?: boolean }
export const FLOORS: Floor[] = [
  { id: 'L5', name: 'Level 5', use: 'Offices', note: '186 assets · no open work' },
  { id: 'L4', name: 'Level 4', use: 'Offices and meeting rooms', note: 'Where this story happens', story: true },
  { id: 'L3', name: 'Level 3', use: 'Tenant offices', note: '204 assets · 1 planned visit' },
  { id: 'L2', name: 'Level 2', use: 'Tenant offices', note: '198 assets · no open work' },
  { id: 'L1', name: 'Level 1', use: 'Lobby gallery and offices', note: '142 assets · no open work' },
  { id: 'G', name: 'Ground', use: 'Lobby and service entrance', note: '96 assets · no open work' },
];
const band = (x0: number, x1: number, rows: [number, number][]) =>
  rows.slice(0, -1).map(([a, b], i) => { const [c, d] = rows[i + 1]; return `${x0},${a} ${x1},${b} ${x1},${d} ${x0},${c}`; });
export const FLOOR_POLYS = {
  landscape: { w: 2688, h: 1520, polys: band(884, 2552, [[370, 150], [524, 356], [680, 556], [836, 756], [994, 960], [1194, 1190], [1380, 1380]]) },
  portrait: { w: 1520, h: 2688, polys: band(218, 1343, [[1435, 1292], [1547, 1427], [1660, 1577], [1770, 1715], [1875, 1845], [2017, 2010], [2167, 2190]]) },
};

/** Annotation anchors per frame. */
export const ANCHORS: Partial<Record<FrameId, Record<string, [number, number]>>> = {
  e2: { room: [.8, .79] },
  r1: { room: [.47, .5], diffuser: [.3, .17] },
  r2: { valve: [.708, .21], supply: [.25, .27], tag: [.54, .31] },
  o1: { desk: [.27, .52] },
  t1: { van: [.4, .52] },
  t2: { tech: [.37, .17] },
  v1: { valve: [.735, .25], phone: [.64, .3] },
  p1: { site: [.71, .4] },
};

/** Product screens revealed in the story: real prototype designs with sample data for this event. */
export interface AppStep { from: number; to: number; img: string; app: 'Requester app' | 'Technician app'; who: string; caption: string; screen: string }
export const APP_STEPS: AppStep[] = [
  { from: .595, to: .67, img: 'story-res-booked', app: 'Requester app', who: 'Facilities manager', screen: 'TR-019', caption: 'Sees who is coming, when, and what they are bringing, under the same reference.' },
  { from: .685, to: .73, img: 'story-tech-job', app: 'Technician app', who: 'Rami S.', screen: 'M-004', caption: 'The job arrives with the unit, the response time, who pays and how to get in.' },
  { from: .73, to: .77, img: 'story-tech-scan', app: 'Technician app', who: 'Rami S.', screen: 'M-007', caption: 'Scanning the tag confirms this is the unit on the job.' },
  { from: .77, to: .82, img: 'story-tech-photo', app: 'Technician app', who: 'Rami S.', screen: 'M-013', caption: 'Photos are taken in the app, stamped and attached to the work order.' },
  { from: .82, to: .865, img: 'story-tech-complete', app: 'Technician app', who: 'Rami S.', screen: 'M-020', caption: 'Every item done, outcome “Fully fixed”. Only now can sign-off be requested.' },
  { from: .865, to: .915, img: 'story-res-confirm', app: 'Requester app', who: 'Facilities manager', screen: 'TR-024', caption: 'The requester sees what was done, after the evidence exists, and confirms.' },
];
