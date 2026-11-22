#!/usr/bin/env python3
"""Apply the minimal [xr] blockworld patches to a ClassiCube checkout (run from repo root).
Preserves each file's line endings. Run on a CLEAN checkout (git checkout -- src); fails loudly if an anchor is missing."""
import sys

def sub(path, old, new):
    raw = open(path, 'rb').read().decode('utf-8')
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    if new in s:
        return
    assert old in s, (path, old[:70])
    s = s.replace(old, new, 1)
    if crlf: s = s.replace('\n', '\r\n')
    open(path, 'wb').write(s.encode('utf-8'))

# 1. same-origin skin server for web builds
sub('src/Constants.h', '#define SKINS_SERVER    "http://cdn.classicube.net/skin"\n',
'''#ifdef __EMSCRIPTEN__
/* [xr] blockworld: skins are served from the same origin, e.g. /skins/<name>.png */
#define SKINS_SERVER    "/skins"
#else
#define SKINS_SERVER    "http://cdn.classicube.net/skin"
#endif
''')

# 2. interop: configurable texture pack URL, bundled world download, interaction bridge
J = 'src/webclient/interop_web.js'
sub(J, "    var url  = '/static/default.zip';",
       "    var url  = Module.xrTexturePack || '/static/default.zip'; // [xr] configurable")
sub(J, '''    _IDBFS_loadFS(function(err) { 
      if (err) window.cc_idbErr = err;
      Module.setStatus('');
      _interop_callVoidFunc('main_phase2');
    });
  },''', '''    _IDBFS_loadFS(function(err) { 
      if (err) window.cc_idbErr = err;
      // [xr] download the bundled world (if any) into maps/ before the game starts
      if (!Module.xrWorld) {
        Module.setStatus('');
        _interop_callVoidFunc('main_phase2');
        return;
      }
      Module.setStatus('Downloading world..');
      _fetchTexturePackAsync(Module.xrWorld,
        function(buffer) {
          try { CCFS.mkdir('maps'); } catch (e) { }
          CCFS.writeFile('maps/xr_world.cw', new Uint8Array(buffer));
          window.xrWorldReady = true;
          Module.setStatus('');
          _interop_callVoidFunc('main_phase2');
        },
        function() {
          Module.setStatus('');
          _interop_callVoidFunc('main_phase2');
        }
      );
    });
  },
  // [xr] world bridge: returns 1 if the bundled world was downloaded
  interop_XrHasWorld: function() { return window.xrWorldReady ? 1 : 0; },
  // [xr] world bridge: returns 1 if the page handled the click (e.g. opened a sign overlay)
  interop_XrInteract: function(x, y, z, block) {
    try { return (window.xrInteract && window.xrInteract(x, y, z, block)) ? 1 : 0; }
    catch (e) { console.error(e); return 0; }
  },''')
sub(J, "  interop_AsyncLoadIndexedDB__deps: ['IDBFS_loadFS'],",
       "  interop_AsyncLoadIndexedDB__deps: ['IDBFS_loadFS', 'fetchTexturePackAsync'],")

# 3. auto load the bundled world in singleplayer
sub('src/webclient/Platform_Web.c', 'EMSCRIPTEN_KEEPALIVE void main_phase2(void) { web_main(); }',
'''extern int interop_XrHasWorld(void);
EMSCRIPTEN_KEEPALIVE void main_phase2(void) {
	/* [xr] singleplayer: auto load the world bundled with the page */
	if (interop_XrHasWorld()) String_AppendConst(&SP_AutoloadMap, "maps/xr_world.cw");
	web_main();
}''')

# 4. interaction bridge: clicks/taps on blocks the page claims (signs, portals) don't break/place
I = 'src/InputHandler.c'
sub(I, 'static void InputHandler_DeleteBlock(void) {', '''#ifdef CC_BUILD_WEB
#include <emscripten.h>
/* [xr] Lets the web page handle clicks on special blocks (signs/portals) */
extern int interop_XrInteract(int x, int y, int z, int block);
static cc_bool XR_TryInteract(void) {
	IVec3 pos = Game_SelectedPos.pos;
	if (!Game_SelectedPos.valid || !World_Contains(pos.x, pos.y, pos.z)) return false;
	return interop_XrInteract(pos.x, pos.y, pos.z, World_GetBlock(pos.x, pos.y, pos.z)) != 0;
}
/* Called from JS (e.g. 'E' key) to interact with the targeted block */
EMSCRIPTEN_KEEPALIVE int xr_InteractSelected(void) { return XR_TryInteract(); }
#else
#define XR_TryInteract() false
#endif

static void InputHandler_DeleteBlock(void) {''')
sub(I, '''	BlockID old;
	/* always play delete animations, even if we aren't deleting a block */''', '''	BlockID old;
	if (XR_TryInteract()) return; /* [xr] */
	/* always play delete animations, even if we aren't deleting a block */''')
sub(I, '''	BlockID old, block;
	pos = Game_SelectedPos.translatedPos;''', '''	BlockID old, block;
	if (XR_TryInteract()) return; /* [xr] */
	pos = Game_SelectedPos.translatedPos;''')
print("xr patches applied")

# 5. page-provided default options (e.g. hide the FPS counter) — written before Options_Load runs
sub(J, '''          CCFS.writeFile('maps/xr_world.cw', new Uint8Array(buffer));''',
'''          CCFS.writeFile('maps/xr_world.cw', new Uint8Array(buffer));
          if (Module.xrDefaultOptions) CCFS.writeFile('options-default.txt', Module.xrDefaultOptions);''')

# 6. JS-callable teleport/look helper (used by the page's "传送" buttons and by headless tests)
sub(I, '''/* Called from JS (e.g. 'E' key) to interact with the targeted block */''',
'''/* Called from JS: move the player and set the view direction (degrees) */
EMSCRIPTEN_KEEPALIVE void xr_Teleport(float x, float y, float z, float yaw, float pitch) {
	struct Entity* e = &Entities.CurPlayer->Base;
	struct LocationUpdate update;
	update.flags = LU_HAS_POS | LU_HAS_YAW | LU_HAS_PITCH;
	update.pos.x = x; update.pos.y = y; update.pos.z = z;
	update.yaw   = yaw; update.pitch = pitch;
	e->VTABLE->SetLocation(e, &update);
}
/* Called from JS (e.g. 'E' key) to interact with the targeted block */''')
print("xr patches 5-6 applied")

# 7. JS-callable input release: when the page opens an overlay, the matching mouseup/keyup never reaches
#    the canvas, so the engine would think the button is still held (and keep clicking / flying down)
sub(I, '''/* Called from JS: move the player and set the view direction (degrees) */''',
'''/* Called from JS when an overlay opens/closes: release all held keys/buttons/touches */
EMSCRIPTEN_KEEPALIVE void xr_ReleaseInput(void) { Input_Clear(); }
/* Called from JS: move the player and set the view direction (degrees) */''')
print("xr patch 7 applied")
