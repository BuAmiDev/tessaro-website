/**
 * Hero scene: a miniature floor plate built from the eleven Tessaro mosaic tiles.
 * Each tile is an operational piece (cold room, office, resident unit, plant room,
 * technician base, corridors). A robotic assistant (software intelligence)
 * connects the pieces while a human technician does the physical work.
 * One authored sequence, about 14 s, ending in a settled, healthy plate.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TILE_RECTS } from './tiles';

export interface SceneStep { at: number; tile: number; key: string }
export const HERO_STEPS: SceneStep[] = [
  { at: 1.4, tile: 0, key: 'issue' },
  { at: 2.8, tile: 0, key: 'understood' },
  { at: 4.2, tile: 3, key: 'coverage' },
  { at: 5.6, tile: 4, key: 'matched' },
  { at: 7.0, tile: 1, key: 'approval' },
  { at: 8.4, tile: 2, key: 'updated' },
  { at: 9.6, tile: 0, key: 'onsite' },
  { at: 12.0, tile: 0, key: 'recorded' },
];
export const DURATION = 14.2;

export interface HeroOptions {
  canvas: HTMLCanvasElement;
  quality: 'high' | 'low';
  onStep?: (index: number) => void;
  onLabel?: (key: string | null, x: number, y: number) => void;
  onEnd?: () => void;
}

const C = {
  stage: 0x141b19, porcelain: 0xeef0ec, porcelainTop: 0xf6f7f4, seam: 0x2a3531,
  steel: 0xb9c0bc, steelDark: 0x7d8783, emerald: 0x0b8457, emeraldBright: 0x2bc48a,
  amber: 0xf2b54a, ink: 0x1c2522, skin: 0xc79a74, vest: 0x2b6cb0,
};

const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export function createHeroScene(o: HeroOptions) {
  const low = o.quality === 'low';
  const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: !low, alpha: true, powerPreference: low ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const camTarget = new THREE.Vector3(0, 0.9, 0);

  // Lights: soft key from upper left, cool fill, emerald rim from behind
  scene.add(new THREE.HemisphereLight(0xdfe8e3, 0x1a2420, 0.7));
  const key = new THREE.DirectionalLight(0xfff6ea, 2.2);
  key.position.set(-6, 11, 7);
  key.castShadow = !low;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  key.shadow.radius = 4; key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.PointLight(C.emeraldBright, 6, 14, 1.8); rim.position.set(5, 3, -6); scene.add(rim);

  // Materials
  const mPorcelain = new THREE.MeshStandardMaterial({ color: C.porcelain, roughness: 0.62, metalness: 0 });
  const mPorcelainTop = new THREE.MeshStandardMaterial({ color: C.porcelainTop, roughness: 0.5, metalness: 0 });
  const mEmerald = new THREE.MeshStandardMaterial({ color: 0x05563A, roughness: 0.62, metalness: 0.05 });
  const mSteel = new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.32, metalness: 0.85 });
  const mSteelDark = new THREE.MeshStandardMaterial({ color: C.steelDark, roughness: 0.4, metalness: 0.7 });
  const mInk = new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.55, metalness: 0.2 });
  const mGlow = new THREE.MeshStandardMaterial({ color: C.emeraldBright, emissive: C.emeraldBright, emissiveIntensity: 1.6, roughness: 0.3 });
  const mBase = new THREE.MeshStandardMaterial({ color: 0x1f2a26, roughness: 0.8, metalness: 0.1 });

  // Floor plate: base slab plus the eleven tiles
  const plate = new THREE.Group(); scene.add(plate);
  const S = 0.1; // 104 units -> 10.4 world units
  const base = new THREE.Mesh(new RoundedBoxGeometry(10.9, 0.35, 10.9, 2, 0.06), mBase);
  base.position.y = -0.25; base.receiveShadow = true; plate.add(base);

  const heights = [0.55, 0.42, 0.42, 0.5, 0.3, 0.28, 0.26, 0.22, 0.22, 0.22, 0.22];
  const tiles: THREE.Group[] = [];
  const centers: THREE.Vector3[] = [];
  TILE_RECTS.forEach(([x, y, w, h], i) => {
    const g = new THREE.Group();
    const hh = heights[i];
    const geo = new RoundedBoxGeometry(w * S - 0.04, hh, h * S - 0.04, low ? 1 : 3, 0.07);
    const mesh = new THREE.Mesh(geo, i === 0 ? mEmerald : mPorcelain);
    mesh.position.y = hh / 2 - 0.08; mesh.castShadow = !low; mesh.receiveShadow = true;
    g.add(mesh);
    const cx = (x + w / 2 - 52) * S, cz = (y + h / 2 - 52) * S;
    g.position.set(cx, 0, cz);
    g.userData = { top: hh - 0.08, w: w * S, d: h * S, settle: (i % 3 - 1) * 0.06 };
    plate.add(g); tiles.push(g); centers.push(new THREE.Vector3(cx, hh - 0.08, cz));
  });
  plate.rotation.y = 0.62 - Math.PI / 4; // camera looks along the plate diagonal

  // Props on tiles
  const add = (tile: number, mesh: THREE.Object3D, dx = 0, dz = 0) => { const t = tiles[tile]; mesh.position.x += dx; mesh.position.z += dz; mesh.position.y += t.userData.top; t.add(mesh); mesh.traverse((m: any) => { if (m.isMesh) { m.castShadow = !low; m.receiveShadow = true; } }); return mesh; };
  // 0: cold room with two freezer cabinets
  const freezer = (dx: number) => { const f = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.2, 0.7, 2, 0.05), mSteel); body.position.y = 0.6; f.add(body);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.02, 0.6), mPorcelainTop); door.position.set(0, 1.21, 0); f.add(door);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.02), mInk); strip.position.set(0, 1.0, 0.36); f.add(strip);
    return add(0, f, dx, -0.6); };
  freezer(-0.7); freezer(0.5);
  // 1: office desk with screen (approvals)
  { const d = new THREE.Group(); const top = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.08, 0.7, 1, 0.02), mPorcelainTop); top.position.y = 0.55; d.add(top);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.06), mSteelDark); leg.position.y = 0.27; d.add(leg);
    const scr = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.45, 0.04, 1, 0.02), mInk); scr.position.set(0, 0.85, -0.2); d.add(scr);
    add(1, d, 0, 0.6); }
  // 2: resident unit with sofa block and wall AC
  { const u = new THREE.Group(); const sofa = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.35, 0.55, 2, 0.08), mSteelDark); sofa.position.y = 0.18; u.add(sofa);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.08), mPorcelainTop); wall.position.set(0, 0.45, -1.2); u.add(wall);
    const ac = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.25, 0.2, 2, 0.05), mSteel); ac.position.set(0.3, 0.75, -1.08); u.add(ac);
    add(2, u, 0, 0.3); }
  // 3: plant room with two chillers (contracts and coverage)
  for (const dx of [-1.1, 0.2]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.4, low ? 12 : 24), mSteel); ch.rotation.z = Math.PI / 2; ch.position.y = 0.36; add(3, ch, dx + 0.4, 0); }

  // Rooms read as rooms: low walls on two edges of each room tile, and thin floor seams on corridors
  const mWall = new THREE.MeshStandardMaterial({ color: 0xe2e6e1, roughness: 0.7 });
  [0, 1, 2, 3].forEach((i) => {
    const { w, d, top } = tiles[i].userData; const wh = i === 0 ? 0.9 : 0.6;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, wh, 0.07), mWall); back.position.set(0, top + wh / 2, -d / 2 + 0.08);
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.07, wh, d - 0.1), mWall); side.position.set(-w / 2 + 0.08, top + wh / 2, 0);
    [back, side].forEach((m) => { m.castShadow = !low; m.receiveShadow = true; tiles[i].add(m); });
  });
  [7, 8, 9, 10].forEach((i) => { const { w, top } = tiles[i].userData; const seam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.01, 0.04), mSteelDark); seam.position.y = top + 0.005; tiles[i].add(seam); });

  // Technician (a person, deliberately simple)
  const tech = new THREE.Group();
  { const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.32, 4, 8), mInk); legs.position.y = 0.27; tech.add(legs);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.28, 4, 10), new THREE.MeshStandardMaterial({ color: C.vest, roughness: 0.6 })); torso.position.y = 0.66; tech.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: C.skin, roughness: 0.7 })); head.position.y = 0.98; tech.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mEmerald); cap.position.y = 1.0; tech.add(cap);
    tech.traverse((m: any) => { if (m.isMesh) m.castShadow = !low; }); }
  tech.scale.setScalar(1.25);
  plate.add(tech);
  // Technician path: base tile 4 -> down the left column -> along the bottom row -> up to the cold room
  const pathPts = [
    [centers[4].x, centers[4].z], [centers[5].x, centers[5].z], [centers[6].x, centers[6].z], [centers[10].x, centers[10].z],
    [centers[9].x, centers[9].z], [centers[8].x, centers[8].z], [centers[7].x, centers[7].z], [centers[3].x + 1.6, centers[3].z], [centers[0].x + 0.2, centers[0].z + 1.2],
  ].map(([x, z], i) => new THREE.Vector3(x, i < 3 ? 0.22 : i < 7 ? 0.14 : 0.42, z));
  const walk = new THREE.CatmullRomCurve3(pathPts, false, 'centripetal', 0.2);

  // Robot assistant: brushed-steel capsule, emerald visor, rotating halo, one probe arm
  const robot = new THREE.Group();
  { const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.42, 8, low ? 16 : 32), mSteel); robot.add(body);
    const visor = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.36, 4, 16), mInk); visor.rotation.z = Math.PI / 2; visor.position.set(0, 0.24, 0.32); visor.scale.set(1, 1, 0.55); robot.add(visor);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.02), mGlow); eye.position.set(0, 0.25, 0.44); robot.add(eye); robot.userData.eye = eye;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.025, 8, low ? 48 : 96), mSteelDark); halo.rotation.x = Math.PI / 2.3; robot.add(halo); robot.userData.halo = halo;
    const arm = new THREE.Group(); const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 10), mSteelDark); seg.position.y = -0.25; arm.add(seg);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), mGlow); tip.position.y = -0.52; arm.add(tip);
    arm.position.set(0.32, -0.25, 0.1); arm.rotation.z = 0.5; robot.add(arm); robot.userData.arm = arm;
    robot.traverse((m: any) => { if (m.isMesh) m.castShadow = !low; }); }
  robot.scale.setScalar(1.35);
  plate.add(robot);
  const robotHome = new THREE.Vector3(-2.6, 3.1, 1.6);
  robot.position.copy(robotHome);

  // Status pins over key tiles: grey (unknown), amber (attention), green (healthy)
  const pinTiles = [0, 1, 2, 3, 4];
  const pins = pinTiles.map((i) => {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mSteelDark); stem.position.y = 0.25; g.add(stem);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9aa39f, emissive: 0x000000, roughness: 0.3, metalness: 0.2 });
    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), mat); head.position.y = 0.6; g.add(head);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 6, 32), new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; g.add(ring);
    const c = centers[i]; g.position.set(c.x + (i === 0 ? 1.4 : i === 3 ? -1.6 : 0.7), c.y + (i === 0 ? 0 : 0), c.z + (i === 0 ? 1.2 : -0.3));
    plate.add(g); return { g, mat, head, ring };
  });

  // Connection arcs from the robot to tiles, drawn progressively
  const arcMat = new THREE.MeshBasicMaterial({ color: C.emeraldBright, transparent: true, opacity: 0.9 });
  type Arc = { mesh: THREE.Mesh; total: number; tile: number; at: number };
  const arcs: Arc[] = [];
  function makeArc(tile: number, at: number, from: THREE.Vector3) {
    const to = centers[tile].clone().add(new THREE.Vector3(0, 0.6, 0));
    const mid = from.clone().lerp(to, 0.5); mid.y += 1.4;
    const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to);
    const geo = new THREE.TubeGeometry(curve, 48, 0.022, 6, false);
    const mesh = new THREE.Mesh(geo, arcMat); mesh.geometry.setDrawRange(0, 0); plate.add(mesh);
    arcs.push({ mesh, total: geo.index ? geo.index.count : 0, tile, at });
  }
  const robotWork = new THREE.Vector3(centers[0].x - 1.0, 2.6, centers[0].z + 2.0);
  [[0, 2.8], [3, 4.2], [4, 5.6], [1, 7.0], [2, 8.4]].forEach(([t, at]) => makeArc(t, at, robotWork));

  // Evidence card that travels back to the robot
  const card = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.04, 0.36, 1, 0.02), mPorcelainTop); card.visible = false; plate.add(card);
  const cardCheck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), mGlow); cardCheck.position.y = 0.03; card.add(cardCheck);

  // Approval token above the office
  const token = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: C.amber, emissive: C.amber, emissiveIntensity: 0.5, roughness: 0.3 }));
  token.position.copy(centers[1]).add(new THREE.Vector3(-0.6, 1.4, 0)); token.visible = false; plate.add(token);

  // Sizing
  let width = 1, height = 1;
  function resize() {
    const r = o.canvas.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false); camera.aspect = width / height;
    const portrait = camera.aspect < 1;
    camera.fov = portrait ? 38 : 30; camera.updateProjectionMatrix();
  }
  resize();

  // Timeline
  let t = 0, playing = false, last = 0, raf = 0, stepIdx = -1, ended = false;
  const tmpV = new THREE.Vector3();
  const green = new THREE.Color(C.emeraldBright), amber = new THREE.Color(C.amber), grey = new THREE.Color(0x9aa39f);

  function pose(time: number) {
    // Camera: slow, small orbit for depth
    const ang = 0.62 + Math.sin(time * 0.18) * 0.05;
    const dist = camera.aspect < 1 ? 25.5 : camera.aspect < 1.2 ? 23.5 : 21;
    camera.position.set(Math.sin(ang) * dist, dist * 0.82, Math.cos(ang) * dist);
    camera.lookAt(camTarget);

    // Robot path: home -> over cold room -> hover while connecting -> back up at end
    const go = ease(clamp01((time - 1.8) / 1.0));
    const back = ease(clamp01((time - 12.6) / 1.2));
    robot.position.lerpVectors(robotHome, robotWork, go).lerp(new THREE.Vector3(robotWork.x - 0.6, 3.4, robotWork.z - 0.8), back);
    robot.position.y += Math.sin(time * 2.1) * 0.06;
    robot.rotation.y = Math.sin(time * 0.7) * 0.25 + go * -0.6;
    robot.userData.halo.rotation.z = time * 0.9;
    const scanning = time > 2.6 && time < 3.6;
    robot.userData.arm.rotation.z = 0.5 + (scanning ? Math.sin(time * 8) * 0.25 : 0);
    (robot.userData.eye.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + (time > 1.4 && time < 12 ? Math.sin(time * 6) * 0.4 : 0);

    // Pins
    pins.forEach((p, k) => {
      const i = pinTiles[k];
      let col = grey, pulse = 0;
      if (i === 0) { if (time > 1.4) { col = amber; pulse = 1; } if (time > 12.0) { col = green; pulse = 0; } }
      else if (i === 1) { if (time > 7.0) { col = amber; pulse = 0.6; } if (time > 7.9) { col = green; pulse = 0; } }
      else if (i === 3) { if (time > 4.2) col = green; }
      else if (i === 4) { if (time > 5.6) col = green; }
      else if (i === 2) { if (time > 8.4) col = green; }
      if (time > 12.8) col = green;
      p.mat.color.copy(col); p.mat.emissive.copy(col).multiplyScalar(col === grey ? 0 : 0.6);
      p.head.rotation.y = time * 1.2 + k;
      const ph = (time * 1.4) % 1;
      p.ring.scale.setScalar(1 + ph * 1.6); (p.ring.material as THREE.MeshBasicMaterial).opacity = pulse * (1 - ph) * 0.9;
    });

    // Arcs draw in, then fade after the tile resolves
    arcs.forEach((a) => {
      const k = clamp01((time - a.at) / 0.7);
      a.mesh.geometry.setDrawRange(0, Math.floor(a.total * ease(k)));
      a.mesh.visible = k > 0 && time < 12.4;
    });
    arcMat.opacity = time > 11.6 ? Math.max(0, 0.9 - (time - 11.6) * 1.2) : 0.9;

    // Approval token
    token.visible = time > 7.0 && time < 8.6;
    (token.material as THREE.MeshStandardMaterial).color.copy(time > 7.9 ? green : amber);
    (token.material as THREE.MeshStandardMaterial).emissive.copy(time > 7.9 ? green : amber);
    token.rotation.y = time * 2;

    // Technician walks to the cold room
    const w = ease(clamp01((time - 8.8) / 2.6));
    walk.getPointAt(w, tmpV); tech.position.copy(tmpV);
    const ahead = walk.getPointAt(Math.min(1, w + 0.01));
    if (w < 1) tech.lookAt(ahead.x, tech.position.y, ahead.z);
    tech.position.y += w > 0 && w < 1 ? Math.abs(Math.sin(time * 9)) * 0.04 : 0;

    // Evidence card flies from the cold room to the robot
    const cf = clamp01((time - 11.6) / 0.9);
    card.visible = cf > 0 && cf < 1;
    if (card.visible) { card.position.copy(centers[0]).add(new THREE.Vector3(0.2, 0.9, 1.0)).lerp(robot.position, ease(cf)); card.position.y += Math.sin(cf * Math.PI) * 0.8; card.rotation.y = cf * 3; }

    // Settle: every tile levels into the same plane, lifting slightly together
    const st = ease(clamp01((time - 12.6) / 1.2));
    tiles.forEach((g) => { g.position.y = g.userData.settle * (1 - st) + st * 0.04; });
  }

  function emitLabel(time: number) {
    if (!o.onLabel) return;
    const s = [...HERO_STEPS].reverse().find((x) => time >= x.at);
    if (!s || time > DURATION - 0.6) { o.onLabel(null, 0, 0); return; }
    tmpV.copy(centers[s.tile]).add(new THREE.Vector3(0, 1.2, 0));
    plate.localToWorld(tmpV); tmpV.project(camera);
    o.onLabel(s.key, (tmpV.x * 0.5 + 0.5) * width, (-tmpV.y * 0.5 + 0.5) * height);
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (playing) t += dt;
    if (t >= DURATION) { t = DURATION; playing = false; if (!ended) { ended = true; o.onEnd?.(); } }
    pose(t);
    const idx = HERO_STEPS.reduce((acc, s, i) => (t >= s.at ? i : acc), -1);
    if (idx !== stepIdx) { stepIdx = idx; o.onStep?.(idx); }
    emitLabel(t);
    renderer.render(scene, camera);
    if (playing) raf = requestAnimationFrame(frame); else raf = 0;
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  pose(0); renderer.render(scene, camera);

  return {
    play() { if (ended) { t = 0; ended = false; } playing = true; kick(); },
    pause() { playing = false; },
    replay() { t = 0; ended = false; playing = true; kick(); },
    seek(time: number) { t = Math.max(0, Math.min(DURATION, time)); ended = t >= DURATION; kick(); },
    get playing() { return playing; },
    get time() { return t; },
    resize() { resize(); kick(); },
    renderStill(time: number) { t = time; pose(time); renderer.render(scene, camera); emitLabel(time); },
    dispose() { cancelAnimationFrame(raf); renderer.dispose(); pmrem.dispose(); },
  };
}
