# 部署说明（所有环境）

> 时间均为北京时间。本文件**不含任何密钥值**，只写密钥放在哪里。
> “已核实”= 整理时（2026-10-08 11:30 前后）我用 curl/md5 实测过；“据记录”= 来自之前操作的记录，本次没能再登录核实。

## 0. 环境一览

| 环境 | 地址 | 托管 | 内容 | 搜索引擎 |
|---|---|---|---|---|
| **正式站** | https://xueruo.me | Cloudflare Pages 项目 `xueruo-me` | `blockworld/dist_prod/`（已核实：`/`、`world.cw`、`static/default.zip` 的 md5 与本地一致） | 允许收录（`robots.txt` Allow，带 canonical/og 标签） |
| 预览站 | https://xueruo-blockworld.pages.dev | Cloudflare Pages 项目 `xueruo-blockworld` | 预览构建（= dist_prod 去掉 og/canonical/标签页标题锁定 + `_headers` noindex；已核实 index 与 box 上 `dist/` 一致） | `X-Robots-Tag: noindex`（已核实） |
| 服务器副本 | http://101.132.143.85/ （以及将来的 `world.xueruo.me`） | 阿里云 ECS + nginx | 与预览站同一版构建（已核实 index.html、world.cw md5 相同；default.zip 字节不同，应为另一次打包，内容同代） | nginx 加 `X-Robots-Tag: noindex`（已核实） |
| 旧纸页站 | https://xueruo.me/classic/ | 同正式站 | `classic/index.html`（由 build.py 从旧站 index 改相对路径生成） | — |
| 旧个人页 | https://vita-chara.github.io | GitHub Pages | 未改动；计划中的“跳转到 xueruo.me”**没有做**（需要用户点头） | — |

已知差异：**标签页标题锁定修复**（防止引擎把 `<title>` 改成 “ClassiCube (xueruomi)”）只在正式站有；预览站和服务器副本还没同步（用户还没回复要不要同步）。

## 1. Cloudflare Pages（正式站 + 预览站）

- 账号 ID：`bd885bed3833ba058f0aa745a9ebc357`
- 项目：`xueruo-me`（自定义域名 xueruo.me，生产分支 `main`）；`xueruo-blockworld`（预览）
- 当前正式部署：`ce8c4038`（方块厂区）——据记录
- 回滚目标（切换前的纸页站）：`b93fc2be-a991-4294-be1d-d06e2fa40e27`，预览地址 https://b93fc2be.xueruo-me.pages.dev （见 `blockworld/rollback/ROLLBACK_INFO.txt`，当时线上 index.html md5 `4f9c1615d6dc6cf16506bd88aceb9958`，与 `classic-site/index.html` 相同）
- **部署方式**：从 box 用 wrangler 直接上传构建好的目录（Direct Upload；这次没有用 GitHub 自动构建，也没有 CI）：

```bash
# box 上 wrangler 装在 /workspace/blockworld/build/wr（npm 包 wrangler ^4.148.0）
cd /workspace/blockworld/build/wr
npx wrangler pages deploy /workspace/blockworld/dist_prod --project-name=xueruo-me --branch=main          # 正式站
npx wrangler pages deploy /workspace/blockworld/dist      --project-name=xueruo-blockworld --branch=main  # 预览站
```

  在新机器上：`npm i -D wrangler@4`，然后 `npx wrangler pages deploy <目录> --project-name=<项目> --branch=main`。
- **注意：wrangler pages deploy 是整目录替换**。正式站目录里必须包含旧站全部文件（`classic/`、`library.html`、`read.html`、`css/ js/ data/ tools/ ruomi.png NOVEL_SOURCE_PACK.md README.md`），否则这些路径会 404。`dist_prod/` 就是这样拼出来的。
- **回滚**：Cloudflare 后台 → Workers & Pages → `xueruo-me` → Deployments → 找到 `b93fc2be` → “Rollback to this deployment”。或者重新 `wrangler pages deploy blockworld/classic-site --project-name=xueruo-me --branch=main`（注意那样 `/classic/` 就没有了，根目录直接是纸页站）。
- **密钥位置**：box 上通过环境变量 `CLOUDFLARE_API_TOKEN` 提供（值不记录）。之前的 Cloudflare OAuth 授权曾失效过。换机器部署需要用户在 Cloudflare 后台新建一个 “Cloudflare Pages: Edit” 权限的 API Token，放进环境变量，**不要写进仓库**。

### dist_prod 是怎么拼出来的（没有脚本，手工步骤，接手后建议脚本化）

1. `python3 gen/skin.py`（生成 `site/skins/xueruomi.png`）→ `python3 gen/build.py`（生成 `site/`）。
2. `site/` 复制到 `dist_prod/`。
3. 加上旧站中 build.py 不复制的文件：`NOVEL_SOURCE_PACK.md`、`README.md`、`tools/`（来自旧站目录，保证整目录替换后旧路径不丢）。
4. 加 `robots.txt`（见 `deploy/pages-prod/robots.txt`）。
5. 在 `index.html` 的 `<head>` 里把 og:image 改成绝对地址并加 `og:url`、`og:type`、`twitter:card`、`<link rel="canonical" href="https://xueruo.me/">`。（模板 `gen/index.template.html` 里没有这几行，是部署时手工加的；标题锁定那段已经在模板里。）

预览目录 `dist/` = `site/` + `deploy/pages-preview/_headers`（全站 `X-Robots-Tag: noindex`）。

## 2. 阿里云服务器（101.132.143.85）

- 机器：阿里云 ECS，公网 IP `101.132.143.85`，**内存约 1.6 GB**，Ubuntu，nginx 1.24。
- 同机还跑着：QQ bot（`qqbot.service`，MemoryMax 600M）、NapCat（Docker）、Redis、MicroBin、Maddy 邮件服务。**改 nginx 或部署时不要影响它们**；方块厂区只是静态文件，不新增进程、不开新端口。
- 站点配置：`/etc/nginx/sites-available/blockworld`（内容 = `blockworld/deploy/blockworld.nginx`），在 `sites-enabled` 里有软链。
  - `listen 80`，`server_name 101.132.143.85 world.xueruo.me;`（其他主机名仍走原来的 default / bin.xueruo.me）
  - gzip（含 `application/wasm`）、`X-Robots-Tag: noindex`、`/static/` 缓存 10 分钟、`/media/` 1 小时、`world.cw` 不缓存、禁止访问点文件
  - 日志：`/var/log/nginx/blockworld.access.log`、`blockworld.error.log`
- 文件布局：`/opt/blockworld/releases/<时间戳>/`，当前版本 = 软链 `/opt/blockworld/site → releases/<ts>`。
- 已知的 release：`20261008-101841`（据记录，是回滚目标）。服务器上 index.html 的 Last-Modified 是 10:24:48，说明当前指向的是之后的一次 release（具体时间戳本次没能登录核实：box 上没有 ssh 客户端）。
- **更新**（在构建机上）：

```bash
python3 gen/build.py
tar -C site -czf /tmp/bw.tgz .
scp /tmp/bw.tgz <user>@101.132.143.85:/tmp/
# 服务器上：
TS=$(date +%Y%m%d-%H%M%S)
sudo mkdir -p /opt/blockworld/releases/$TS
sudo tar -xzf /tmp/bw.tgz -C /opt/blockworld/releases/$TS
sudo ln -sfn releases/$TS /opt/blockworld/site      # 在 /opt/blockworld 目录下执行
```

- **回滚**：`cd /opt/blockworld && sudo ln -sfn releases/<旧时间戳> site`（例如 `releases/20261008-101841`）。
- **彻底移除**：`sudo rm /etc/nginx/sites-enabled/blockworld && sudo nginx -t && sudo systemctl reload nginx`，再 `sudo rm -rf /opt/blockworld /etc/nginx/sites-available/blockworld`。
- **登录方式 / 密钥位置**：之前是通过已注册的部署 SSH 密钥登录（私钥不在仓库里，也不应放进仓库）。具体用户名本次未核实。
- **域名**：`world.xueruo.me` 的 DNS 记录**还没建**。建好（A 记录 → 101.132.143.85）后再配 HTTPS（例如 certbot/acme.sh），nginx 已经认这个主机名。
- **建议的下一版预览位置**：服务器 `http://101.132.143.85/v2/`（在同一 server 块里加 `location /v2/ { alias /opt/blockworld/v2/site/; }` 一类配置，或者单独的 release 目录），**不要动正式站**，用户确认后再换。

## 3. 从零重建构建工具链（box 上的 `build/` 没有放进仓库，约 2.1 GB）

| 组件 | 版本 / 来源 | 用途 |
|---|---|---|
| ClassiCube 源码 | https://github.com/ClassiCube/ClassiCube ，commit `f40534b497fa9044d0295d71a2b16651cd831eaa`（2026-10-07，“PS3: implement fog”），游戏版本 1.3.8 | 引擎 |
| Emscripten | emsdk `latest` = 6.0.11（sdk-releases-f6264d4a…，node 24.19.0） | 编译 wasm |
| 字体 | 缝合像素字体 Fusion Pixel Font（https://github.com/TakWolf/fusion-pixel-font ），12px proportional `zh_hans` ttf，OFL-1.1（许可证见 `assets/FUSION_PIXEL_FONT_OFL.txt`）；具体 release 版本号未记录（文件日期 2026-09-25） | 中文告示牌/书封面渲染成贴图 |
| Python | 3.13，numpy 2.5.3、pillow 12.3.0；截图测试另需 playwright 1.63.0 + Chrome；hq_poc 需 nbtlib 2.0.4 | 生成器 |
| wrangler | npm `wrangler@^4.148.0` | Pages 部署 |

```bash
cd blockworld
mkdir -p build && cd build
git clone https://github.com/ClassiCube/ClassiCube && cd ClassiCube && git checkout f40534b4
python3 ../../patches/apply_xr_patches.py .          # 或 git apply ../../patches/0001-xr-blockworld-web.patch
git clone https://github.com/emscripten-core/emsdk ../emsdk && ../emsdk/emsdk install 6.0.11 && ../emsdk/emsdk activate 6.0.11
source ../emsdk/emsdk_env.sh
make web -j8          # = make -f misc/makefiles/web.mk；产出 ClassiCube.js / ClassiCube.wasm（在 ClassiCube 根目录）
                      # 材质 misc/cc_textures.zip 是 ClassiCube 仓库自带的（ClassiCube 自己的美术，不是 Mojang 素材）
cd ../..
mkdir -p build/fpf    # 放 fusion-pixel-12px-proportional-zh_hans.ttf
python3 -m venv .venv && .venv/bin/pip install numpy pillow
XR_OLD_SITE=$PWD/classic-site .venv/bin/python gen/skin.py
XR_OLD_SITE=$PWD/classic-site .venv/bin/python gen/build.py
```

`gen/build.py` 的输入路径：`build/ClassiCube`（取 `misc/cc_textures.zip` 和编译好的 js/wasm）、`build/fpf/…zh_hans.ttf`、`gifs/a.gif`、`gifs/b.gif`、`content/news/`、旧站目录（环境变量 `XR_OLD_SITE`，默认 `/workspace/xueruo-deploy`，在仓库里请指向 `blockworld/classic-site`）。

冒烟测试：`python3 -m http.server 8787 -d site` 后 `python3 gen/shoot.py http://127.0.0.1:8787/`（`XR_MOBILE=1` / `landscape` 模拟手机）。shoot.py 里 Chrome 路径写死为 `/usr/bin/google-chrome`，换机器要改。

## 4. 不在仓库里的东西（以及原因）

- `build/`：ClassiCube 克隆、emsdk、wrangler 的 node_modules、cloudflared 二进制、字体压缩包（约 2.1 GB，可按上一节重建）。
- `hq_poc/node_modules`（three.js，30 MB）和 `hq_poc/world.bin`（8 MB，可用 export.py 从 world.cw 重新导出）——这个 PoC 已废弃。
- box 上的 `dist/`（预览构建）：= `site/` + `deploy/pages-preview/_headers`，没有单独复制。
- `backup-xueruo-me-20261008-103020/`：与 `classic-site/` 逐文件相同（只多一个 ROLLBACK_INFO.txt，已放到 `rollback/`）。
- 所有密钥：Cloudflare API Token、服务器 SSH 私钥、`.env` 等，均未放入。
