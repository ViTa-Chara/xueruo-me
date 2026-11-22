# 现状（交接于 2026-10-08 11:30；本地续作见下）

## 本地续作：E0 选型原型（2026-10-08）

用户已要求阅读规划并继续执行，同时明确：两张新白发 PNG 是昊通机械的小撒，原有鲨鱼服 GIF 是薛若米。新原图和身份对应已保存到 `blockworld/assets/characters/`，四张原图已接入新预览入口及画廊，文件哈希校验通过。

独立预览源码在 `blockworld/v2/`，构建目录 `blockworld/v2/dist/`。有 Three.js + Worker、noa + Babylon.js 两套新候选及 ClassiCube 同建筑基线，共用 512×96×512 / 17 区数据，接入中文背包、工人和车辆、真实公告/书库与文字版。它仍是 E0 原型，特殊方块形状、设备细节和真机验收未完成，不能把最终扩建清单标记为全部通过。

[E0 对比报告](ENGINE_E0.md) 保存测量方法、实测表、截图和边界。当前本机 [对比页](http://127.0.0.1:8790/compare.html) 可玩；服务停止后按 `blockworld/v2/README.md` 重启。规划书 4.4 节要求由用户拍板选引擎，建议 Three.js + Worker，但尚未替用户定案。

**线上、服务器副本与旧 `dist_prod` 未变；没有提交、推送或远程部署。下文仍是交接时线上状态。**

## 1. 线上是什么

「昊通机械 · 方块厂区」：xueruo.me 首页打开就是一个复古方块世界（ClassiCube 网页版），电脑和手机（触屏摇杆）都能玩。
截图见 `blockworld/shots/ht_prod_*.png`（`ht_prod_m_*` 是手机）。

### 世界内容（256 × 64 × 256，地面高度 T=36，出生点 (128, 38, 134) 朝北）

| 位置（方块坐标） | 内容 | 交互 |
|---|---|---|
| 出生广场 x108–148, z108–148 | 花纹钢板地面、黄黑警示边、4 根工业灯柱、出生标记 | — |
| 广场北侧 z≈114 | 欢迎牌（操作说明） | 点开 = 欢迎卡片 |
| 北 z≈98 | `HAOTONG` 黄色立体方块大字 + 「昊通机械 HAOTONG MACHINE」铭牌 + 3 个齿轮 | 点开 = 品牌介绍，链接 `/classic/` |
| 左 x104–110, z115 | 用户 GIF A（鲨鱼帽·法棍散步）7×6 格动画广告牌 | 点开 = 原图 `/media/shark-baguette.gif` |
| 右 x147–151, z115 | 用户 GIF B（鲨鱼帽·抱猫）5×5 格动画广告牌 | 点开 = 原图 `/media/shark-cat.gif` |
| 东 x149–252, z124–132 | 厂区公告长廊：传送带 + 7 块工业公告牌（`content/news/*.md`，全是真实动态） | 点开 = 全文 + 链接 |
| 西 x78–99, z112–144 | 一号车间：锯齿屋顶厂房、烟囱、4 台简易机床、传送带 | 点开 = 车间介绍 |
| 东北 (182,108) | 塔吊（带吊钩和货箱） | — |
| 南 x112–144, z156–176 | 红砖苏式「开发部大楼」，一层资料室：3 本书（封面是渲染贴图） | 点书 = 简介 + `/read.html?book=<id>` |
| 南 z150 | 4 个传送控制台：bilibili（space.bilibili.com/204339779）、GitHub（@ViTa-Chara）、旧版主页 `/classic/`、文字版 `#text` | 点 = 跳转 |

- 玩家皮肤：`site/skins/xueruomi.png`（64×32 Classic 皮肤，`gen/skin.py` 手绘像素）：HT 黄色安全帽、荧光橙反光背心、藏青工装，保留黑发蓝挑染和眼镜。
- 昊通机械品牌：**自制**（网上没有找到昊通机械的官方 logo，搜到的都是重名公司）。HT 齿轮标、黄黑配色由 `build.py: make_logo()` 生成，在 `media/ht-logo.png`。用户如果给正式 logo 可以替换。
- 页面层（`gen/index.template.html`）：加载进度条、帮助/文字版按钮、点击告示牌弹出的 HTML 卡片、文字版 `#text`（所有动态 + 书目，`<noscript>` 和无 WebGL 时自动显示）、页脚署名（ClassiCube BSD-3、缝合像素字体 OFL）。
- `world.json`：所有可交互物体的列表 `{version: 2, items: [{kind, box:[x0,y0,z0,x1,y1,z1], title, body, url, cta, id?, date?, img?}]}`，kind ∈ news(7) / info(4) / link(4) / book(3) / media(2)。页面根据引擎回调的方块坐标在这里查找。

### 站点文件结构（dist_prod = 线上）

```
index.html            方块世界页面（模板 + 新闻/书目列表）
world.cw / world.json 世界（ClassicWorld NBT, gzip）/ 交互物体表
static/ClassiCube.js, ClassiCube.wasm, default.zip（材质包：ClassiCube 自带材质放大到 64px + 自制工业材质 + 动画帧）
media/                两张 GIF 原图、ht-logo
skins/xueruomi.png    玩家皮肤（同源加载）
classic/index.html    旧纸页主页（路径改成 ../）
library.html read.html css/ js/ data/ ruomi.png   书库与阅读器（原样）
tools/ NOVEL_SOURCE_PACK.md README.md robots.txt  旧站带过来的文件（保证整目录部署后不丢）
```

注意：`tools/`（小说生成脚本）和 `NOVEL_SOURCE_PACK.md` 在旧站时期就是公开部署的，这次只是保留，没有新增公开内容。

## 2. 代码怎么组织

- `gen/build.py`（约 830 行，单文件）：numpy 数组 `[y, z, x]` 存方块 → 地形（Perlin）→ 材质与自定义方块 → 各建筑函数（`plaza / title_wall / workshop / gif_billboards / tower_crane / gallery / library / portal / welcome`）→ 写 `world.cw`（自己写的 NBT/ClassicWorld 写入器，含 CPE BlockDefinitions、ClickDistance=12 格）→ 写材质包 `default.zip`（含动画条带打包）→ 写 `world.json` → 复制引擎和旧站 → 填模板。
- 中文显示的唯一办法：用像素字体把文字**渲染成图片贴图**，切成 64×64 的格子，每格一个自定义方块（`textured_panel`）。所以每块告示牌都很“贵”。
- GIF 动画：每一格是一个自定义方块，贴图用材质包动画（`animations.txt`）逐帧播放（`animated_panel`）。
- `gen/skin.py`：皮肤；`gen/shoot.py`：Playwright 无头截图冒烟测试。
- `gen/*_v1_shark.py`、`skin_shark_old.py`、`index.template.v1.html`：第一版鲨鱼主题，已被用户否决（“太丑”），只留档。
- `plan/layout.py`：画 `park_layout.png` 的脚本（**依赖 box 上的字体路径**，换机器要改 FONT 常量）。

## 3. 引擎与补丁

- 引擎：ClassiCube 网页版 1.3.8，commit `f40534b4`，BSD-3-Clause，从源码自编译（emsdk 6.0.11）。
- 补丁（`blockworld/patches/`，所有改动带 `[xr]` 标记，对干净 checkout 运行 `apply_xr_patches.py` 或 `git apply`）：
  1. `src/Constants.h`：网页版皮肤服务器改为同源 `/skins`。
  2. `src/webclient/interop_web.js`：材质包 URL 读 `Module.xrTexturePack`；IndexedDB 同步后下载 `Module.xrWorld` 存成 `maps/xr_world.cw`；把 `Module.xrDefaultOptions` 写进 `options-default.txt`；新增 `interop_XrHasWorld()`、`interop_XrInteract(x,y,z,block)`（回调页面的 `window.xrInteract`）。
  3. `src/webclient/Platform_Web.c`：启动第二阶段若有 `maps/xr_world.cw` 就自动进入这张图（跳过引擎菜单）。
  4. `src/InputHandler.c`：左/右键先问页面“这个方块是不是可交互告示牌”（`XR_TryInteract`），是就弹卡片而不是拆方块；导出 `xr_InteractSelected()`（E 键 / 点按）、`xr_Teleport(x,y,z,yaw,pitch)`、`xr_ReleaseInput()`（HTML 浮层抢焦点时清空按键）。
- 页面传入的默认选项：`gui-showfps=false`、`singleplayerphysics=false`。
- 只用 ClassiCube 自带材质 `cc_textures.zip` + 自制材质，**没有 Mojang 素材**；页面上不出现 Minecraft 名称和 Logo。

## 4. 预算 / 极限（实测于线上 world.cw）

- 自定义方块：已用 **380 个**（ID 66–445）；网页版 `EXTENDED_BLOCKS` 上限 ID 767 → 还剩约 322 个 ID。
- 贴图格：图集 16×32 = 512 格（`EXTENDED_TEXTURES`），其中 0–95、240–255 为默认材质占用，可用 400 格，**已用 381 格，只剩约 19 格**（图集基本满了）。
- 用量大头是“文字/图片贴图”：公告 126、GIF A 42、铭牌 36、书封 36、传送台 36、欢迎牌 27、GIF B 25、三块标题牌各 14 = 370；真正的材质方块只有 10 种。
- 世界尺寸实测（无头 Chrome，当前构建，wasm 堆）：256³ 级（256×64×256）51 MB；**512×96×512 约 103 MB（推荐，手机可行）**；768×128×768 约 224 MB（iOS Safari 有风险）；1024×128×1024 约 365 MB（手机不行）。每格 2 字节（ID>255 需要 BlockArray2）。`shots/size_*.png` 为实测截图。
- 只有一张 terrain 图集，不能多张。

## 5. 已知问题 / 限制

1. **引擎自带界面是英文**（Esc 暂停菜单、选项、背包标题等），世界内不能直接显示中文（只能用贴图）。
2. **方块物理关闭**：单机物理代码只读方块 ID 的低 8 位，自定义 ID 266/267（低字节 10/11 = 岩浆）被当成岩浆，流满了长廊；所以 `singleplayerphysics=false`。副作用：水不流、沙子不掉。拆/放方块仍可用，刷新复原。
3. **图集几乎满了**（剩约 19 格），在现引擎上继续扩建必须先给告示牌“瘦身”或打补丁扩图集（见 plan/PLAN.md 第 2 节）。
4. **动态更新是手动的**：改 `content/news/*.md` 后要重新跑 build.py 并手动部署；没有 GitHub Action / CI。（原计划要建自动生成，未做，需要用户点头）
5. 预览站和服务器副本没有同步“标签页标题锁定”修复，会显示 “ClassiCube”；也没有 og/canonical 标签（它们本来就 noindex）。
6. `world.xueruo.me` DNS 未建，服务器副本只能用 IP + HTTP 访问。
7. vita-chara.github.io 还没跳转到 xueruo.me（方案里有，未获批准，未做）。
8. 仓库根目录的纸页站与线上不一致（见 docs/blockworld/README.md），最新版在 `blockworld/classic-site/`。
9. 生成器路径写死在 box 布局上（`build/ClassiCube`、`build/fpf`、`/workspace/xueruo-deploy`、`/usr/bin/google-chrome`），换机器需按 DEPLOYMENT.md 第 3 节重建或改常量。
10. 引擎升级要重新打补丁（补丁很小，用脚本应用，锚点缺失会直接报错）。

## 6. 已废弃的尝试

- **第一版鲨鱼主题**（`gen/*_v1_shark.py`，截图 `shots/` 里没有选入）：用户觉得皮肤和鲨鱼像素画太丑，换成昊通机械。
- **three.js 光影 PoC**（`blockworld/hq_poc_ABANDONED/`，截图 `shots/hq_poc_*.png`）：为了“电脑端超高画质光影”做的，把 world.cw 导出给 three.js 渲染。用户随后说“那就不用光影了”，**已废弃**。如果新引擎选 three.js 系，可参考其中的导出思路，但不要当成方向。
