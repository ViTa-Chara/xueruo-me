# 昊通机械 · 现代方块引擎验证预览

本目录对应 `docs/blockworld/MASTER_PLAN.md` 的 E0：先对比候选，再由用户选定引擎。它是独立的预览源代码，不覆盖旧站、旧引擎或正式部署目录；不提交、不推送。

## 本地构建与预览

```sh
cd blockworld/v2
npm ci --registry=https://registry.npmjs.org
npm run baseline
npm run verify
npm run build
python3 -m http.server 8790 --bind 127.0.0.1 -d dist
```

打开 `http://127.0.0.1:8790/compare.html`。

- `/?engine=three`：Three.js + Worker 网格化候选。
- `/?engine=noa`：noa 0.33.0 + Babylon.js 6.49.0 候选。
- 添加 `&mobile=1` 可预览手机控制布局；实际触摸设备自动启用。
- `/benchmark/classic.html`：同一 512 厂区的 ClassiCube 渲染基线，不包含新增实体或展板。
- `/#text` 或 `/text.html`：文字版，静态页面在没有 JavaScript / WebGL 时也可读。

已锁定依赖版本；本机默认 npm 镜像缺少 `micro-game-shell@0.9.0`，因此安装命令显式使用官方源，未修改用户全局设置。

## 内容与身份

`../assets/characters/characters.json` 是角色对应的单一来源：两张新 PNG 都是昊通机械的小撒，两张鲨鱼服 GIF 都是薛若米。原文件复制到预览目录，SHA-256 校验保存于 `content.json`，不生成或重画角色原图。

所有公告读自 `../content/news/*.md`；三本书与旧站读自 `../classic-site`。保留 `/classic/`、`/library.html`、`/read.html`，预览可以作为根目录或带前缀的目录托管。构建内容时一并产生文字版及运行时依赖许可。

## 验证架构

`src/world.js` 的尺寸、17 区坐标、建筑和设备 cuboid 数据与任何引擎无关，两个候选及旧引擎基线复用同一套数据。总部暂按 80 格。

新候选共用中文界面、透视展板、原生 GIF、工人/车辆路线、物品栏和触摸控制。图片以原生 `<img>` 投影到世界平面，保持 GIF 原始动画；这不会占用方块 ID 或图集。牌子受距离、朝向和遮挡检查控制。

展板进入视野才请求原图；隐藏画廊和文字版使用延迟加载，避免入口一次下载所有素材。原图文件和动画字节保持一致。

Three.js 候选使用 Worker 中的区块填充及贪心表面合并；区域外网格卸载。noa 使用自身区块系统和贪心网格化，网格化仍在主线程；没有把它误写为 Worker 实现。为公平比较，两候选使用同一控制、碰撞与调度逻辑，因此当前不能用这次成绩评价 noa 的原生物理系统。

E0 原型并非最终生产质量：材料已有 120 个登记项，半砖/管道等形状尚未在适配器中实现；设备仍是方块级造型，真实比例、细节、可攀爬路径、作业逻辑和动态机器联动需要在引擎选定后完善。手机实体预算为 24，桌面为 64；实体采用脚本路线，尚无动态寻路。尚未完成指定真机/4G 验收或部署远程预览。

## 浏览器验证

`scripts/browser.config.json` 提供本机无 Chrome 时的 Playwright Chromium 配置。使用 Playwright CLI 与该配置打开构建后的静态站点，再检查两候选、横屏触摸、原图、分类背包、地图、旧站和文字版。

`window.ht.metrics()` 提供只读测量结果。可在加载完成及区块队列稳定后运行 `window.ht.resetMetrics()`，采样约 10 秒；`window.ht.visit(id)` 和 `window.ht.view([x,y,z], yaw, pitch)` 便于按固定路径测量。原型数据接口用于复现，不代表正式版 API。

运行 `npm run measure` 可以复现 6 个入口样本和 4 个车间样本（先启动上面的静态服务器，并准备好 Playwright CLI 的 Chromium）。使用空缓存的新浏览器上下文，截图与原始数据输出到仓库的 `output/playwright/`；性能结果同时写入 `public/benchmark/results.json`，重新构建后会显示在对比页。

原引擎基线只含相同的建筑与设备，缺少 NPC 和展板；因此对比报告必须注明负载差异。不要把本机手机模拟成绩当成 iPhone 12 或中端 Android 的真实成绩。

## 下一步

在 `docs/blockworld/ENGINE_E0.md` 阅读实测结论。根据规划书 4.4 节由用户选定引擎，再推进 E1/P1–P6。正式站切换需要另行取得用户确认。
