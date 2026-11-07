/**
 * Harbour Point: a procedural architectural scene in metres.
 * The whole frame (camera, materials, people, screens) is a pure function of
 * progress p, so scroll position, chapter jumps and stills all agree.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { STORY, RECORD, readingsAt } from './story-data';

export type Quality = 'high' | 'low';
export interface Anchor { id: string; x: number; y: number; visible: boolean }
export interface StoryScene { render(p: number, assemble?: number): Anchor[]; resize(): void; dispose(): void; }

const FLOOR_H = 3.6, FLOORS = 6, HW = 15, HD = 9; // half width / depth
const L4 = 4 * FLOOR_H;                            // level 4 slab top (14.4 m)
const CEIL = L4 + 2.8;                             // suspended ceiling
const FCU = new THREE.Vector3(10.5, CEIL + .38, 3.6);

const C = {
  sky: 0xE9E6DE, ground: 0xCFCABD, paving: 0xDDD8CC, grass: 0xA9B394,
  slab: 0xF1EEE7, frame: 0x2A2F2C, glass: 0x5E7775, core: 0xD9D5CC,
  floorWood: 0xC8AE89, wall: 0xF3F1EC, ceiling: 0xF6F5F1, desk: 0xF4F3EF, chair: 0x2B302D,
  steel: 0xAEB4B3, copper: 0xB87A45, ink: 0x202522, person: 0xE9E6E0, personDark: 0x4A524D,
  green: 0x245B46, amber: 0xC77D1E, brass: 0xB8863B, van: 0xF2F2EE,
};

function mat(color: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, ...o }); }
function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, cast = true) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.position.set(x, y, z); g.castShadow = cast; g.receiveShadow = true; return g;
}

/** A person at 1:1 scale, neutral architectural-model style (about 1.75 m). */
function person(color = C.person, seated = false) {
  const g = new THREE.Group(); const m = mat(color, { roughness: .7 });
  const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 6, 12);
  const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
  if (seated) {
    add(cap(.075, .36), -.1, .48, .2, Math.PI / 2); add(cap(.075, .36), .1, .48, .2, Math.PI / 2);   // thighs
    add(cap(.065, .38), -.1, .24, .4); add(cap(.065, .38), .1, .24, .4);                               // shins
    add(new RoundedBoxGeometry(.38, .56, .22, 3, .09), 0, .82, 0); add(cap(.055, .42), -.24, .78, .1, .5); add(cap(.055, .42), .24, .78, .1, .5);
    add(new THREE.SphereGeometry(.105, 20, 16), 0, 1.24, 0);
  } else {
    add(cap(.075, .72), -.1, .45, 0); add(cap(.075, .72), .1, .45, 0);                                // legs
    add(new RoundedBoxGeometry(.38, .58, .22, 3, .09), 0, 1.2, 0);                                     // torso
    const la = add(cap(.055, .5), -.25, 1.15, 0), ra = add(cap(.055, .5), .25, 1.15, 0);              // arms
    g.userData.arms = [la, ra];
    add(new THREE.SphereGeometry(.105, 20, 16), 0, 1.64, 0);                                           // head
  }
  return g;
}

/** Canvas texture for screens (office wall display, technician tablet). */
function screen(w: number, h: number) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { cv, ctx: cv.getContext('2d')!, tex, key: '' };
}

export function createStoryScene(canvas: HTMLCanvasElement, quality: Quality): StoryScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .94;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  { // sky: warm horizon to a cooler zenith
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const g = cv.getContext('2d')!;
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#D9DFE0'); gr.addColorStop(.62, '#ECE7DD'); gr.addColorStop(1, '#F1E9DA');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
  }
  scene.fog = new THREE.Fog(0xECE6DA, 110, 420);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  const camera = new THREE.PerspectiveCamera(34, 1, .1, 900);

  // Light: late-afternoon sun from the south-west, cool sky fill
  scene.add(new THREE.HemisphereLight(0xEEF2F5, 0xB9B09E, .62));
  const sun = new THREE.DirectionalLight(0xFFE7C8, 3.3);
  sun.position.set(-48, 62, 40); sun.castShadow = true;
  const sm = quality === 'high' ? 2048 : 1024; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 10, far: 200 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  scene.add(sun);

  // ---------- Site ----------
  const site = new THREE.Group(); scene.add(site);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat(C.ground)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; site.add(ground);
  const plaza = box(46, .12, 34, mat(C.paving), 0, .06, 2, false); site.add(plaza);
  const lawn = box(18, .14, 9, mat(C.grass), -12, .07, 17, false); site.add(lawn);
  const road = box(900, .04, 9, mat(0xC7C3B9), 0, .02, 26, false); site.add(road);
  // trees: trunk + softened canopy
  const trunkM = mat(0x7C6A55), canopyM = mat(0x7D9068, { roughness: .95, flatShading: true });
  const canopyG = new THREE.IcosahedronGeometry(1, 2);
  [[-20, 17], [-14, 19], [-6, 18], [22, 15], [-24, 6], [-24, -4], [27, 12]].forEach(([x, z], i) => {
    const t = new THREE.Group(); const s = .9 + (i % 3) * .15;
    const tr = box(.22, 2.4 * s, .22, trunkM, 0, 1.2 * s, 0); t.add(tr);
    [[0, 3.6, 0, 1.8], [.9, 3.1, .4, 1.25], [-.8, 3.3, -.5, 1.35], [.2, 4.5, -.3, 1.2]].forEach(([cx, cy, cz, r], k) => { const cp = new THREE.Mesh(canopyG, canopyM); cp.scale.setScalar(r * s); cp.position.set(cx * s, cy * s, cz * s); cp.rotation.set(k, k * 2, 0); cp.castShadow = true; t.add(cp); });
    t.position.set(x, 0, z); site.add(t);
  });

  // ---------- Building ----------
  const bldg = new THREE.Group(); scene.add(bldg);
  const slabM = mat(C.slab, { roughness: .9 }), frameM = mat(C.frame, { roughness: .45, metalness: .5 });
  const glassM = new THREE.MeshStandardMaterial({ color: C.glass, roughness: .06, metalness: .2, transparent: true, opacity: .58, envMapIntensity: 1.6, depthWrite: false });
  const roomGlassM = glassM.clone();
  const floors: THREE.Group[] = [];
  for (let f = 0; f < FLOORS; f++) {
    const g = new THREE.Group(); const y = f * FLOOR_H;
    g.add(box(HW * 2 + .6, .38, HD * 2 + .6, slabM, 0, y + .19 + (f === 0 ? 0 : 0), 0));
    // core (lift and stairs) reads through the glass
    g.add(box(6, FLOOR_H - .38, 5, mat(C.core), -2, y + .38 + (FLOOR_H - .38) / 2, -4));
    floors.push(g); bldg.add(g);
  }
  const roof = box(HW * 2 + .6, .5, HD * 2 + .6, slabM, 0, FLOORS * FLOOR_H + .25, 0); bldg.add(roof);
  // parapet + rooftop plant enclosure with air handling units
  bldg.add(box(HW * 2 + .6, .9, .2, slabM, 0, FLOORS * FLOOR_H + .95, HD + .2));
  const plant = new THREE.Group(); plant.position.set(4, FLOORS * FLOOR_H + .5, -3);
  for (let i = 0; i < 2; i++) { const a = box(6.5, 2, 2.4, mat(0xC9CDCB, { metalness: .35, roughness: .5 }), i * 7.2 - 3.6, 1, 0); plant.add(a); }
  const louvre = box(16, 2.6, .12, mat(0x9AA19E, { metalness: .4, roughness: .5 }), 0, 1.3, 2.4); plant.add(louvre);
  bldg.add(plant);

  // Curtain wall: mullions as instanced boxes; glass panes as large planes
  const mullG = new THREE.BoxGeometry(.12, FLOOR_H, .16);
  const mullPos: THREE.Vector3[] = [];
  for (let f = 0; f < FLOORS; f++) {
    const y = f * FLOOR_H + FLOOR_H / 2 + .19;
    for (let x = -HW; x <= HW + .01; x += 3) { mullPos.push(new THREE.Vector3(x, y, HD)); mullPos.push(new THREE.Vector3(x, y, -HD)); }
    for (let z = -HD; z <= HD + .01; z += 3) { mullPos.push(new THREE.Vector3(HW, y, z)); mullPos.push(new THREE.Vector3(-HW, y, z)); }
  }
  const mull = new THREE.InstancedMesh(mullG, frameM, mullPos.length);
  const mtx = new THREE.Matrix4();
  mullPos.forEach((v, i) => { mtx.makeTranslation(v.x, v.y, v.z); if (Math.abs(Math.abs(v.x) - HW) < .01 && Math.abs(v.z) < HD) mtx.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); mull.setMatrixAt(i, mtx); });
  mull.castShadow = true; bldg.add(mull);
  // glass: one plane per facade per floor, except room 4.07's bay which is separate
  const glassG = new THREE.PlaneGeometry(1, 1);
  const addGlass = (m: THREE.Material, w: number, h: number, x: number, y: number, z: number, ry: number) => { const g = new THREE.Mesh(glassG, m); g.scale.set(w, h, 1); g.position.set(x, y, z); g.rotation.y = ry; g.renderOrder = 2; bldg.add(g); return g; };
  for (let f = 0; f < FLOORS; f++) {
    const y = f * FLOOR_H + .38 + (FLOOR_H - .38) / 2, h = FLOOR_H - .38;
    if (f === 4) { addGlass(glassM, 24, h, -3, y, HD, 0); addGlass(glassM, 3, h, 13.5, y, HD, 0); }
    else addGlass(glassM, HW * 2, h, 0, y, HD, 0);
    addGlass(glassM, HW * 2, h, 0, y, -HD, Math.PI);
    addGlass(glassM, HD * 2, h, HW, y, 0, Math.PI / 2); addGlass(glassM, HD * 2, h, -HW, y, 0, -Math.PI / 2);
  }
  const roomPane = addGlass(roomGlassM, 3, FLOOR_H - .38, 10.5, L4 + .38 + (FLOOR_H - .38) / 2, HD, 0);
  // warm interior glow on every floor so the building reads as occupied
  const glowM = new THREE.MeshBasicMaterial({ color: 0xFFE9C4, transparent: true, opacity: .8 });
  for (let f = 1; f < FLOORS; f++) { if (f === 4) continue; const g = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 - .4, HD * 2 - .4), glowM); g.rotation.x = Math.PI / 2; g.position.set(0, f * FLOOR_H + FLOOR_H - .02, 0); bldg.add(g); }
  // entrance canopy + doors on the ground floor
  bldg.add(box(9, .3, 3.2, slabM, -6, 3.4, HD + 1.6));
  // service door on the east side
  bldg.add(box(.2, 2.6, 2.2, mat(0x5B625E, { metalness: .3 }), HW + .05, 1.3, -3));

  // ---------- Room 4.07 (interior, level 4, east front bay) ----------
  const room = new THREE.Group(); scene.add(room);
  const RX0 = 6, RX1 = 15, RZ0 = 0.6, RZ1 = 8.9;
  room.add(box(RX1 - RX0, .02, RZ1 - RZ0, mat(C.floorWood, { roughness: .6 }), (RX0 + RX1) / 2, L4 + .39, (RZ0 + RZ1) / 2, false));
  room.add(box(.14, CEIL - L4, RZ1 - RZ0, mat(C.wall), RX0, (L4 + CEIL) / 2, (RZ0 + RZ1) / 2));        // west partition
  room.add(box(RX1 - RX0, CEIL - L4, .14, mat(C.wall), (RX0 + RX1) / 2, (L4 + CEIL) / 2, RZ0));         // back wall
  // suspended ceiling as a grid of tiles; the one under the FCU can open
  const tileM = mat(C.ceiling, { roughness: .95 }); const tileG = new THREE.BoxGeometry(1.18, .04, 1.18);
  const openTiles: THREE.Mesh[] = []; const openM = tileM.clone(); openM.transparent = true;
  for (let x = RX0 + .6; x < RX1; x += 1.2) for (let z = RZ0 + .6; z < RZ1; z += 1.2) {
    const cut = Math.abs(x - FCU.x) < 1.3 && Math.abs(z - FCU.z) < 1.3;
    const t = new THREE.Mesh(tileG, cut ? openM : tileM); t.position.set(x, CEIL, z); t.receiveShadow = true; room.add(t);
    if (cut) openTiles.push(t);
  }
  // section edge around the cutaway reads as a clean cut, not a hole
  const edgeM = mat(C.ink); const ex0 = 9.6, ex1 = 12.0, ez0 = 1.8, ez1 = 5.4;
  const edges = new THREE.Group(); [[ex0, (ez0 + ez1) / 2, .02, ez1 - ez0], [ex1, (ez0 + ez1) / 2, .02, ez1 - ez0], [(ex0 + ex1) / 2, ez0, ex1 - ex0, .02], [(ex0 + ex1) / 2, ez1, ex1 - ex0, .02]].forEach(([x, z, w, d]) => edges.add(box(w, .05, d, edgeM, x, CEIL, z, false))); room.add(edges);
  const voidLight = new THREE.PointLight(0xF4F7FF, 0, 5, 1.4); voidLight.position.set(FCU.x + .2, CEIL + .1, FCU.z + 1.4); room.add(voidLight);
  // ceiling light panels
  const lightM = new THREE.MeshBasicMaterial({ color: 0xFFF7EA });
  [[8.4, 2.4], [8.4, 6.0], [12.6, 6.0], [12.6, 2.4]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), lightM); l.rotation.x = Math.PI / 2; l.position.set(x, CEIL - .03, z); room.add(l); });
  const roomLight = new THREE.PointLight(0xFFEBD0, 0, 14, 1.6); roomLight.position.set(10.5, CEIL - .3, 4.6); room.add(roomLight);
  // meeting table + chairs + wall screen + thermostat
  room.add(box(3.6, .06, 1.4, mat(C.desk, { roughness: .4 }), 10.2, L4 + .39 + .74, 4.9));
  room.add(box(.12, .72, .12, mat(C.frame), 8.6, L4 + .39 + .36, 4.4)); room.add(box(.12, .72, .12, mat(C.frame), 11.8, L4 + .39 + .36, 5.4));
  const chairM = mat(0x7A817C, { roughness: .6 });
  [[8.9, 3.9], [10.2, 3.9], [11.5, 3.9], [8.9, 5.9], [10.2, 5.9], [11.5, 5.9]].forEach(([x, z]) => { room.add(box(.5, .08, .5, chairM, x, L4 + .39 + .46, z)); room.add(box(.46, .42, .04, chairM, x, L4 + .39 + .72, z + (z < 4.9 ? -.24 : .24))); room.add(box(.04, .44, .04, chairM, x, L4 + .39 + .22, z)); });
  { const tv = box(.05, 1.1, 1.9, mat(0x1A1D1C, { roughness: .3 }), RX0 + .1, L4 + 1.75, 4.9); room.add(tv); }
  const thermo = box(.12, .12, .03, mat(0xFFFFFF), RX0 + .1, L4 + 1.6, 7.6); thermo.rotation.y = Math.PI / 2; room.add(thermo);
  const plantPot = new THREE.Group(); plantPot.add(box(.4, .5, .4, mat(0xD8D2C6), 0, .25, 0)); const leaf = new THREE.Mesh(canopyG, mat(0x7E9A72)); leaf.scale.set(.45, .6, .45); leaf.position.y = .9; plantPot.add(leaf); plantPot.position.set(14.2, L4 + .39, 1.4); room.add(plantPot);

  // ---------- FCU-L4-07 in the ceiling void ----------
  const fcu = new THREE.Group(); fcu.position.copy(FCU); scene.add(fcu);
  const steelM = mat(C.steel, { metalness: .65, roughness: .38 }); const darkM = mat(0x3D4442, { roughness: .6 });
  // casing with the near side cut away so the components read (component view)
  fcu.add(box(1.5, .02, .7, steelM, 0, .17, 0));          // top
  fcu.add(box(1.5, .3, .02, steelM, 0, 0, -.34));         // back
  fcu.add(box(.02, .3, .7, steelM, -.74, 0, 0));          // end
  fcu.add(box(1.5, .02, .7, mat(C.steel, { metalness: .5, roughness: .5, transparent: true, opacity: .35 }), 0, -.16, 0, false)); // drain tray / base, translucent
  const blower = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .26, 24, 1, true), darkM); blower.rotation.z = Math.PI / 2; blower.position.set(-.35, 0, 0); fcu.add(blower);
  const blower2 = blower.clone(); blower2.position.x = -.05; fcu.add(blower2);
  fcu.add(box(.16, .14, .16, mat(0x2B2F2D), -.62, -.02, 0));    // motor
  const coil = box(.07, .28, .62, mat(C.copper, { metalness: .75, roughness: .32 }), .38, 0, 0); fcu.add(coil);
  const fins = new THREE.Group(); for (let i = 0; i < 12; i++) fins.add(box(.003, .27, .6, mat(0xD9D3CA, { metalness: .6, roughness: .3 }), .3 - i * .01, 0, 0, false)); fcu.add(fins);
  const duct = box(.55, .24, .5, steelM, 1.02, 0, 0); fcu.add(duct);
  const supplySensor = box(.04, .04, .1, mat(0xFFFFFF), 1.15, .14, .2); fcu.add(supplySensor);
  // chilled-water flow and return, valve body and the actuator that failed
  const pipeM = mat(0x5D6A70, { metalness: .5, roughness: .4 });
  const pipeG = new THREE.CylinderGeometry(.022, .022, .5, 12);
  [-.08, .08].forEach((z) => { const p = new THREE.Mesh(pipeG, pipeM); p.rotation.z = Math.PI / 2; p.position.set(.75, -.06, z + .02); fcu.add(p);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .5, 12), pipeM); up.position.set(1.0, .19, z + .02); fcu.add(up); });
  const valve = new THREE.Group(); valve.position.set(.68, .02, .1); fcu.add(valve);
  valve.add(box(.09, .08, .09, mat(0xB8863B, { metalness: .7, roughness: .3 }), 0, -.08, 0));
  const actOld = new THREE.Mesh(new RoundedBoxGeometry(.16, .13, .12, 2, .02), mat(0x5E6B70, { roughness: .5 })); actOld.position.y = .04; valve.add(actOld);
  const actNew = new THREE.Mesh(new RoundedBoxGeometry(.16, .13, .12, 2, .02), mat(0xF1F2EE, { roughness: .4 })); actNew.position.y = .04; valve.add(actNew);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 8), new THREE.MeshBasicMaterial({ color: C.amber })); led.position.set(0, .06, .062); valve.add(led);
  const haloM = new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: .0, depthTest: false });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.13, .005, 8, 48), haloM); halo.position.y = .04; halo.renderOrder = 5; valve.add(halo);
  const tag = box(.1, .06, .005, mat(0xFFFFFF), -.4, .05, -.328); fcu.add(tag);

  // ---------- Technician, ladder, van ----------
  const tech = person(0x2F4A3E); scene.add(tech);
  const tablet = box(.24, .16, .015, mat(0x111312, { roughness: .3 }), .18, 1.18, .2); tech.add(tablet);
  const ladder = new THREE.Group(); ladder.add(box(.06, 1.6, .06, mat(C.brass), -.25, .8, 0)); ladder.add(box(.06, 1.6, .06, mat(C.brass), .25, .8, 0));
  for (let i = 0; i < 4; i++) ladder.add(box(.5, .04, .18, mat(C.brass), 0, .3 + i * .38, 0));
  ladder.position.set(FCU.x - .2, L4 + .39, FCU.z + .62); scene.add(ladder);
  const van = new THREE.Group(); van.add(new THREE.Mesh(new RoundedBoxGeometry(5.2, 2.3, 2.1, 3, .25), mat(C.van, { roughness: .5 })));
  (van.children[0] as THREE.Mesh).position.y = 1.45; (van.children[0] as THREE.Mesh).castShadow = true;
  van.add(box(.04, .5, 1.6, mat(C.green), 0, 1.6, 1.06, false)); van.children[1].rotation.y = Math.PI / 2;
  [[-1.7, .95], [1.7, .95], [-1.7, -.95], [1.7, -.95]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .25, 20), mat(0x2A2E2C)); w.rotation.x = Math.PI / 2; w.position.set(x, .38, z); van.add(w); });
  van.position.set(22, 0, -7); van.rotation.y = .3; scene.add(van);
  const routeM = new THREE.LineDashedMaterial({ color: C.green, dashSize: .6, gapSize: .4, transparent: true, opacity: 0 });
  const routePts = [new THREE.Vector3(20.6, .2, -5.4), new THREE.Vector3(18, .2, -3.6), new THREE.Vector3(15.3, .2, -3)];
  const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(routePts), routeM); route.computeLineDistances(); scene.add(route);

  // ---------- Operations office (ground floor, west front) ----------
  const office = new THREE.Group(); scene.add(office);
  office.add(box(9.6, .02, 7.8, mat(0xCFC9BE, { roughness: .7 }), -10.2, .4, 4.7, false));
  office.add(box(.14, 3.2, 7.8, mat(C.wall), -5.4, 2, 4.7));
  office.add(box(9.6, 3.2, .14, mat(C.wall), -10.2, 2, .8));
  const wallScreen = screen(1024, 576);
  const wallScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.25), new THREE.MeshBasicMaterial({ map: wallScreen.tex, toneMapped: false }));
  wallScreenMesh.position.set(-10.9, 2.05, .9); office.add(wallScreenMesh);
  office.add(box(2.4, .05, .9, mat(C.desk, { roughness: .4 }), -10.6, 1.13, 4.2));
  office.add(box(.1, .72, .7, mat(C.frame), -11.7, .76, 4.2)); office.add(box(.1, .72, .7, mat(C.frame), -9.5, .76, 4.2));
  const deskScreen = screen(512, 320);
  const deskScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(.62, .39), new THREE.MeshBasicMaterial({ map: deskScreen.tex, toneMapped: false }));
  deskScreenMesh.position.set(-10.6, 1.45, 3.92); deskScreenMesh.rotation.y = 0; office.add(deskScreenMesh);
  const dispatcher = person(0xDCD6CC, true); dispatcher.position.set(-10.6, .4, 4.95); dispatcher.rotation.y = Math.PI; office.add(dispatcher);
  office.add(box(.55, .08, .55, chairM, -10.6, .86, 5.0));
  const colleague = person(0xC9C2B6); colleague.position.set(-13.9, .4, 3.4); colleague.rotation.y = 1.6; office.add(colleague);
  [[-13.6, 6.6], [-13.6, 4.2]].forEach(([x, z]) => { office.add(box(1.8, .05, .8, mat(C.desk, { roughness: .4 }), x, 1.13, z)); office.add(box(.55, .34, .03, mat(0x1A1D1C), x, 1.42, z - .2)); office.add(box(.08, .72, .6, mat(C.frame), x - .8, .76, z)); office.add(box(.08, .72, .6, mat(C.frame), x + .8, .76, z)); });
  { const pp = plantPot.clone(); pp.position.set(-6.2, .4, 1.4); office.add(pp); }
  const officeLight = new THREE.PointLight(0xFFEBD0, 0, 14, 1.6); officeLight.position.set(-10, 3.2, 4.6); office.add(officeLight);

  // ---------- Portfolio: neighbouring buildings with status beacons ----------
  const portfolio = new THREE.Group(); scene.add(portfolio);
  const ftx = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d')!; g.fillStyle = '#ECE8E0'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#7E908D'; g.fillRect(0, 14, 64, 40); g.fillStyle = '#2E3431'; for (let x = 0; x < 64; x += 16) g.fillRect(x, 14, 2, 40); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const pm = mat(0xFFFFFF, { roughness: .8, map: ftx });
  const beaconG = new THREE.SphereGeometry(1.1, 16, 12);
  const beacons: THREE.Mesh[] = [];
  [[-70, -40, 18, 30, 16], [60, -55, 24, 44, 20], [-95, 30, 20, 22, 14], [95, 20, 16, 34, 22], [-30, -110, 30, 18, 24], [40, -130, 18, 54, 18], [130, -60, 22, 26, 22], [-140, -70, 26, 38, 18]].forEach(([x, z, w, h, d], i) => {
    const bmat = pm.clone(); bmat.map = ftx.clone(); bmat.map.needsUpdate = true; bmat.map.repeat.set(w / 3, h / 3.6);
    const b = box(w, h, d, bmat, x, h / 2, z); portfolio.add(b);
    const bm = new THREE.Mesh(beaconG, new THREE.MeshBasicMaterial({ color: i === 3 ? C.amber : C.green, transparent: true, opacity: 0 }));
    bm.position.set(x, h + 4, z); portfolio.add(bm); beacons.push(bm);
  });

  // ---------- Camera shots ----------
  type Key = { p: number; pos: [number, number, number]; tgt: [number, number, number]; inside?: boolean; fov?: number };
  const shots: Key[][] = [
    [ // exterior → room → inspection → context (one continuous move)
      { p: 0, pos: [50, 13, 62], tgt: [-13, 11.5, -8] },
      { p: .1, pos: [34, 16.5, 44], tgt: [-1, 13, -2] },
      { p: .18, pos: [17, 16.4, 23], tgt: [10.5, 15.6, 9] },
      { p: .235, pos: [11, 15.9, 11.4], tgt: [10.5, 15.8, 6] },
      { p: .28, pos: [10.7, 15.85, 7.9], tgt: [10.6, 16.1, 3], inside: true },
      { p: .34, pos: [10.0, 15.9, 6.9], tgt: [10.8, 17.3, 3.4], inside: true },
      { p: .40, pos: [10.2, 16.45, 5.4], tgt: [11.45, 17.55, 3.5], inside: true, fov: 52 },
      { p: .465, pos: [12.2, 16.4, 5.6], tgt: [11.45, 17.55, 3.3], inside: true, fov: 54 },
      { p: .535, pos: [12.3, 16.35, 5.9], tgt: [11.4, 17.5, 3.2], inside: true, fov: 56 },
    ],
    [ // match cut: the operations office receives the same event
      { p: .535, pos: [-8.2, 1.75, 8.5], tgt: [-10.9, 1.8, 1.0], inside: true },
      { p: .6, pos: [-8.6, 1.7, 7.9], tgt: [-10.9, 1.85, 1.0], inside: true },
      { p: .67, pos: [-9.0, 1.72, 7.6], tgt: [-11.0, 1.9, 1.0], inside: true },
    ],
    [ // service yard: technician arrives
      { p: .67, pos: [29, 3.6, 6], tgt: [19.5, 1.3, -5] },
      { p: .755, pos: [24, 3.4, 4.5], tgt: [15.6, 1.5, -3.2] },
    ],
    [ // back in room 4.07: repair, then verification at the same asset
      { p: .755, pos: [7.2, 15.95, 8.3], tgt: [10.6, 16.4, 3.6], inside: true },
      { p: .82, pos: [7.6, 16.05, 7.9], tgt: [10.6, 16.7, 3.6], inside: true },
      { p: .86, pos: [10.2, 16.45, 5.4], tgt: [11.45, 17.55, 3.5], inside: true, fov: 52 },
      { p: .90, pos: [10.7, 15.85, 7.9], tgt: [10.6, 16.1, 3], inside: true },
      { p: .935, pos: [11.4, 16.1, 13], tgt: [10.4, 15.6, 2] },
      { p: .965, pos: [26, 24, 52], tgt: [6, 11, 0] },
      { p: 1, pos: [92, 70, 150], tgt: [0, 8, -20] },
    ],
  ];
  const CUTS = [.535, .67, .755];
  const curves = shots.map((ks) => ({
    ks, pos: new THREE.CatmullRomCurve3(ks.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal'),
    tgt: new THREE.CatmullRomCurve3(ks.map((k) => new THREE.Vector3(...k.tgt)), false, 'centripetal'),
  }));
  const ease = (t: number) => t * t * (3 - 2 * t);
  function cameraAt(p: number) {
    const shot = curves.find((c, i) => p < (curves[i + 1]?.ks[0].p ?? 1.0001)) ?? curves[curves.length - 1];
    const ks = shot.ks; let j = 0; while (j < ks.length - 2 && p > ks[j + 1].p) j++;
    const local = ks.length === 1 ? 0 : Math.min(1, Math.max(0, (p - ks[j].p) / Math.max(1e-6, ks[j + 1].p - ks[j].p)));
    const u = (j + ease(local)) / (ks.length - 1);
    const pos = shot.pos.getPoint(u), tgt = shot.tgt.getPoint(u);
    const inside = !!(ks[j].inside && ks[Math.min(j + 1, ks.length - 1)].inside);
    const k2 = ks[Math.min(j + 1, ks.length - 1)]; const f0 = ks[j].fov, f1 = k2.fov;
    const fov = (f0 || f1) ? THREE.MathUtils.lerp(f0 ?? 56, f1 ?? 56, ease(local)) : 0;
    return { pos, tgt, inside, fov };
  }

  // ---------- Screens ----------
  function drawWall(state: number) {
    const key = 'w' + state; if (wallScreen.key === key) return; wallScreen.key = key;
    const { ctx, cv } = wallScreen; const W = cv.width, H = cv.height;
    ctx.fillStyle = '#F7F7F4'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#202522'; ctx.font = '600 30px "Instrument Sans Variable", sans-serif'; ctx.fillText('Operations · Harbour Point', 40, 60);
    ctx.fillStyle = '#646C67'; ctx.font = '22px "Instrument Sans Variable", sans-serif'; ctx.fillText('Live work, all sites', 40, 92);
    const row = (y: number, a: string, b: string, c: string, hi = false) => {
      if (hi) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(28, y - 34, W - 56, 64); ctx.strokeStyle = '#245B46'; ctx.lineWidth = 3; ctx.strokeRect(28, y - 34, W - 56, 64); }
      ctx.fillStyle = '#202522'; ctx.font = (hi ? '600 ' : '') + '24px "Instrument Sans Variable", sans-serif'; ctx.fillText(a, 44, y);
      ctx.fillStyle = '#4A524D'; ctx.font = '22px "Instrument Sans Variable", sans-serif'; ctx.fillText(b, 360, y);
      ctx.fillStyle = hi ? '#A8281E' : '#4A524D'; ctx.fillText(c, 760, y);
    };
    if (state === 0) { row(170, 'WO-2611-0402', 'Lobby lighting', 'Planned'); row(240, 'WO-2611-0407', 'Lift 2 inspection', 'On site'); row(310, 'WO-2611-0411', 'Leak, level 2', 'Assigned'); return; }
    row(170, STORY.wo, 'FCU-L4-07 · Room 4.07', state >= 2 ? 'Assigned' : 'New · 4 h', true);
    row(250, 'WO-2611-0407', 'Lift 2 inspection', 'On site'); row(320, 'WO-2611-0411', 'Leak, level 2', 'Assigned');
    ctx.fillStyle = '#202522'; ctx.font = '600 24px "Instrument Sans Variable", sans-serif';
    ctx.fillText(state >= 2 ? 'Rami S. confirmed · ETA 15:12' : 'Suggested: Rami S. · HVAC · 18 min · actuator in van', 44, 420);
    ctx.fillStyle = '#4A524D'; ctx.font = '22px "Instrument Sans Variable", sans-serif';
    ctx.fillText(state >= 3 ? 'Update sent to the facilities manager · 14:06' : 'Valve 12% of command · supply 21.6 °C', 44, 460);
    wallScreen.tex.needsUpdate = true;
  }
  function drawDesk(state: number) {
    const key = 'd' + state; if (deskScreen.key === key) return; deskScreen.key = key;
    const { ctx, cv } = deskScreen; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#202522'; ctx.font = '600 28px "Instrument Sans Variable", sans-serif'; ctx.fillText(state >= 2 ? 'Assigned' : 'Confirm assignment', 24, 50);
    ctx.font = '22px "Instrument Sans Variable", sans-serif'; ctx.fillStyle = '#4A524D'; ctx.fillText(STORY.wo, 24, 90); ctx.fillText('Rami S. · 18 min', 24, 124);
    ctx.fillStyle = state >= 2 ? '#1E6B4A' : '#202522'; ctx.fillRect(24, 230, 200, 56); ctx.fillStyle = '#FFFFFF'; ctx.font = '600 22px "Instrument Sans Variable", sans-serif'; ctx.fillText(state >= 2 ? 'Confirmed' : 'Confirm', 44, 266);
    deskScreen.tex.needsUpdate = true;
  }

  // ---------- Anchors projected for the HTML overlay ----------
  const anchors: Record<string, THREE.Vector3> = {
    room: new THREE.Vector3(10.5, L4 + 2.2, HD + .05),
    valve: new THREE.Vector3(FCU.x + .68, FCU.y + .12, FCU.z + .1),
    supply: new THREE.Vector3(FCU.x + 1.15, FCU.y + .16, FCU.z + .2),
    thermo: new THREE.Vector3(RX0 + .1, L4 + 1.6, 7.6),
    wall: new THREE.Vector3(-10.6, 2.95, .9),
    tech: new THREE.Vector3(0, 0, 0),
  };
  const v = new THREE.Vector3();

  const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;
  const band = (p: number, a: number, b: number, f = .02) => clamp(Math.min((p - a) / f, (b - p) / f), 0, 1);

  function render(p: number, assemble = 1) {
    // Opening assembly: floors settle into place once, then architecture stays still
    floors.forEach((g, i) => { const t = clamp(assemble * 1.6 - i * .12, 0, 1); g.position.y = (1 - ease(t)) * (6 + i * 1.5); });
    roof.position.y = FLOORS * FLOOR_H + .25 + (1 - ease(clamp(assemble * 1.6 - .7, 0, 1))) * 14;
    plant.visible = assemble > .7;
    mull.visible = glassM.visible = assemble > .45;

    const cam = cameraAt(p);
    const portrait = camera.aspect < .85;
    if (portrait && !cam.inside) { cam.tgt.x *= .25; cam.tgt.z *= .25; }
    camera.position.copy(cam.pos); camera.lookAt(cam.tgt);
    camera.fov = cam.inside ? (cam.fov ? cam.fov * (portrait ? 1.3 : 1) : (portrait ? 70 : 56)) : (portrait ? 48 : 34);
    if (portrait && !cam.inside) camera.position.lerp(cam.tgt, -0.18);
    camera.updateProjectionMatrix();

    // the bay of room 4.07 thins to let the camera through
    roomGlassM.opacity = lerp(.58, .04, Math.max(band(p, .2, .3, .04), band(p, .89, .95, .03)));
    // interiors light up as we approach
    roomLight.intensity = 6 * clamp((p - .12) / .1, 0, 1);
    officeLight.intensity = 6 * band(p, .52, .69, .01);
    // ceiling cutaway above the unit (inspection), physically open during repair
    const tileOpen = clamp((p - .31) / .04, 0, 1) * (1 - clamp((p - .89) / .02, 0, 1));
    openM.opacity = 1 - tileOpen; openTiles.forEach((t) => (t.visible = tileOpen < .98)); edges.visible = tileOpen > .02;
    voidLight.intensity = 5 * tileOpen;
    // unit status: neutral → alert → verified
    const alertOn = p >= .28 && p < .80, okOn = p >= .80;
    haloM.color.setHex(okOn ? C.green : C.amber);
    haloM.opacity = (alertOn || okOn) && p > .26 && p < .95 ? .95 : 0;
    actOld.visible = p < .79; actNew.visible = p >= .79; (led.material as THREE.MeshBasicMaterial).color.setHex(p >= .79 ? C.green : p >= .28 ? C.amber : C.green);
    halo.lookAt(camera.position);
    // technician: walks the route, then works from the ladder
    const walking = p >= .67 && p < .755, working = p >= .755 && p < .84, standing = p >= .84 && p < .9;
    tech.visible = walking || working || standing; ladder.visible = p >= .755 && p < .9;
    routeM.opacity = walking ? .9 : 0;
    if (walking) {
      const t = (p - .67) / .085; const seg = t < .5 ? 0 : 1; const lt = seg === 0 ? t * 2 : (t - .5) * 2;
      const a = routePts[seg], b = routePts[seg + 1]; tech.position.set(lerp(a.x, b.x, lt), 0, lerp(a.z, b.z, lt));
      tech.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    } else if (working) { tech.position.set(FCU.x - .2, L4 + .39 + .62, FCU.z + .5); tech.rotation.y = Math.PI; }
    else if (standing) { tech.position.set(12.2, L4 + .39, 5.6); tech.rotation.y = -2.4; }
    (tech.userData.arms as THREE.Mesh[]).forEach((a, i) => { if (working) { a.position.y = 1.62; a.position.z = -.05; a.rotation.x = 0; a.rotation.z = (i ? -1 : 1) * .25; } else { a.position.y = 1.15; a.position.z = 0; a.rotation.z = 0; } });
    tablet.visible = !working;
    anchors.tech.set(tech.position.x, tech.position.y + 2, tech.position.z);
    // office screens follow the work record
    const ws = p < .535 ? 0 : p < .58 ? 1 : p < .62 ? 2 : 3; drawWall(ws); drawDesk(p < .58 ? 1 : 2);
    // portfolio beacons appear on the pull-back
    beacons.forEach((b, i) => { (b.material as THREE.MeshBasicMaterial).opacity = clamp((p - .955 - i * .004) / .02, 0, 1); });

    renderer.render(scene, camera);

    // project anchors for the HTML layer
    const W = canvas.clientWidth, H = canvas.clientHeight; const out: Anchor[] = [];
    for (const [id, a] of Object.entries(anchors)) {
      v.copy(a).project(camera);
      out.push({ id, x: (v.x * .5 + .5) * W, y: (-v.y * .5 + .5) * H, visible: v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 });
    }
    return out;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  return { render, resize, dispose() { renderer.dispose(); pmrem.dispose(); } };
}

export const CUT_POINTS = [.535, .67, .755];
export const STORY_RECORD = RECORD;
export { readingsAt };
