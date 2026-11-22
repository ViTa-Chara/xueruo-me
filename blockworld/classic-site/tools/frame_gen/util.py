# -*- coding: utf-8 -*-
import json, re, os

OUT = "/workspace/xueruo-deploy/data/books/frame-library/chapters"

def hanzi_count(html: str) -> int:
    text = re.sub(r"<[^>]+>", "", html)
    return len(re.findall(r"[\u4e00-\u9fff]", text))

def wrap(paras):
    return "".join(f"<p>{p}</p>" for p in paras if p and p.strip())

def write_chapter(n, title, paras):
    html = wrap(paras)
    chars = hanzi_count(html)
    path = os.path.join(OUT, f"{n:04d}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"n": n, "title": title, "html": html, "chars": chars}, f, ensure_ascii=False, indent=2)
    return chars

def report(start, end):
    total = 0
    for n in range(start, end + 1):
        path = os.path.join(OUT, f"{n:04d}.json")
        if os.path.exists(path):
            d = json.load(open(path, encoding="utf-8"))
            total += d["chars"]
            print(f"  ch{n:02d} {d['title']} {d['chars']}")
    print(f"batch {start}-{end} total hanzi: {total}")
    return total
