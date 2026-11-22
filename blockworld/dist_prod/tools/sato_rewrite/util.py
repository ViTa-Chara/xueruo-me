# -*- coding: utf-8 -*-
import json, re
from pathlib import Path

OUT = Path("/workspace/xueruo-deploy/data/books/sato-heart/chapters")
OUT.mkdir(parents=True, exist_ok=True)

def zh_len(text: str) -> int:
    return len(re.findall(r"[\u4e00-\u9fff]", text))

def to_html(paragraphs):
    return "".join(f"<p>{p.strip()}</p>" for p in paragraphs if p and p.strip())

def write_chapter(n, title, paragraphs):
    # filter accidental latin-only noise lines
    clean = []
    for p in paragraphs:
        p = p.strip()
        if not p: continue
        clean.append(p)
    html = to_html(clean)
    plain = re.sub(r"<[^>]+>", "", html)
    chars = zh_len(plain)
    obj = {"n": n, "title": title, "html": html, "chars": chars}
    (OUT / f"{n:04d}.json").write_text(
        json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"ch{n:02d} {chars:5d} {title}")
    return obj

def wrap_scene(*parts):
    """Join part lists into one chapter paragraph list."""
    out = []
    for part in parts:
        out.extend(part)
    return out
