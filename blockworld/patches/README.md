# [xr] ClassiCube web patches for 若米的方块世界

Base: ClassiCube commit f40534b4 (2026-10-07), BSD-3-Clause.
Apply on a CLEAN checkout: `git checkout -- src && python3 patches/apply_xr_patches.py build/ClassiCube`
(or `git apply patches/0001-xr-blockworld-web.patch`). All changes are tagged `[xr]`.

1. `src/Constants.h` – web build uses same-origin `SKINS_SERVER "/skins"`.
2. `src/webclient/interop_web.js` – texture pack URL from `Module.xrTexturePack`; after IndexedDB sync,
   fetch `Module.xrWorld` into `maps/xr_world.cw`, write `options-default.txt` from `Module.xrDefaultOptions`;
   new `interop_XrHasWorld()` and `interop_XrInteract(x,y,z,block)` (calls `window.xrInteract`).
3. `src/Platform_Web.c` – main_phase2 autoloads `maps/xr_world.cw` when present.
4. `src/InputHandler.c` – left/right click first asks the page (`XR_TryInteract`) whether the targeted block is
   an interactive sign; exports `xr_InteractSelected()` (E key / tap), `xr_Teleport(x,y,z,yaw,pitch)`,
   `xr_ReleaseInput()` (Input_Clear, used when an HTML overlay steals focus).

## Note: block physics disabled (2026-10-08)
ClassiCube's singleplayer block physics (BlockPhysics.c) reads `World.Blocks[]` directly, i.e. only the
low 8 bits of extended block IDs. Custom blocks with ID 266/267 (low byte 10/11 = lava) were therefore
treated as lava and flowed out over the gallery path. Instead of patching the engine, the page ships
`singleplayerphysics=false` in `options-default.txt` (via `Module.xrDefaultOptions`). The world is static
decoration anyway; visitors can still break/place blocks.
