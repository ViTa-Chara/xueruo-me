# blockworld/ — 昊通机械 · 方块厂区 源文件

完整说明在 [`../docs/blockworld/README.md`](../docs/blockworld/README.md)。

- `dist_prod/` = 现在 https://xueruo.me 上的文件（逐字节一致）。本地预览：`cd dist_prod && python3 -m http.server 8787`。
- `gen/build.py` 生成 `site/`；需要的工具链（ClassiCube 源码 + 补丁、emsdk、像素字体）不在仓库里，重建方法见 `docs/blockworld/DEPLOYMENT.md` 第 3 节。
- `classic-site/` = 线上纸页站（/classic/、书库、阅读器）的最新源文件，比仓库根目录那份新。构建时用 `XR_OLD_SITE=blockworld/classic-site`。
- `gifs/a.gif`、`gifs/b.gif` 是指向 `assets/gifs/` 原图的符号链接（build.py 按这个路径读）。
- `hq_poc_ABANDONED/` 已废弃（用户不要光影），只留档。
- `v2/` = 独立的现代方块引擎验证预览（无光影），包含两张小撒原图、薛若米 GIF 和引擎无关的 512 厂区数据。运行说明见 `v2/README.md`，结论见 `../docs/blockworld/ENGINE_E0.md`。不覆盖 `dist_prod/`。
- `gen/*_v1_shark.py`、`gen/skin_shark_old.py`、`gen/index.template.v1.html` 是被否决的第一版，只留档。
