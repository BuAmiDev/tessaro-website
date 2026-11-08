/**
 * Harbour Point, one persistent 3D world in metres.
 *
 * A single camera spline runs through the whole story: street → Level 4 →
 * Room 4.07 → ceiling void → back out and down to the operations office →
 * along the plaza to the service yard → up the east facade into the same room
 * → verification → up and out over the portfolio. Everything visible is a
 * pure function of progress p, so reverse scrolling retraces the same route
 * and chapter jumps travel along it.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
// @ts-ignore no bundled types
import { N8AOPass } from 'n8ao';

export type Quality = 'high' | 'low';
export interface Anchor { id: string; x: number; y: number; visible: boolean }
export interface Frame { anchors: Anchor[]; floors: { id: string; points: string; visible: boolean }[] }
export interface StoryScene { render(p: number): Frame; resize(): void; dispose(): void; ready: Promise<void> }

// ---------- dimensions ----------
const FH = 3.9, LEVELS = 6, HW = 15, HD = 9;      // floor-to-floor, G + L1–L5, half width / depth
const GL = .4;                                      // glass line set back from the slab edge
const L4 = 4 * FH, CEIL = L4 + 2.8;                 // Level 4 floor 15.6 m, suspended ceiling 18.4 m
const ROOM = { x0: 9.4, x1: HW - GL, z0: 2.6, z1: HD - GL };
const FCU = new THREE.Vector3(12.7, CEIL + .36, 6.7);
const OFFICE = { x0: -HW + GL, x1: -6, z0: 2, z1: HD - GL, y: .15 };
const YARD_DOOR = new THREE.Vector3(HW + .05, 0, 4.6);
const DISPATCH_RY = Math.PI;
export const FLOOR_IDS = ['G', 'L1', 'L2', 'L3', 'L4', 'L5'];

// ---------- procedural textures (canvas, world-space UVs) ----------
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
function rnd(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function speckle(g: CanvasRenderingContext2D, w: number, h: number, base: string, n: number, alpha: number, seed = 7) {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rnd(seed);
  for (let i = 0; i < n; i++) { const v = r(); g.fillStyle = v > .5 ? `rgba(255,255,255,${alpha * r()})` : `rgba(60,45,30,${alpha * r()})`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
}
/** Box-projected UVs so a shared material tiles at a fixed real-world size. */
function worldUV(geo: THREE.BufferGeometry, size: number) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const [u, v] = nx >= ny && nx >= nz ? [z, y] : ny >= nz ? [x, z] : [x, y];
    uv[i * 2] = u / size; uv[i * 2 + 1] = v / size;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}

export function createStoryScene(canvas: HTMLCanvasElement, quality: Quality): StoryScene {
  const hi = quality === 'high';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: hi, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 1.75 : 1.15));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .08, 1400);

  // ---------- sky and environment: late afternoon, calm palette ----------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: new THREE.Vector3(-.62, .28, .73).normalize() } },
    vertexShader: 'varying vec3 vW; void main(){ vW = normalize((modelMatrix*vec4(position,1.)).xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }',
    fragmentShader: `varying vec3 vW; uniform vec3 sunDir;
      void main(){ float h = clamp(vW.y, -0.1, 1.0);
        vec3 zen = vec3(.62,.70,.80), mid = vec3(.83,.84,.86), hor = vec3(.97,.86,.74);
        vec3 c = mix(hor, mid, smoothstep(0.0, .22, h)); c = mix(c, zen, smoothstep(.2, .85, h));
        float s = max(dot(normalize(vW), sunDir), 0.0); c += vec3(1.,.78,.55) * (pow(s, 14.) * .35 + pow(s, 400.) * 1.2);
        gl_FragColor = vec4(c, 1.); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMat); scene.add(sky);
  scene.fog = new THREE.Fog(0xE8DCCB, 140, 700);
  const pmrem = new THREE.PMREMGenerator(renderer);
  { const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat));
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0xB8A68C })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -1; envScene.add(gnd);
    scene.environment = pmrem.fromScene(envScene, .02).texture; }

  scene.environmentIntensity = .38;
  scene.add(new THREE.HemisphereLight(0xDCE4EE, 0xA8957A, .3));
  const sun = new THREE.DirectionalLight(0xFFCC94, 6.2);
  sun.position.set(-70, 27, 58); sun.target.position.set(4, 4, 0); scene.add(sun.target);
  sun.castShadow = true; const sm = hi ? 4096 : 1024; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 40, bottom: -40, near: 20, far: 220 });
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .02; sun.shadow.radius = 3; sun.shadow.camera.updateProjectionMatrix(); scene.add(sun);

  // ---------- materials ----------
  const stoneTex = canvasTex(512, 512, (g) => { speckle(g, 512, 512, '#D3C2A4', 9000, .18); g.strokeStyle = 'rgba(120,100,75,.28)'; g.lineWidth = 2; for (let y = 0; y <= 512; y += 256) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); } for (let x = 0; x <= 512; x += 512) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); } });
  const paverTex = canvasTex(512, 512, (g) => { const r = rnd(3); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const l = 214 + r() * 14; g.fillStyle = `rgb(${l},${l - 8},${l - 20})`; g.fillRect(i * 128, j * 128, 128, 128); } speckle(g, 512, 512, 'rgba(0,0,0,0)', 4000, .08, 11); g.strokeStyle = 'rgba(110,95,75,.35)'; g.lineWidth = 2; for (let k = 0; k <= 512; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); } });
  const oakTex = canvasTex(512, 512, (g) => { const r = rnd(5); g.fillStyle = '#B98B5E'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${90 + r() * 40},${60 + r() * 30},30,${.08 + r() * .14})`; g.lineWidth = .6 + r() * 1.8; g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.bezierCurveTo(170, y + r() * 8 - 4, 340, y + r() * 8 - 4, 512, y); g.stroke(); } });
  const carpetTex = canvasTex(256, 256, (g) => speckle(g, 256, 256, '#8E8C86', 9000, .22, 9));
  const plasterTex = canvasTex(256, 256, (g) => speckle(g, 256, 256, '#EEEAE3', 3000, .06, 13));
  const tileTex = canvasTex(256, 256, (g) => { speckle(g, 256, 256, '#F2F0EB', 7000, .1, 17); g.strokeStyle = 'rgba(150,150,145,.6)'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); });
  const shutterTex = canvasTex(64, 256, (g) => { g.fillStyle = '#7C817F'; g.fillRect(0, 0, 64, 256); for (let y = 0; y < 256; y += 8) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y, 64, 2); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y + 6, 64, 2); } });
  const concreteTex = canvasTex(256, 256, (g) => speckle(g, 256, 256, '#A8A49C', 9000, .25, 21));

  const M = {
    stone: new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .82, color: 0xFFFFFF }),
    paver: new THREE.MeshStandardMaterial({ map: paverTex, roughness: .9 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x8B6A4A, metalness: .78, roughness: .36, envMapIntensity: 1.1 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x3B342D, metalness: .6, roughness: .4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x3C4846, metalness: .3, roughness: .03, transparent: true, opacity: .66, envMapIntensity: 3, depthWrite: false }),
    oak: new THREE.MeshStandardMaterial({ map: oakTex, roughness: .55 }),
    carpet: new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 1 }),
    plaster: new THREE.MeshStandardMaterial({ map: plasterTex, roughness: .92, color: 0xF0E9DE }),
    tile: new THREE.MeshStandardMaterial({ map: tileTex, roughness: .95 }),
    ceilingDark: new THREE.MeshStandardMaterial({ color: 0xE9E6DF, roughness: .95, emissive: 0xFFE2BC, emissiveIntensity: .22 }),
    concrete: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: .95 }),
    floorInt: new THREE.MeshStandardMaterial({ color: 0xC9C3B8, roughness: .8 }),
    desk: new THREE.MeshStandardMaterial({ color: 0xEDE9E2, roughness: .6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x23272A, roughness: .45, metalness: .3 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xFFF3DD }),
    warmGlow: new THREE.MeshBasicMaterial({ color: 0xFFE6C2 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xB8BDBC, metalness: .75, roughness: .32 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xD3D5D2, metalness: .7, roughness: .3 }),
    shutter: new THREE.MeshStandardMaterial({ map: shutterTex, metalness: .5, roughness: .45 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xD8A71E, roughness: .5 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xD3C3A6, roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x77736C, roughness: .95 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x7E8A5E, roughness: 1 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x8C877F, roughness: 1 }),
  };
  const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, uvSize = 0, shadow = true) => {
    const geo = new THREE.BoxGeometry(w, h, d); if (uvSize) { geo.translate(x, y, z); worldUV(geo, uvSize); geo.translate(-x, -y, -z); }
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; return o;
  };
  const world = new THREE.Group(); scene.add(world);
  const add = (o: THREE.Object3D) => { world.add(o); return o; };

  // ---------- site ----------
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), M.sand); g.rotation.x = -Math.PI / 2; g.position.y = -.02; g.receiveShadow = true; add(g);
    const plz = new THREE.Mesh(worldUV(new THREE.PlaneGeometry(84, 64).rotateX(-Math.PI / 2), 2.4), M.paver); plz.position.set(6, 0, 8); plz.receiveShadow = true; add(plz);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(2400, 12), M.asphalt); road.rotation.x = -Math.PI / 2; road.position.set(0, .01, 46); road.receiveShadow = true; add(road);
    const road2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 2400), M.asphalt); road2.rotation.x = -Math.PI / 2; road2.position.set(54, .01, 0); road2.receiveShadow = true; add(road2);
    // planters along the front, low and long, with grasses
    [[-12, 19], [3, 21.5], [-26, 12], [24, 18]].forEach(([x, z], i) => { add(box(i === 1 ? 9 : 7, .55, 2.4, M.stone, x, .275, z, 1.2)); add(box((i === 1 ? 9 : 7) - .4, .1, 2, M.grass, x, .56, z, 0, false)); });
    // grasses in every planter, kerbs, street lights and a few parked cars
    { const blade = new THREE.ConeGeometry(.03, .7, 3); blade.translate(0, .35, 0); const grassM = new THREE.MeshStandardMaterial({ color: 0x8C9461, roughness: .9 });
      const gr = new THREE.InstancedMesh(blade, grassM, hi ? 5200 : 1800); const mt = new THREE.Matrix4(); const r = rnd(77); let n = 0;
      [[-12, 19, 7], [3, 21.5, 9], [-26, 12, 7], [24, 18, 7]].forEach(([cx, cz, w]) => { for (let i = 0; i < gr.count / 4; i++) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - .5) * .7, r() * 6.3, (r() - .5) * .7)); const sc = .6 + r() * .7; mt.compose(new THREE.Vector3(cx + (r() - .5) * (w - .6), .6, cz + (r() - .5) * 1.8), q, new THREE.Vector3(sc, sc, sc)); gr.setMatrixAt(n++, mt); } });
      gr.count = n; gr.castShadow = true; add(gr);
      add(box(84, .14, .3, M.stone, 6, .07, 39.8, 1.2)); add(box(.3, .14, 64, M.stone, 47.8, .07, 8, 1.2));
      for (let x = -30; x <= 44; x += 14) { const l = new THREE.Group(); l.add(box(.12, 6, .12, M.dark, 0, 3, 0)); l.add(box(1.2, .08, .2, M.dark, -.5, 6, 0)); l.add(box(.5, .04, .16, M.warmGlow, -.9, 5.95, 0, 0, false)); l.position.set(x, 0, 40.6); add(l); } }
    // bollard lights
    for (let x = -24; x <= 26; x += 6) { const b = new THREE.Group(); b.add(box(.16, .9, .16, M.dark, 0, .45, 0)); b.add(box(.17, .08, .17, M.warmGlow, 0, .82, 0, 0, false)); b.position.set(x, 0, 25); add(b); }
    // distant low-rise city and a few towers in the haze
    const r = rnd(29); const cityTex = canvasTex(64, 64, (g) => { g.fillStyle = '#DCCDB3'; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(92,104,104,.55)'; for (let y = 6; y < 64; y += 16) for (let x = 4; x < 64; x += 12) g.fillRect(x, y, 8, 8); });
    const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: cityTex, roughness: 1 }), hi ? 700 : 320); const mt = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i < city.count; i++) { const a = r() * Math.PI * 2, d = 150 + Math.pow(r(), .7) * 620; const x = Math.cos(a) * d, z = Math.sin(a) * d - 40;
      if (Math.abs(z - 46) < 10 || Math.abs(x - 54) < 10) continue; // keep the roads clear
      const h = r() < .03 && d > 330 ? 36 + r() * 50 : 5 + r() * 12; const w = 12 + r() * 26; mt.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.round(r()) * Math.PI / 2), new THREE.Vector3(w, h, 10 + r() * 24)); city.setMatrixAt(k++, mt); }
    city.count = k; city.receiveShadow = true; add(city);
  }

  // ---------- building ----------
  const H = LEVELS * FH;
  const glassPanes: THREE.Mesh[] = [];
  const pane = (w: number, h: number, x: number, y: number, z: number, ry: number, m = M.glass) => { const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); g.position.set(x, y, z); g.rotation.y = ry; g.renderOrder = 3; add(g); glassPanes.push(g); return g; };
  // slabs, floors and ceilings
  for (let f = 0; f <= LEVELS; f++) {
    const y = f * FH;
    if (f > 0) add(box(HW * 2 - .2, .4, HD * 2 - .2, M.concrete, 0, y - .2, 0, 3));
    if (f < LEVELS) { const fl = box(HW * 2 - 2 * GL, .04, HD * 2 - 2 * GL, M.floorInt, 0, y + .02 + (f === 0 ? .13 : 0), 0, 0, false); add(fl); }
  }
  // limestone spandrel bands at every slab, deep enough to read as reveals
  for (let f = 1; f <= LEVELS; f++) {
    const y = f * FH, h = f === LEVELS ? 1.2 : .62, yc = f === LEVELS ? y + .4 : y;
    add(box(HW * 2 + .5, h, .6, M.stone, 0, yc, HD + .05, 1.2));
    add(box(HW * 2 + .5, h, .6, M.stone, 0, yc, -HD - .05, 1.2));
    add(box(.6, h, HD * 2 + .5, M.stone, HW + .05, yc, 0, 1.2));
    add(box(.6, h, HD * 2 + .5, M.stone, -HW - .05, yc, 0, 1.2));
  }
  add(box(HW * 2 + .5, .6, HD * 2 + .5, M.stone, 0, .3, 0, 1.2)); // plinth
  // stone corner piers
  [[HW, HD], [-HW, HD], [HW, -HD], [-HW, -HD]].forEach(([x, z]) => add(box(1.1, H + .6, 1.1, M.stone, x, (H + .6) / 2, z, 1.2)));
  // bronze fins in pairs at bay lines (front: 5 m bays; east: 6 m bays), and slim mullions between
  { const finG = new THREE.BoxGeometry(.14, H - FH + .2, .55); const fins = new THREE.InstancedMesh(finG, M.bronze, 80); let n = 0; const mt = new THREE.Matrix4();
    const put = (x: number, z: number, ry: number) => { mt.makeRotationY(ry); mt.setPosition(x, FH + (H - FH) / 2, z); fins.setMatrixAt(n++, mt); };
    for (let k = 1; k < 6; k++) { const x = -HW + k * 5; put(x - .3, HD + .28, 0); put(x + .3, HD + .28, 0); put(x - .3, -HD - .28, 0); put(x + .3, -HD - .28, 0); }
    for (let k = 1; k < 3; k++) { const z = -HD + k * 6; put(HW + .28, z - .3, Math.PI / 2); put(HW + .28, z + .3, Math.PI / 2); put(-HW - .28, z - .3, Math.PI / 2); put(-HW - .28, z + .3, Math.PI / 2); }
    fins.count = n; fins.castShadow = true; fins.receiveShadow = true; add(fins);
    const mullG = new THREE.BoxGeometry(.06, FH, .1); const mull = new THREE.InstancedMesh(mullG, M.frame, 400); n = 0;
    for (let f = 0; f < LEVELS; f++) { const y = f * FH + FH / 2;
      for (let x = -HW + 1.25; x < HW; x += 2.5) { mt.makeTranslation(x, y, HD - GL); mull.setMatrixAt(n++, mt); mt.makeTranslation(x, y, -HD + GL); mull.setMatrixAt(n++, mt); }
      for (let z = -HD + 1.5; z < HD; z += 3) { mt.makeRotationY(Math.PI / 2); mt.setPosition(HW - GL, y, z); mull.setMatrixAt(n++, mt); mt.makeRotationY(Math.PI / 2); mt.setPosition(-HW + GL, y, z); mull.setMatrixAt(n++, mt); } }
    mull.count = n; add(mull); }
  // glass, with separate panes where the camera passes (room front + east, office front)
  const roomFront = pane(ROOM.x1 - ROOM.x0 + .4, FH - .5, (ROOM.x0 + ROOM.x1) / 2, L4 + FH / 2 - .05, HD - GL, 0, M.glass.clone());
  const roomEast = pane(ROOM.z1 - ROOM.z0, FH - .5, HW - GL, L4 + FH / 2 - .05, (ROOM.z0 + ROOM.z1) / 2, Math.PI / 2, M.glass.clone());
  const officeFront = pane(OFFICE.x1 - OFFICE.x0, FH - .5, (OFFICE.x0 + OFFICE.x1) / 2, FH / 2, HD - GL, 0, M.glass.clone());
  for (let f = 0; f < LEVELS; f++) {
    const y = f * FH + FH / 2 - .05, h = FH - .5;
    if (f === 4) { // the room's own panes cover its bay
      const fx = ROOM.x0 - .2; pane(fx + HW, h, (-HW + fx) / 2, y, HD - GL, 0);
      pane(ROOM.z0 + HD, h, HW - GL, y, (-HD + ROOM.z0) / 2, Math.PI / 2);
    } else if (f === 0) { pane(HW - OFFICE.x1, h, (OFFICE.x1 + HW) / 2, y, HD - GL, 0); pane(HD * 2, h, HW - GL, y, 0, Math.PI / 2); }
    else { pane(HW * 2, h, 0, y, HD - GL, 0); pane(HD * 2, h, HW - GL, y, 0, Math.PI / 2); }
    pane(HW * 2, h, 0, y, -HD + GL, Math.PI); pane(HD * 2, h, -HW + GL, y, 0, -Math.PI / 2);
  }
  // occupied interiors: light strips, desks, chairs, plants and cores read through the glass
  { const mt = new THREE.Matrix4(); const r = rnd(41);
    const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, .03, .12), M.lamp, 600); let n = 0;
    const desks = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, .74, .8), M.desk, 500); let d = 0;
    const chairs = new THREE.InstancedMesh(new RoundedBoxGeometry(.46, .82, .46, 2, .08), new THREE.MeshStandardMaterial({ color: 0x77726B, roughness: .9 }), 500); let c = 0;
    const greens = new THREE.InstancedMesh(new THREE.SphereGeometry(.45, 10, 8), new THREE.MeshStandardMaterial({ color: 0x5F7550, roughness: 1 }), 120); let gr = 0;
    for (let f = 1; f < LEVELS; f++) { const y = f * FH;
      const cy = y + FH - .85;
      if (f === 4) { // keep the room's own ceiling and void clear
        add(box(ROOM.x0 + HW - GL, .05, HD * 2 - 2 * GL, M.ceilingDark, (-HW + GL + ROOM.x0) / 2, cy, 0, 0, false));
        add(box(HW - GL - ROOM.x0, .05, ROOM.z0 + HD - GL, M.ceilingDark, (ROOM.x0 + HW - GL) / 2, cy, (-HD + GL + ROOM.z0) / 2, 0, false));
      } else add(box(HW * 2 - 2 * GL, .05, HD * 2 - 2 * GL, M.ceilingDark, 0, cy, 0, 0, false));
      for (let x = -HW + 2; x < HW - 1; x += 3.2) for (let z = -HD + 2; z < HD - 1; z += 2.6) {
        if (f === 4 && x > ROOM.x0 - .5 && z > ROOM.z0 - .5) continue;
        mt.makeTranslation(x, y + FH - .88, z); strips.setMatrixAt(n++, mt);
        if (r() < .6) { mt.makeTranslation(x + .3, y + .37, z + .5); desks.setMatrixAt(d++, mt); mt.makeTranslation(x + .3, y + .45, z + 1.15); chairs.setMatrixAt(c++, mt); }
        if (r() < .12 && gr < 120) { mt.makeTranslation(x - 1.2, y + .7, HD - GL - .8); greens.setMatrixAt(gr++, mt); }
      }
      add(box(7, FH - .9, 5, M.plaster, -1, y + (FH - .9) / 2, -3.5, 2)); // core
    }
    strips.count = n; desks.count = d; [strips, desks].forEach((o) => add(o)); chairs.dispose(); greens.dispose(); }
  // ground floor: double-height lobby with timber canopy and a ring pendant
  { const canopy = box(12, .5, 4.2, M.oak, -1, FH * 2 - .3, HD + 1.6, 3); add(canopy);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, .04, 8, 64), M.lamp); ring.rotation.x = Math.PI / 2; ring.position.set(-1, 5.6, 4); add(ring);
    add(box(2.2, 1.1, .7, M.oak, -1, .7, 2.5, 1)); }
  // roof: louvred plant screen set back from the parapet
  { const slat = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .08, .32), M.bronze, 200); const mt = new THREE.Matrix4(); let n = 0;
    for (let i = 0; i < 12; i++) { const y = H + 1.1 + i * .22; [[0, HD - 2.4, 24, 0], [0, -HD + 2.4, 24, 0], [12, 0, 13.2, Math.PI / 2], [-12, 0, 13.2, Math.PI / 2]].forEach(([x, z, w, ry]) => { mt.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(w, 1, 1)); slat.setMatrixAt(n++, mt); }); }
    slat.count = n; slat.castShadow = true; add(slat); add(box(23.6, 2.6, 13, M.concrete, 0, H + 1.6, 0, 3)); }
  // east side: service entrance with roller shutter, door and bollards
  { add(box(.2, 3.6, 4, M.shutter, HW + .1, 1.9, -2.2, 0)); add(box(1, .25, 5, M.stone, HW + .55, 3.9, -2.2, 1.2));
    add(box(.12, 2.4, 1.1, new THREE.MeshStandardMaterial({ color: 0x6E7471, metalness: .4, roughness: .45 }), HW + .08, 1.35, YARD_DOOR.z));
    [-5, .6, 2.6, 6.2].forEach((z) => { const b = new THREE.Group(); b.add(box(.22, 1, .22, M.yellow, 0, .5, 0)); b.add(box(.23, .12, .23, M.dark, 0, .75, 0, 0, false)); b.position.set(HW + 2, 0, z); add(b); }); }

  // ---------- Room 4.07 ----------
  const room = new THREE.Group(); add(room);
  const rcx = (ROOM.x0 + ROOM.x1) / 2, rcz = (ROOM.z0 + ROOM.z1) / 2, rw = ROOM.x1 - ROOM.x0, rd = ROOM.z1 - ROOM.z0;
  room.add(box(rw, .03, rd, M.carpet, rcx, L4 + .05, rcz, 1.5, false));
  room.add(box(.14, FH - .4, rd, M.plaster, ROOM.x0, L4 + (FH - .4) / 2, rcz, 2));                     // west partition
  room.add(box(rw, FH - .4, .14, M.plaster, rcx, L4 + (FH - .4) / 2, ROOM.z0, 2));                     // back wall
  room.add(box(.05, 2.2, 1, M.oak, ROOM.x0 + .08, L4 + 1.1, ROOM.z0 + 1.2, 1));                         // door
  const acoustic = box(2.6, 1.2, .05, M.fabric, rcx + .4, L4 + 1.6, ROOM.z0 + .1); room.add(acoustic);
  const tv = box(1.9, 1.1, .06, M.dark, rcx - 1.4, L4 + 1.7, ROOM.z0 + .12); room.add(tv);
  // suspended ceiling: 600 mm tiles; two above the unit lift out for inspection
  const lifted: { m: THREE.Mesh; home: THREE.Vector3; aside: THREE.Vector3 }[] = [];
  { const tileG = worldUV(new THREE.BoxGeometry(.59, .025, .59), .6); const inst = new THREE.InstancedMesh(tileG, M.tile, 200); const mt = new THREE.Matrix4(); let n = 0;
    for (let x = ROOM.x0 + .3; x < ROOM.x1 - .1; x += .6) for (let z = ROOM.z0 + .3; z < ROOM.z1 - .1; z += .6) {
      const near = Math.abs(x - FCU.x) < 1.4 && Math.abs(z - FCU.z) < .62;
      if (near) { const m = new THREE.Mesh(tileG, M.tile); m.position.set(x, CEIL, z); m.receiveShadow = true; room.add(m); lifted.push({ m, home: m.position.clone(), aside: new THREE.Vector3(ROOM.x0 + .5 + lifted.length * .2, L4 + .32, ROOM.z0 + .6) }); continue; }
      if (Math.abs(z - (ROOM.z1 - .3)) < .05) continue; // slot diffuser line
      mt.makeTranslation(x, CEIL, z); inst.setMatrixAt(n++, mt); }
    inst.count = n; inst.receiveShadow = true; room.add(inst);
    room.add(box(rw, .012, .06, new THREE.MeshStandardMaterial({ color: 0x3A3E3D, roughness: .6 }), rcx, CEIL - .01, ROOM.z1 - .3, 0, false));
    [[10.6, 4.2], [13.4, 4.2], [10.6, 6.8], [11.6, 3.2]].forEach(([x, z]) => { const dl = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .02, 20), M.lamp); dl.position.set(x, CEIL - .02, z); room.add(dl); }); }
  // void above the ceiling: slab soffit, cable tray, hangers
  room.add(box(rw, .02, rd, M.concrete, rcx, L4 + FH - .42, rcz, 2, false));
  room.add(box(rw - .4, .06, .3, M.steel, rcx, CEIL + .62, ROOM.z0 + 1.4));
  const roomLight = new THREE.PointLight(0xFFE7CC, 0, 9, 1.4); roomLight.position.set(rcx, CEIL - .4, rcz); room.add(roomLight);
  const voidLight = new THREE.PointLight(0xF3F6FF, 0, 3.2, 1.2); voidLight.position.set(FCU.x - .2, CEIL + .2, FCU.z + .9); room.add(voidLight);
  // meeting table (chairs come from the model)
  const tableTop = box(3.4, .05, 1.25, M.oak, 11.9, L4 + .74, 5.2, 1); room.add(tableTop);
  room.add(box(.25, .7, .8, M.oak, 10.9, L4 + .37, 5.2, 1)); room.add(box(.25, .7, .8, M.oak, 12.9, L4 + .37, 5.2, 1));
  // room details: skirting, door frame, credenza, framed print, curtains at the glass edges
  room.add(box(.02, .08, rd, M.oak, ROOM.x0 + .08, L4 + .08, rcz)); room.add(box(rw, .08, .02, M.oak, rcx, L4 + .08, ROOM.z0 + .08));
  room.add(box(.06, 2.3, .08, M.bronze, ROOM.x0 + .1, L4 + 1.15, ROOM.z0 + .66)); room.add(box(.06, 2.3, .08, M.bronze, ROOM.x0 + .1, L4 + 1.15, ROOM.z0 + 1.74)); room.add(box(.06, .08, 1.16, M.bronze, ROOM.x0 + .1, L4 + 2.3, ROOM.z0 + 1.2));
  room.add(box(1.8, .62, .45, M.oak, rcx + 1.2, L4 + .31, ROOM.z0 + .32, 1)); room.add(box(1.82, .03, .47, M.stone, rcx + 1.2, L4 + .635, ROOM.z0 + .32, .6));
  { const art = canvasTex(256, 192, (g) => { g.fillStyle = '#EDE6D9'; g.fillRect(0, 0, 256, 192); g.fillStyle = '#C9B48F'; g.fillRect(28, 70, 200, 56); g.fillStyle = '#8D9C8A'; g.beginPath(); g.arc(150, 70, 34, Math.PI, 0); g.fill(); g.fillStyle = '#B98B5E'; g.fillRect(28, 118, 200, 8); });
    room.add(box(.9, .66, .03, M.frame, rcx + 1.2, L4 + 1.45, ROOM.z0 + .1, 0, false)); const pr = new THREE.Mesh(new THREE.PlaneGeometry(.82, .58), new THREE.MeshStandardMaterial({ map: art, roughness: .9 })); pr.position.set(rcx + 1.2, L4 + 1.45, ROOM.z0 + .12); room.add(pr); }
  { const curtainM = new THREE.MeshStandardMaterial({ color: 0xE6DFD2, roughness: 1, side: THREE.DoubleSide }); const folds = (w: number, h: number) => { const g = new THREE.PlaneGeometry(w, h, 24, 1); const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) / w * Math.PI * 9) * .035); g.computeVertexNormals(); return g; };
    const c1 = new THREE.Mesh(folds(.7, 2.75), curtainM); c1.position.set(ROOM.x0 + .5, L4 + 1.4, ROOM.z1 - .12); c1.castShadow = true; room.add(c1);
    const c2 = new THREE.Mesh(folds(.7, 2.75), curtainM); c2.rotation.y = Math.PI / 2; c2.position.set(ROOM.x1 - .12, L4 + 1.4, ROOM.z0 + .5); c2.castShadow = true; room.add(c2); }
  const potPlant = new THREE.Group(); potPlant.add(box(.45, .55, .45, M.stone, 0, .275, 0, .6)); potPlant.position.set(ROOM.x1 - .6, L4, ROOM.z0 + .6); room.add(potPlant);

  // ---------- FCU-L4-07 (procedural first, replaced by the model when loaded) ----------
  const fcu = new THREE.Group(); fcu.position.copy(FCU); add(fcu);
  const galvTex = canvasTex(256, 256, (g) => { const r = rnd(33); g.fillStyle = '#B9BEBD'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { const l = 160 + r() * 70; g.fillStyle = `rgba(${l},${l + 4},${l + 3},.55)`; g.beginPath(); const x = r() * 256, y = r() * 256, rr = 10 + r() * 26; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; g.lineTo(x + Math.cos(a) * rr * (.7 + r() * .4), y + Math.sin(a) * rr * (.7 + r() * .4)); } g.fill(); } });
  const grilleTex = canvasTex(128, 128, (g) => { g.fillStyle = '#9EA3A2'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#2F3332'; for (let y = 4; y < 128; y += 8) g.fillRect(4, y, 120, 4); });
  const galv = new THREE.MeshStandardMaterial({ map: galvTex, metalness: .8, roughness: .34 });
  const grille = new THREE.MeshStandardMaterial({ map: grilleTex, metalness: .6, roughness: .5 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xC0913F, metalness: .9, roughness: .25 });
  const insul = new THREE.MeshStandardMaterial({ color: 0x1E2122, roughness: .92 });
  const pvc = new THREE.MeshStandardMaterial({ color: 0xF1F1EE, roughness: .45 });
  const fcuProc = new THREE.Group(); fcu.add(fcuProc);
  // casing with folded edges, an access panel and a return grille underneath
  fcuProc.add(box(1.3, .3, .64, galv, 0, 0, 0, .9));
  [[0, .152, .322, 1.3, .012, .012], [0, -.152, .322, 1.3, .012, .012], [0, .152, -.322, 1.3, .012, .012], [0, -.152, -.322, 1.3, .012, .012]].forEach(([x, y, z, w, h, d]) => fcuProc.add(box(w, h, d, galv, x, y, z, 0, false)));
  fcuProc.add(box(.42, .2, .005, galv, .25, 0, .323, .9)); for (const x of [.06, .44]) for (const y of [-.08, .08]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .006, 8), M.steel); s.rotation.x = Math.PI / 2; s.position.set(x, y, .327); fcuProc.add(s); }
  fcuProc.add(box(1.1, .005, .5, grille, -.05, -.153, 0, 0, false));
  // supply spigot and flexible duct toward the slot diffuser
  fcuProc.add(box(.24, .2, .44, galv, .77, -.01, 0, .9));
  const flex = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .9, 20, 8, true), new THREE.MeshStandardMaterial({ color: 0xC9CCCB, metalness: .7, roughness: .45, side: THREE.DoubleSide })); flex.rotation.z = Math.PI / 2; flex.rotation.y = -.5; flex.position.set(1.25, -.08, .3); fcuProc.add(flex);
  // hanger rods with nuts
  for (const [x, z] of [[-.58, -.27], [-.58, .27], [.58, -.27], [.58, .27]] as const) { fcuProc.add(box(.014, .62, .014, M.steel, x, .45, z)); fcuProc.add(box(.04, .03, .04, M.steel, x, .17, z)); }
  // chilled-water flow and return: insulated pipes into a brass valve and the coil connections
  const pipes = new THREE.Group(); fcu.add(pipes);
  [[-.07, .16], [.07, .2]].forEach(([dy, dz]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, 1.9, 18), insul); p.rotation.z = Math.PI / 2; p.position.set(-1.62, dy, dz); p.castShadow = true; pipes.add(p);
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .12, 12), brass); stub.rotation.z = Math.PI / 2; stub.position.set(-.68, dy, dz); pipes.add(stub); });
  const valveBody = new THREE.Group(); valveBody.position.set(-.8, -.07, .16); fcu.add(valveBody);
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, .13, 16), brass); b.rotation.z = Math.PI / 2; valveBody.add(b); const hx = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .03, 6), brass); hx.rotation.z = Math.PI / 2; hx.position.x = -.07; valveBody.add(hx); const hx2 = hx.clone(); hx2.position.x = .07; valveBody.add(hx2); valveBody.add(box(.03, .07, .03, brass, 0, .06, 0, 0)); }
  const ACT = new THREE.Vector3(-.8, .045, .16);
  const actuator = (color: number) => { const g = new THREE.Group(); g.add(new THREE.Mesh(new RoundedBoxGeometry(.12, .1, .1, 3, .014), new THREE.MeshStandardMaterial({ color, roughness: .5 }))); g.add(box(.05, .012, .05, new THREE.MeshStandardMaterial({ color: 0x2B2F31, roughness: .6 }), 0, .056, 0, 0, false));
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.06, 0, 0), new THREE.Vector3(.14, .02, 0), new THREE.Vector3(.2, .22, -.05), new THREE.Vector3(.25, .5, -.1)]), 20, .006, 6), new THREE.MeshStandardMaterial({ color: 0x1B1D1E, roughness: .6 })); g.add(cable);
    g.children.forEach((c) => { c.castShadow = true; }); return g; };
  const actuatorOld = actuator(0x5A6064), actuatorNew = actuator(0xE6E8E4);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.007, 8, 6), new THREE.MeshBasicMaterial({ color: 0xC77D1E })); led.position.set(0, .02, .051); actuatorOld.add(led);
  const ledNew = new THREE.Mesh(new THREE.SphereGeometry(.007, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3BB273 })); ledNew.position.set(0, .02, .051); actuatorNew.add(ledNew);
  actuatorOld.position.copy(ACT); actuatorNew.position.copy(ACT); fcu.add(actuatorOld, actuatorNew);
  // condensate drain and the asset tag
  { const d1 = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .28, 12), pvc); d1.rotation.z = Math.PI / 2; d1.position.set(-.79, -.13, -.2); fcu.add(d1); const d2 = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .9, 12), pvc); d2.rotation.z = Math.PI / 2; d2.position.set(-1.38, -.13, -.2); fcu.add(d2); }
  const tagM = new THREE.MeshStandardMaterial({ map: canvasTex(128, 64, (g) => { g.fillStyle = '#FBFBF8'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#202522'; g.fillRect(8, 10, 70, 8); g.fillRect(8, 26, 50, 6); for (let x = 86; x < 120; x += 4) g.fillRect(x, 12 + (x % 8 ? 0 : 4), 2, 36); }), roughness: .5 });
  fcu.add(box(.13, .065, .004, tagM, -.25, .02, .324, 0, false));
  const haloM = new THREE.MeshBasicMaterial({ color: 0xC77D1E, transparent: true, opacity: 0, depthTest: false });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.14, .006, 8, 48), haloM); halo.position.copy(ACT); halo.renderOrder = 9; fcu.add(halo);

  // ---------- operations office (ground floor, west front) ----------
  const office = new THREE.Group(); add(office);
  const ocx = (OFFICE.x0 + OFFICE.x1) / 2, ocz = (OFFICE.z0 + OFFICE.z1) / 2, ow = OFFICE.x1 - OFFICE.x0, od = OFFICE.z1 - OFFICE.z0;
  office.add(box(ow, .03, od, M.paver, ocx, OFFICE.y + .02, ocz, 2.4, false));
  office.add(box(.14, FH - .5, od, M.plaster, OFFICE.x1, (FH - .5) / 2 + .15, ocz, 2));
  office.add(box(ow, FH - .5, .14, M.stone, ocx, (FH - .5) / 2 + .15, OFFICE.z0, 1.2));
  office.add(box(ow, .04, od, M.ceilingDark, ocx, FH - .5, ocz, 0, false));
  const wallTex = new THREE.TextureLoader().load('/story/3d/wall-dispatch.webp'); wallTex.colorSpace = THREE.SRGBColorSpace; wallTex.anisotropy = 8;
  const wallScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9125), new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false }));
  wallScreen.position.set(ocx - .6, 1.95, OFFICE.z0 + .13); office.add(wallScreen);
  office.add(box(3.5, 2, .05, M.dark, ocx - .6, 1.95, OFFICE.z0 + .07, 0, false));
  const deskA = box(2.6, .05, .9, M.oak, ocx - .4, OFFICE.y + .74, ocz + .6, 1); office.add(deskA);
  office.add(box(.2, .72, .7, M.oak, ocx - 1.6, OFFICE.y + .37, ocz + .6, 1)); office.add(box(.2, .72, .7, M.oak, ocx + .8, OFFICE.y + .37, ocz + .6, 1));
  const monTex = wallTex; const monM = new THREE.MeshBasicMaterial({ map: monTex, toneMapped: false });
  [-1, 0].forEach((k) => { const x = ocx - .4 + k * .66 + .33; office.add(box(.62, .38, .03, M.dark, x, OFFICE.y + 1.05, ocz + .32)); office.add(box(.05, .26, .05, M.dark, x, OFFICE.y + .88, ocz + .38));
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(.58, .34), monM); sc.position.set(x, OFFICE.y + 1.05, ocz + .34); office.add(sc); });
  // office: pendant lines, rug, a glass partition and a second workstation row
  for (let x = OFFICE.x0 + 1.4; x < OFFICE.x1 - .5; x += 2.4) { office.add(box(1.6, .04, .08, M.lamp, x, FH - .9, ocz + .6, 0, false)); office.add(box(.01, .35, .01, M.dark, x, FH - .7, ocz + .6, 0, false)); }
  office.add(box(3.6, .012, 2.6, new THREE.MeshStandardMaterial({ color: 0x9C9283, roughness: 1 }), ocx - .4, OFFICE.y + .03, ocz + 1.1, 0, false));
  { const part = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), M.glass); part.rotation.y = Math.PI / 2; part.position.set(ocx + 1.6, 1.45, ocz - .4); office.add(part); office.add(box(.05, 2.7, .05, M.frame, ocx + 1.6, 1.45, ocz + 1.7)); office.add(box(.05, 2.7, .05, M.frame, ocx + 1.6, 1.45, ocz - 2.5)); }
  const officeLight = new THREE.PointLight(0xFFE7CC, 0, 12, 1.4); officeLight.position.set(ocx, FH - .8, ocz); office.add(officeLight);
  [[ocx - 3.2, ocz + 1.6], [ocx + 2.4, ocz - 1.4]].forEach(([x, z]) => { office.add(box(1.8, .05, .8, M.desk, x, OFFICE.y + .74, z)); office.add(box(.5, .3, .03, M.dark, x, OFFICE.y + .98, z - .2)); [-.85, .85].forEach((dx) => office.add(box(.05, .72, .7, M.frame, x + dx, OFFICE.y + .37, z))); });

  // ---------- step ladder (aluminium) ----------
  const ladder = new THREE.Group(); { const rail = (x: number, z: number, rx: number) => { const r = box(.05, 1.75, .03, M.alu, x, .85, z); r.rotation.x = rx; ladder.add(r); };
    rail(-.24, .18, -.18); rail(.24, .18, -.18); rail(-.24, -.18, .18); rail(.24, -.18, .18);
    for (let i = 0; i < 4; i++) ladder.add(box(.5, .03, .12, M.alu, 0, .35 + i * .38, .14 - i * .06)); ladder.add(box(.52, .04, .26, M.alu, 0, 1.68, 0)); }
  ladder.position.set(FCU.x - .55, L4 + .05, FCU.z + .5); add(ladder);

  // ---------- portfolio around the site ----------
  const portfolio = new THREE.Group(); add(portfolio); const beacons: THREE.Mesh[] = [];
  { const facade = (bg: string, glass: string, rows: number) => canvasTex(128, 128, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 128, 128); g.fillStyle = glass; for (let y = 0; y < 128; y += 128 / rows) g.fillRect(6, y + 6, 116, 128 / rows - 14); });
    const types = [
      { t: facade('#E3D6C0', '#6E7F80', 4), w: 26, h: 34, d: 18, x: -95, z: -60 },   // residential
      { t: facade('#D9CDB8', '#7C8C8B', 2), w: 70, h: 12, d: 40, x: 110, z: -70 },    // mall
      { t: facade('#E6DCC8', '#738483', 3), w: 36, h: 10, d: 22, x: -140, z: 60 },    // school
      { t: facade('#EFE8DA', '#6E8281', 5), w: 22, h: 20, d: 22, x: 120, z: 70 },     // clinic
      { t: facade('#C9C3B5', '#9AA19E', 1), w: 80, h: 11, d: 46, x: -40, z: -170 },   // warehouse
      { t: facade('#E1D4BD', '#687B7B', 6), w: 20, h: 52, d: 20, x: 60, z: -150 },    // tower
    ];
    types.forEach((b, i) => { b.t.repeat.set(b.w / 6, b.h / FH); const o = box(b.w, b.h, b.d, new THREE.MeshStandardMaterial({ map: b.t, roughness: .85 }), b.x, b.h / 2, b.z); portfolio.add(o);
      if (i === 2) { const court = box(24, .05, 14, new THREE.MeshStandardMaterial({ color: 0x5D8A6A }), b.x + 32, .05, b.z, 0, false); portfolio.add(court); }
      const bm = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14), new THREE.MeshBasicMaterial({ color: i === 3 ? 0xC77D1E : 0x245B46, transparent: true, opacity: 0 })); bm.position.set(b.x, b.h + 7, b.z); portfolio.add(bm); beacons.push(bm); });
    const hpBeacon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14), new THREE.MeshBasicMaterial({ color: 0x245B46, transparent: true, opacity: 0 })); hpBeacon.position.set(0, H + 9, 0); portfolio.add(hpBeacon); beacons.push(hpBeacon); }

  // ---------- models (loaded progressively; the procedural scene is complete without them) ----------
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const loadGLB = (name: string) => new Promise<THREE.Group | null>((res) => loader.load(`/story/3d/${name}.glb`, (g) => { g.scene.userData.anims = g.animations; res(g.scene); }, undefined, () => res(null)));
  const prep = (o: THREE.Object3D) => { o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; const mat = m.material as THREE.MeshStandardMaterial; if (mat && 'envMapIntensity' in mat) { mat.envMapIntensity = .9; mat.emissiveMap = null; mat.emissive?.set(0); mat.needsUpdate = true; } } }); return o; };
  /** Normalise a model to a target height, standing on y = 0. */
  const fit = (o: THREE.Object3D, height: number) => { const b = new THREE.Box3().setFromObject(o); const s = height / (b.max.y - b.min.y); o.scale.setScalar(s); const b2 = new THREE.Box3().setFromObject(o); o.position.y -= b2.min.y; const c = b2.getCenter(new THREE.Vector3()); o.position.x -= c.x; o.position.z -= c.z; const w = new THREE.Group(); w.add(o); return w; };
  let tech: THREE.Group | null = null, mixer: THREE.AnimationMixer | null = null, walk: THREE.AnimationAction | null = null, clipDur = 1;
  let dispatcher: THREE.Group | null = null; const bones: Record<string, THREE.Bone> = {}; const rest: Record<string, THREE.Quaternion> = {};
  const ready = (async () => {
    const [palm, olive] = await Promise.all([loadGLB('palm'), loadGLB('olive')]);
    if (palm) { const base = fit(prep(palm), 9.5); [[-16, 22, 0], [9.5, 21, 1.4], [-30, 6, .7], [28, 22, 2.1], [34, 2, 1], [-34, 26, 2.6], [20, 34, .3]].forEach(([x, z, r], i) => { const p = i ? base.clone() : base; p.position.set(x, 0, z); p.rotation.y = r; p.scale.setScalar(.85 + (i % 3) * .12); add(p); }); }
    if (olive) { const base = fit(prep(olive), 3.6); [[-14, 19.2], [-10, 19.2], [0, 21.6], [6, 21.6], [-27.5, 12], [24.5, 18]].forEach(([x, z], i) => { const o = i ? base.clone() : base; o.position.set(x, .3, z); o.rotation.y = i * 1.7; add(o); });
      const indoor = base.clone(); indoor.scale.multiplyScalar(.36); indoor.position.set(ROOM.x1 - .6, L4, ROOM.z0 + .6); room.add(indoor); potPlant.visible = false;
      const indoor2 = base.clone(); indoor2.scale.multiplyScalar(.5); indoor2.position.set(OFFICE.x0 + .8, OFFICE.y, OFFICE.z0 + .8); office.add(indoor2);
      const indoor3 = base.clone(); indoor3.scale.multiplyScalar(.42); indoor3.position.set(OFFICE.x1 - .7, OFFICE.y, OFFICE.z1 - .9); office.add(indoor3); }
    const [chair, van, person, disp] = await Promise.all([loadGLB('chair'), loadGLB('van'), loadGLB('technician'), loadGLB('dispatcher')]);
    if (disp) { dispatcher = fit(prep(disp), 1.4); dispatcher.position.set(ocx - .4, OFFICE.y, ocz + 1.3); dispatcher.rotation.y = DISPATCH_RY; office.add(dispatcher); }
    if (chair) { const base = fit(prep(chair), .82); [[10.9, 4.35, 0], [11.9, 4.35, 0], [12.9, 4.35, 0], [10.9, 6.05, Math.PI], [11.9, 6.05, Math.PI], [12.9, 6.05, Math.PI], [9.95, 5.2, Math.PI / 2]].forEach(([x, z, r], i) => { const c = i ? base.clone() : base; c.position.set(x, L4 + .05, z); c.rotation.y = r + Math.PI; room.add(c); });
      [[ocx + 2.4, ocz - .7, Math.PI], [ocx - 3.2, ocz + 2.35, Math.PI], [ocx - 2.6, ocz + 2.4, Math.PI + .3]].forEach(([x, z, r]) => { const oc = base.clone(); oc.position.set(x, OFFICE.y, z); oc.rotation.y = r; office.add(oc); }); }
    if (van) { const v = fit(prep(van), 1.95); v.position.set(24.5, 0, -1.5); v.rotation.y = -Math.PI / 2 + .25; add(v); }
    if (person) {
      tech = fit(prep(person), 1.76); add(tech);
      person.traverse((o) => { const b = o as THREE.Bone; if (b.isBone) { bones[b.name.toLowerCase()] = b; rest[b.name.toLowerCase()] = b.quaternion.clone(); } });
      const anims = (person.userData.anims || []) as THREE.AnimationClip[];
      if (anims.length) { mixer = new THREE.AnimationMixer(person); walk = mixer.clipAction(anims[0]); walk.play(); clipDur = anims[0].duration; }
    }
  })();
  /** Pose helpers for the rig (standard humanoid bone names). */
  const findBone = (root: THREE.Object3D, name: string) => { let f: THREE.Bone | null = null; root.traverse((o) => { if (!f && (o as THREE.Bone).isBone && o.name === name) f = o as THREE.Bone; }); return f as THREE.Bone | null; };
  function seat(root: THREE.Object3D) {
    const r = (n: string, x: number, z = 0) => { const b = findBone(root, n); if (b) { b.rotateX(x); if (z) b.rotateZ(z); } };
    r('LeftUpLeg', -1.5); r('RightUpLeg', -1.5); r('LeftLeg', 1.55); r('RightLeg', 1.55);
    r('LeftArm', .55); r('RightArm', .55); r('LeftForeArm', -.9); r('RightForeArm', -.9);
  }
  function restPose() { Object.entries(rest).forEach(([k, q]) => bones[k]?.quaternion.copy(q)); }
  function reachUp(_root: THREE.Object3D, on: boolean) {
    if (!on) return;
    const r = (n: string, x: number, y = 0, z = 0) => { const b = bones[n.toLowerCase()]; if (b) { b.rotateX(x); b.rotateY(y); b.rotateZ(z); } };
    r('LeftArm', -2.3, 0, 0); r('RightArm', -2.3, 0, 0); r('LeftForeArm', -.5); r('RightForeArm', -.5); r('Head', -.45);
  }

  // ---------- post: ambient occlusion grounds every object (desktop only) ----------
  let composer: EffectComposer | null = null;
  if (hi) {
    composer = new EffectComposer(renderer);
    const ao = new N8AOPass(scene, camera, 1, 1);
    Object.assign(ao.configuration, { aoRadius: 1.4, distanceFalloff: .8, intensity: 2.6, halfRes: true, denoiseSamples: 4, denoiseRadius: 10, gammaCorrection: false });
    composer.addPass(ao); composer.addPass(new OutputPass()); composer.addPass(new SMAAPass());
  }

  // ---------- one continuous camera path ----------
  type Key = { p: number; pos: [number, number, number]; tgt: [number, number, number]; fov?: number };
  const KEYS: Key[] = [
    { p: 0,    pos: [58, 11, 62],      tgt: [-12, 12, -2],   fov: 34 },   // Building
    { p: .07,  pos: [48, 13.5, 52],    tgt: [-6, 13, -1],    fov: 34 },
    { p: .125, pos: [30, 17, 33],      tgt: [9, 17, 4],      fov: 36 },   // Level 4 framed
    { p: .175, pos: [16.5, 17.4, 18.5],tgt: [12.2, 17.2, 7], fov: 40 },   // approaching the bay
    { p: .215, pos: [13.4, 17.2, 10.6],tgt: [11.6, 16.9, 4], fov: 50 },   // through the glass
    { p: .25,  pos: [13.3, 17.05, 7.7], tgt: [10.6, 16.7, 3.6], fov: 58 }, // Room 4.07
    { p: .30,  pos: [12.5, 17.0, 8.0], tgt: [12.1, 18.3, 5.6], fov: 56 }, // looking up
    { p: .36,  pos: [10.9, 17.55, 8.3], tgt: [12.1, 18.8, 6.8], fov: 46 },// Inspect: the valve end of the unit
    { p: .43,  pos: [13.7, 17.35, 8.35], tgt: [12.3, 18.75, 6.6], fov: 50 },  // Context, around the unit
    { p: .50,  pos: [13.4, 17.3, 8.4], tgt: [11.2, 16.6, 4.6], fov: 54 },
    { p: .535, pos: [12.4, 16.4, 13.5],tgt: [2, 10, 4],      fov: 46 },   // back out of the bay
    { p: .565, pos: [-2, 6.5, 19],     tgt: [-10, 2.6, 5],   fov: 44 },   // down the facade
    { p: .595, pos: [-9.2, 2.1, 11.6], tgt: [-11, 1.9, 3],   fov: 52 },   // into the office
    { p: .63,  pos: [-7.3, 2.05, 8.25],tgt: [-11.4, 1.45, 3.5], fov: 54 },// Office: Lina at her desk, the board behind
    { p: .665, pos: [-8.0, 2.0, 8.1],  tgt: [-11.6, 1.5, 2.8], fov: 54 },
    { p: .686, pos: [-7.6, 2.4, 12.2], tgt: [-10.2, 1.6, 3.6], fov: 50 }, // backing out, still facing the office
    { p: .705, pos: [-2.5, 3.0, 16.0], tgt: [-1, 2.2, 6],   fov: 48 },   // out to the plaza, turning east
    { p: .73,  pos: [16, 3.4, 17],     tgt: [22, 1.2, 2],    fov: 46 },   // along the front
    { p: .76,  pos: [31, 3.6, 10],     tgt: [19, 1.4, 0],    fov: 44 },   // service yard
    { p: .79,  pos: [26, 12, 9],       tgt: [15, 16.4, 5.6], fov: 44 },   // up the east facade
    { p: .815, pos: [17.6, 17.1, 5.6], tgt: [12, 17.1, 5.6], fov: 52 },   // through the east glass
    { p: .845, pos: [13.9, 17.15, 8.1], tgt: [12.0, 17.4, 5.4], fov: 58 }, // repair, from the window side
    { p: .885, pos: [11.0, 17.6, 8.25], tgt: [12.0, 18.8, 6.8], fov: 44 },// Verify, at the unit
    { p: .912, pos: [13.2, 17.2, 9.4], tgt: [11.6, 16.8, 4.6], fov: 54 },
    { p: .942, pos: [15, 19, 22],      tgt: [6, 13, 0],      fov: 42 },   // out of the bay
    { p: .968, pos: [36, 36, 62],      tgt: [4, 10, -6],     fov: 40 },
    { p: .988, pos: [62, 58, 100],     tgt: [6, 8, -18],     fov: 40 },
    { p: 1,    pos: [80, 72, 124],     tgt: [8, 6, -26],     fov: 40 },   // Portfolio
  ];
  const posC = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal');
  const tgtC = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.tgt)), false, 'centripetal');
  // monotone cubic map p → key index, so speed changes smoothly through every key
  const P = KEYS.map((k) => k.p), N = KEYS.length;
  const slopes = (() => { const d = P.slice(0, -1).map((_, i) => 1 / (P[i + 1] - P[i])); const m = P.map((_, i) => i === 0 ? d[0] : i === N - 1 ? d[N - 2] : (d[i - 1] + d[i]) / 2); return m; })();
  function uAt(p: number) {
    if (p <= 0) return 0; if (p >= 1) return N - 1;
    let i = 0; while (i < N - 2 && p > P[i + 1]) i++;
    const h = P[i + 1] - P[i], t = (p - P[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * i + (t3 - 2 * t2 + t) * h * slopes[i] + (-2 * t3 + 3 * t2) * (i + 1) + (t3 - t2) * h * slopes[i + 1];
  }
  const fovAt = (u: number) => { const i = Math.min(N - 2, Math.floor(u)), t = u - i; const s = t * t * (3 - 2 * t); return THREE.MathUtils.lerp(KEYS[i].fov ?? 40, KEYS[i + 1].fov ?? 40, s); };

  // ---------- anchors and floors for the HTML layer ----------
  const anchors: Record<string, THREE.Vector3> = {
    room: new THREE.Vector3(12.2, L4 + 2.6, HD + .4), valve: new THREE.Vector3().copy(FCU).add(ACT).add(new THREE.Vector3(0, .08, 0)),
    supply: new THREE.Vector3(FCU.x + .82, FCU.y - .02, FCU.z + .1), tag: new THREE.Vector3(FCU.x - .25, FCU.y + .06, FCU.z + .33),
    desk: new THREE.Vector3(ocx - .4, 1.75, ocz + 1.4), van: new THREE.Vector3(24.5, 2.4, -1.5), tech: new THREE.Vector3(),
    site: new THREE.Vector3(0, H + 9, 0),
  };
  const floorQuads = FLOOR_IDS.map((_, f) => { const y0 = f * FH, y1 = (f + 1) * FH, z = HD + .3, x = HW + .3;
    return [new THREE.Vector3(-HW - .3, y0, z), new THREE.Vector3(x, y0, z), new THREE.Vector3(x, y0, -HD - .3), new THREE.Vector3(x, y1, -HD - .3), new THREE.Vector3(x, y1, z), new THREE.Vector3(-HW - .3, y1, z)]; });
  const v = new THREE.Vector3(), clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
  const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const walkFrom = new THREE.Vector3(23.2, 0, .2), walkTo = new THREE.Vector3(YARD_DOOR.x + .5, 0, YARD_DOOR.z);
  const paneClear = (m: THREE.Mesh, cam: THREE.Vector3, axis: 'x' | 'z') => { const d = Math.abs(cam[axis] - (m.position as any)[axis]); (m.material as THREE.MeshStandardMaterial).opacity = .34 * smooth(.6, 3.2, d); };

  function render(p: number): Frame {
    const u = uAt(p), t = u / (N - 1);
    const pos = posC.getPoint(t), tgt = tgtC.getPoint(t);
    const portrait = camera.aspect < .85, outside = pos.z > HD + 1 || pos.x > HW + 1 || pos.y > H + 2;
    if (portrait && outside) { tgt.lerp(new THREE.Vector3(pos.x * .0 + 4, tgt.y, tgt.z * .3), .55); }
    camera.position.copy(pos); camera.lookAt(tgt);
    camera.fov = fovAt(u) * (portrait ? (outside ? 1.55 : 1.3) : 1); camera.updateProjectionMatrix();

    // glass clears only where the camera is passing through it
    paneClear(roomFront, pos, 'z'); paneClear(roomEast, pos, 'x'); paneClear(officeFront, pos, 'z');
    // interiors warm up as the camera approaches
    roomLight.intensity = 9 * smooth(.14, .2, p); officeLight.intensity = 9 * smooth(.55, .59, p) * (1 - smooth(.7, .73, p) * .5);
    // ceiling tiles lift out for inspection, go back after verification
    const lift = smooth(.27, .33, p) * (1 - smooth(.915, .945, p));
    lifted.forEach((l, i) => { const up = smooth(0, .35, lift), side = smooth(.35, 1, lift);
      l.m.position.set(lerp(l.home.x, l.aside.x, side), lerp(l.home.y + up * .12, l.aside.y + .3, side), lerp(l.home.z, l.aside.z + i * .05, side)); l.m.rotation.x = side * 1.35; l.m.rotation.z = side * .05; });
    voidLight.intensity = 3.5 * lift;
    // the unit: alert → replaced → verified
    const replaced = p >= .85; actuatorOld.visible = !replaced; actuatorNew.visible = replaced;
    haloM.color.setHex(p >= .88 ? 0x245B46 : 0xC77D1E); haloM.opacity = (p > .3 && p < .53) || (p > .875 && p < .93) ? .95 : 0; halo.lookAt(camera.position);
    // technician: walks from the van to the service door, then works from the ladder in Room 4.07
    const walking = p >= .7 && p < .772, working = p >= .805 && p < .862, after = p >= .862 && p < .945;
    ladder.visible = p >= .805 && p < .945;
    if (tech) {
      tech.visible = walking || working || after;
      if (walking) { const w = smooth(.7, .77, p); tech.position.lerpVectors(walkFrom, walkTo, w); tech.rotation.y = Math.atan2(walkTo.x - walkFrom.x, walkTo.z - walkFrom.z); if (mixer && walk) { restPose(); walk.enabled = true; mixer.setTime(((p - .7) / .072) * clipDur * 3); } }
      else { if (walk) walk.enabled = false; restPose(); }
      if (working) { tech.position.set(FCU.x - .55, L4 + .05 + .74, FCU.z + .5); tech.rotation.y = Math.PI * .95; }
      if (after) { tech.position.set(13.6, L4 + .05, 4.2); tech.rotation.y = -2.2; }
      reachUp(tech, working && p < .858);
      anchors.tech.set(tech.position.x, tech.position.y + 2.05, tech.position.z);
    }
    if (dispatcher) dispatcher.visible = true;
    beacons.forEach((b, i) => { (b.material as THREE.MeshBasicMaterial).opacity = smooth(.95 + i * .005, .975 + i * .005, p); });

    if (composer) composer.render(); else renderer.render(scene, camera);

    const W = canvas.clientWidth, Hh = canvas.clientHeight;
    const proj = (a: THREE.Vector3) => { v.copy(a).project(camera); return { x: (v.x * .5 + .5) * W, y: (-v.y * .5 + .5) * Hh, ok: v.z < 1 && v.z > -1 }; };
    const out: Anchor[] = Object.entries(anchors).map(([id, a]) => { const q = proj(a); return { id, x: q.x, y: q.y, visible: q.ok && q.x > -20 && q.x < W + 20 && q.y > -20 && q.y < Hh + 20 }; });
    const floors = floorQuads.map((q, i) => { const pts = q.map(proj); return { id: FLOOR_IDS[i], points: pts.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(' '), visible: pts.every((s) => s.ok) && p < .13 }; });
    return { anchors: out, floors };
  }
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); composer?.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize();
  return { render, resize, ready, dispose() { renderer.dispose(); pmrem.dispose(); } };
}
