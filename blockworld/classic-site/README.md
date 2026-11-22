# xueruo.me — 薛若米

纸页编辑风个人站 + 书库连载。部署目标：**Cloudflare Pages**（静态根目录即本文件夹）。

## 本地预览

```bash
cd /workspace/xueruo-deploy
python3 -m http.server 8765
# 打开 http://127.0.0.1:8765/
# 阅读器：http://127.0.0.1:8765/read.html?book=sato-heart
```

## 书库

| id | 书名 | 类型 |
| --- | --- | --- |
| `sato-heart` | 《关于我只是个群聊Bot，却被塞了一整颗会遗忘的心脏这件事》 | 都市日常 / 轻奇幻 |
| `daily-motor` | 《日课永动机》 | 都市轻喜 / 轻荒诞 |
| `frame-library` | 《抽帧图书馆》 | 赛博悬疑 |

阅读器：`read.html?book=<id>`。预写章节读完后，`js/reader.js` 的 `proceduralContinue()` 会依据 `/data/books/<id>/seed.json` 继续生成后续章节（无限下翻）。

## 重新生成章节

```bash
cd tools && python3 gen_chapters.py
```

## 结构

- `index.html` / `library.html` / `read.html`
- `css/site.css` `js/collage.js` `js/reader.js`
- 立绘：`https://raw.githubusercontent.com/ViTa-Chara/vita-chara.github.io/main/ruomi.png`（远端，避免二进制 push 限制）
- `data/books.json` 与 `data/books/{id}/…`

© XueRuoMi · xueruo.me
