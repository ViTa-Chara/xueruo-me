# 昊通机械 · 巨型方块厂区 扩建方案 (v1, 2026-10-08 11:30)

Engine: keep ClassiCube (old-school blocky) on BOTH desktop and mobile. No three.js tier.
Layout image: /workspace/blockworld/shots/park_layout.png  (generator: plan/layout.py)

## 1. Map size (measured, headless Chrome, current build)
| size | cells | wasm heap after load | note |
|---|---|---|---|
| 256x64x256 (now) | 4.2M | 51 MB | live today |
| 512x96x512 | 25M | 103 MB | recommended, OK on phones |
| 768x128x768 | 75M | 224 MB | desktop ok, risky iOS Safari |
| 1024x128x1024 | 134M | 365 MB | too big for mobile |
- .cw dims are U16 (no hard cap); cost = 2 bytes/cell (BlockArray + BlockArray2 for IDs>255) + meshes.
- gzip: current 256 world = 60 KB; a dense 512 park estimated 1-3 MB (fine).
- Recommendation: ONE world 512x96x512 for both. Per-device options-default.txt:
  desktop viewdist 256-512 + gfx-smoothlighting=true (+ maybe gfx-lightingmode=fancy, coloured lamp light — test);
  mobile viewdist 96, smooth lighting off. Spawn at the south gate plaza.

## 2. Block IDs / texture atlas
- Web build has EXTENDED_BLOCKS (IDs 0-767; 66 core -> 701 custom) and EXTENDED_TEXTURES (atlas 16x32 = 512 tiles). Only ONE terrain.png; no multiple sheets.
- Today: 380 custom IDs / 381 tiles used — 370 of them are signage/images (News 140, GIF 67, nameplates/books/portals/welcome ~135). Materials use only ~10.
- Strategy:
  a) Signs: in-world show title+date only (small boards); full text in the HTML overlay -> frees ~150 IDs/tiles.
  b) Latin/digit pixel-font glyph blocks (~40 tiles) for unlimited labels (HALL A, CNC-05, 1#).
  c) Material library ~120 blocks (steel plate, checker plate, concrete, asphalt+markings, glass curtain wall, corrugated cladding, machine casings in 6 paint colours, control panels, pipes, vents, cable tray, grating...).
  d) Shapes (BlockDefinitions bounding boxes: slabs, posts, thin rails, pipes, panels) reuse tiles; cost IDs only.
  e) Repurpose unused default tiles (ores, wool etc.) in our own texture pack.
  f) If still short: 1-line patch ATLAS2D_MAX_ROWS_COUNT 32->64 (1024 tiles; TextureLoc is u16, cw stores hi byte) and/or BLOCK_MAX_DEFINED 0x2FF->0x3FF (World.IDMask is already 0x3FF). Needs a test build.
- Physics stays off (IDs>255 otherwise become lava — known engine quirk).

## 3. Generator architecture
gen/park/: zones.py (layout rects as data) -> roads.py -> buildings.py (shell: walls/columns/roof/windows/doors by style)
-> prefabs/*.py (machines as parametric functions: lathe, 5-axis, gantry mill, grinder, EDM, laser, press brake, weld robot cell, CMM, AS/RS racks+stacker, truck, forklift, overhead crane, gantry crane, transformer, water tower)
-> placer (grid rows of machines with aisles + yellow floor lines) -> props/greenery -> signage -> content (news/library/portals/GIFs) -> write_cw + texpack + world.json (signs, NPC paths, items).
Deterministic seed; each prefab declares footprint + materials so budgets are checked at build time (assert IDs/tiles).

## 4. New features (engine patches, minimal, documented in patches/)
- Held tools/weapons: sprite-draw blocks render flat in hand (HeldBlockRenderer) -> wrench, hammer, welding torch, "laser" as non-placeable sprite blocks. Hook in existing XR click patch: if held is a tool, consume click, play swing (existing dig animation) + particles. Melee: Entities_GetClosest() ray vs entity box -> knockback/hit flash/JS event. Effort 2-3 h.
- NPCs/mobs: singleplayer has the entity system (255 slots) but no server. Patch exports xr_NpcSpawn/xr_NpcMove/xr_NpcModel/xr_NpcRemove using NetPlayer + NetInterpComp (smooth walk + walk animation for free). JS "director" drives scripted paths from world.json: workers patrolling, standing at machines, forklifts/AGVs on loops, crane trolley moving. Skins same-origin (/skins/). Vehicles/robot arms via CustomModels (64 models x 64 box parts, simple anims; web build has CUSTOM_MODELS) by injecting DefineModel/DefineModelPart packets in-process, or block-as-model for crates. Budget 40-80 NPCs on mobile. Effort 5-7 h.
- Backpack/inventory: built-in inventory works on web (B key) and mobile (hotbar "..." button, Widgets.c). Flat grid only; order settable via Inventory.Map (patch export, since .cw has no inventory order). Plus our own HTML backpack (tabs: 材料/机械/标识/工具, icons rendered by generator) calling xr_SetHotbar(slot,id). Effort 2-3 h.

## 5. Phases (agent work time, estimates)
P0 patches: atlas/ID headroom test, NPC + tool + inventory exports, per-device options (2-3 h)
P1 generator refactor + 512 map + zoning/roads + relocate existing entrance content (3-4 h)
P2 material library + buildings + megastructures (总装车间, 立体仓库, 龙门吊, 总部大楼) (4-6 h)
P3 machine prefabs (15 types) placed in halls + yard/docks/trucks (4-6 h)
P4 NPC director + forklift/AGV/crane models (4-6 h)
P5 tools/melee + HTML backpack (3-4 h)
P6 mobile perf pass, headless verification, preview deploy to 101.132.143.85 (2-3 h)
Total ~22-32 h, delivered as previews after P2, P3, P5.

## 6. Risks
- iOS Safari memory: 512 world ~100 MB OK; NPC count and viewdist must be capped on mobile.
- Atlas/ID patches (1024 tiles / 1024 IDs) untested -> fall back to signage diet.
- CustomModel injection in singleplayer touches Protocol internals; fallback = humanoid NPCs + block-models.
- Realism at 1-block resolution: machines ~3-8 blocks; shapes help but this is still blocky.
- Engine upgrades require reapplying patches (kept small, scripted).
