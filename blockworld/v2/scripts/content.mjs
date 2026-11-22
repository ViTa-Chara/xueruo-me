import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(root, 'v2/public');
await mkdir(resolve(out, 'media'), { recursive: true });
await mkdir(resolve(out, 'skins'), { recursive: true });
await cp(resolve(root, 'site/skins/xueruomi.png'), resolve(out, 'skins/xueruomi.png'));
const characters = JSON.parse(await readFile(resolve(root, 'assets/characters/characters.json'), 'utf8'));
const media = [];
for (const character of characters.characters) {
  for (const image of character.images) {
    const source = resolve(root, 'assets/characters', image.file);
    const filename = image.file.split('/').pop().replace('.original', '');
    await cp(source, resolve(out, 'media', filename));
    const bytes = await readFile(source);
    media.push({ id: filename.split('.')[0], kind: 'media', title: image.title,
      character: character.name, affiliation: character.affiliation || '',
      body: character.id === 'sato' ? '昊通机械里的小撒。使用用户提供的原图。' : '鲨鱼服角色是薛若米。使用用户提供的原始动图。',
      img: `media/${filename}`, url: `media/${filename}`, cta: '打开原图',
      sha256: createHash('sha256').update(bytes).digest('hex') });
  }
}
const news = [];
for (const file of (await readdir(resolve(root, 'content/news'))).filter(f => f.endsWith('.md')).sort().reverse()) {
  const source = await readFile(resolve(root, 'content/news', file), 'utf8');
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing front matter: ${file}`);
  const fields = Object.fromEntries(match[1].split('\n').map(line => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  news.push({ id: file.replace('.md', ''), kind: 'news', title: fields.title,
    date: fields.date, body: match[2].trim(), url: fields.link, cta: '查看', source: file });
}
const books = JSON.parse(await readFile(resolve(root, 'classic-site/data/books.json'), 'utf8')).map(book => ({
  id: book.id, kind: 'book', title: book.title, body: book.blurb, date: book.genre,
  url: `/read.html?book=${book.id}`, cta: '去阅读', color: book.coverColor, chapterCount: book.chapterCount
}));
const portals = [
  { id: 'bilibili', title: 'Bilibili', body: '薛若米的 B 站空间', url: 'https://space.bilibili.com/204339779' },
  { id: 'github', title: 'GitHub', body: '@ViTa-Chara', url: 'https://github.com/ViTa-Chara' },
  { id: 'classic', title: '旧版主页', body: '纸页风个人主页', url: '/classic/' },
  { id: 'text', title: '文字版', body: '动态、书目与角色原图', url: '#text' }
].map(p => ({ ...p, kind: 'link', cta: '前往' }));
for (const file of ['library.html', 'read.html', 'css', 'js', 'data', 'ruomi.png', 'README.md', 'NOVEL_SOURCE_PACK.md', 'tools']) {
  await cp(resolve(root, 'classic-site', file), resolve(out, file), { recursive: true });
}
await mkdir(resolve(out, 'classic'), { recursive: true });
const classic = (await readFile(resolve(root, 'classic-site/index.html'), 'utf8'))
  .replaceAll('"./css/', '"../css/').replaceAll('"./js/', '"../js/')
  .replaceAll("'./data/", "'../data/").replaceAll('"./library.html', '"../library.html')
  .replaceAll('"./read.html', '"../read.html').replaceAll('"./index.html"', '"./"');
await writeFile(resolve(out, 'classic/index.html'), classic);
const content = { version: 3, media, news, books, portals };
await writeFile(resolve(out, 'content.json'), JSON.stringify(content, null, 2));
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const localURL = url => url.startsWith('/') ? '.' + url : url;
const sections = [['角色画廊', media], ['厂区公告', news], ['资料室', books], ['传送入口', portals]];
await writeFile(resolve(out, 'text.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>昊通机械 · 文字版</title><style>body{font:16px/1.8 system-ui;background:#f2f0e8;color:#26313a;max-width:900px;margin:40px auto;padding:20px}article{border-top:1px solid #c9c9b8;padding:20px 0}img{max-width:360px;width:100%;height:auto}a{color:#765500}p{white-space:pre-line}</style><a href="./">返回厂区</a><h1>昊通机械 · 文字版</h1><p>小撒属于昊通机械；鲨鱼服角色是薛若米。</p>${sections.map(([title, items]) => `<section><h2>${escape(title)}</h2>${items.map(item => `<article><h3>${escape(item.title)}</h3>${item.date ? `<small>${escape(item.date)}</small>` : ''}${item.img ? `<img src="${escape(item.img)}" alt="${escape(item.title)}">` : ''}<p>${escape(item.body)}</p><a href="${escape(localURL(item.url))}">${escape(item.cta)}</a></article>`).join('')}</section>`).join('')}</html>`);
// Set an explicit icon for generated copies so nested previews do not request
// /favicon.ico from the hosting root. Original old-site files remain untouched.
for (const file of ['classic/index.html', 'library.html', 'read.html', 'text.html']) {
  const path = resolve(out, file), html = await readFile(path, 'utf8');
  if (!/rel=["']icon["']/i.test(html)) await writeFile(path, html.replace('</title>', '</title><link rel="icon" href="data:,">'));
}
await writeFile(resolve(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
await writeFile(resolve(out, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');
// Include every shipped runtime package's notice, including noa's small dependencies.
const lock = JSON.parse(await readFile(resolve(root, 'v2/package-lock.json'), 'utf8'));
let notices = '昊通机械 · 引擎验证预览\n工业模型、配色、界面和厂区数据为本站制作；用户原图按授权展示。\n\n';
notices += '===== ClassiCube 1.3.8 baseline (BSD-3-Clause) =====\n';
notices += await readFile(resolve(out, 'benchmark/ClassiCube-LICENSE.txt'), 'utf8');
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue;
  const directory = resolve(root, 'v2', path), files = await readdir(directory);
  const license = files.find(f => /^licen[cs]e(?:\..*)?$/i.test(f));
  const pkg = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  notices += `\n===== ${pkg.name} ${pkg.version} (${pkg.license || entry.license || 'See upstream'}) =====\n`;
  if (license) notices += await readFile(resolve(directory, license), 'utf8');
  else {
    const readme = files.find(f => /^readme(?:\..*)?$/i.test(f));
    notices += `Author: ${JSON.stringify(pkg.author || pkg.contributors || '')}\nSource: ${JSON.stringify(pkg.repository || '')}\n`;
    if (readme) notices += await readFile(resolve(directory, readme), 'utf8');
  }
  notices += '\n';
}
await writeFile(resolve(out, 'LICENSES.txt'), notices);
console.log(`内容已生成：${news.length} 条真实公告、${books.length} 本书、${media.length} 张角色原图。`);
