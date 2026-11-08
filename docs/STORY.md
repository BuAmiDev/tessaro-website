# Opening story (v5): one continuous real-time 3D journey

The opening is a persistent Three.js world. One renderer and one camera stay alive through all eight chapters. The camera travels a single spline through:

1. the plaza;
2. up to Level 4, through the glass of Room 4.07's bay;
3. up to the fan coil unit in the opened ceiling, then around it;
4. back out of the bay and down the facade;
5. into the operations office;
6. out along the plaza to the service entrance, following the technician;
7. up the east facade into the same room, for the repair and verification at the same unit;
8. out and up over the estate.

Progress is continuous (0–1). Everything visible is a pure function of progress: camera, people, ceiling tiles, actuator state, readings, record, captions and app views. Stopping anywhere leaves a valid intermediate view, and reverse scrolling retraces the route exactly.

## What is real-time and what is pre-made

| Part | How it is made |
|---|---|
| Building, plaza, landscaping, Room 4.07, ceiling void, office, service yard, estate | Real-time 3D (`src/story/scene.ts`). Procedural architecture in metres, with canvas textures for limestone, pavers, oak, carpet, plaster, ceiling tiles, galvanised steel, concrete and the shutter. Lighting is a low warm sun with soft shadows, sky light and image-based reflections from a generated sky. Ambient occlusion (N8AO) and SMAA run on desktop. |
| Palms, olive planters, van, meeting chairs, dispatcher | 3D models converted from generated reference images (Higgsfield image-to-3D), compressed with meshopt and WebP textures (`public/story/3d/*.glb`) |
| Technician | Rigged 3D model with a walk cycle. The walk is driven by scroll progress, and the poses for reaching into the ceiling are set on the rig in code. |
| Fan coil unit FCU-L4-07 | Detailed procedural model: casing, return grille, spigot and flexible duct, hangers, insulated chilled-water pipes, brass valve, actuator (failed and new versions), condensate drain, asset tag. It is modelled, not scanned, so the actuator can be replaced in the story. |
| Office wall display and monitors | Texture of the real prototype dispatch board (W-026), with generic data |
| Floor picker | Six floor outlines projected from the 3D floors every frame, mirrored by six buttons (hover, focus, touch) |
| Labels | HTML labels projected from 3D points (valve, supply duct, asset tag, dispatcher, technician, van, site). They flip sides or hide rather than cover the record or app views. |
| App views in the hero | Real prototype screens exported without device chrome, status bar or background. Only the app's own cards remain, on a transparent root. The site supplies the glass: backdrop blur of the live scene, a faint tint, an edge highlight, a soft shadow, a slight tilt and a gentle float. Nothing fades the whole screenshot. |
| Poster | First frame of the same 3D scene (`public/story/3d/poster-{l,p}.webp`), shown until the canvas is ready, so the hand-over is invisible |

## Navigation

- **Scroll** drives progress directly. Chapter boundaries only update captions and task state.
- **Chapter buttons, floor picker and Replay** travel along the same path. Duration scales with distance, from 0.9 s to 4.2 s, with eased start and stop. A wheel, touch or key input interrupts travel at the current camera position.
- **Path smoothness:** the camera moves on a centripetal Catmull-Rom spline. Progress maps to the key index through a monotone cubic, so velocity is continuous through every key. Turning rate is measured numerically. The worst remaining pivot is about 36° per 1% of progress, down from 188° before the route was re-choreographed (for example, the camera now backs out of the office before turning).
- **Glass the camera passes through** (Room 4.07's front and east panes, the office front) clears only within the last few metres of approach. It is not used to hide a cut.

## Modes

| Mode | When | Behaviour |
|---|---|---|
| Live | WebGL available | Full journey. Desktop runs the high profile (shadow map 4096, AO, SMAA, pixel ratio up to 1.75). Phones and low-power devices run the low profile (no AO, shadow map 1024, pixel ratio up to 1.15) in the same scene. |
| Static | `prefers-reduced-motion` | Same 3D scene, rendered at each chapter's position, with Previous/Next. No camera travel. |
| Stills | No WebGL | Explicitly separate fallback: one rendered still per chapter (`public/story/v4/*`), labelled in the overview |

## Loading

- The poster (the scene's own first frame) paints immediately.
- The scene boots after the page `load` event. All models load before the canvas is revealed, so nothing pops in.
- Models total about 6.6 MB (palm 1.4, olive 1.2, van 0.9, technician 0.9, dispatcher 0.6, chair 0.3). Textures are 1024 px WebP, 512 px for chairs.

## Continuity rules

- **Same event throughout:** Harbour Point, Level 4, Room 4.07, FCU-L4-07, WO-2611-0418, Rami S., Lina K.
- **Floors:** G, then L1–L5. Level 4 is the second band from the top.
- **Order of states:**
  1. the requester's "technician booked" view appears in the Office chapter;
  2. the technician sees the job while walking from the van;
  3. scan, photo and completion happen in the room;
  4. the actuator is replaced (p 0.85);
  5. the repair is verified (0.88);
  6. the requester's "Work completed" view appears (0.885);
  7. sign-off is recorded (0.91).

  `tests/e2e/story.py` checks that completion never shows before the evidence.

## Remaining production work (honest gaps)

- **Realism ceiling:** this is a real-time architectural model with good light and materials, not an offline photoreal render.
- **Recommended for launch:** a modelled facade and interiors (Blender to glTF) with baked lightmaps for the room, office and lobby, plus physically measured materials. That would close the remaining gap to the Floor Picker reference while keeping this camera route and controller.
- **Converted models:** they are approximations. The van, palms and people hold up at the distances used. A close-up of a person would need a proper character asset.
- **HVAC check:** an engineer should check the fan coil assembly (valve type, actuator, pipe sizes).
- **Performance:** real-device GPU measurement on mid-range phones is still to do. The lab machine has no GPU (software rendering).
