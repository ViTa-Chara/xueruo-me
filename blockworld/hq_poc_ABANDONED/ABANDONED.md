# 已废弃：three.js 光影渲染 PoC

2026-10-08 为“电脑端超高画质 + 光影”需求做的验证：`export.py` 把 `site/world.cw` 和材质包导出成 `world.bin`（uint16 方块数组）+ `world.json` + `terrain.png`，`index.html` 用 three.js（^0.170.0）渲染，`shoot_hq.py` 截图（见 `../shots/hq_poc_*.png`）。

用户随后明确说“那就不用光影了”，**此方向已放弃**。没有复制 `node_modules/`（`npm i` 可恢复）和 `world.bin`（8 MB，可用 export.py 重新导出；export.py 里路径写死为 /workspace/blockworld，并依赖 build/ClassiCube/src/Block.c 与 nbtlib）。
