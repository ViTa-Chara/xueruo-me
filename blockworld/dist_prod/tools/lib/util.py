# -*- coding: utf-8 -*-
from __future__ import annotations
import json, re, random, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "books"
TARGET_MIN, TARGET_MAX = 2200, 3200
CHAPTERS = 25

def zh_len(s: str) -> int:
    return sum(1 for c in s if "\u4e00" <= c <= "\u9fff")

def strip_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html)

def paras_to_html(paras: list[str]) -> str:
    return "".join(f"<p>{p}</p>" for p in paras if p and str(p).strip())

def rng_for(book: str, n: int) -> random.Random:
    h = hashlib.sha256(f"{book}:{n}".encode()).hexdigest()
    return random.Random(int(h[:16], 16))

def ensure_length(paras: list[str], fillers: list[str], rng: random.Random) -> list[str]:
    n = zh_len(strip_tags(paras_to_html(paras)))
    i = 0
    while n < TARGET_MIN and i < 100:
        paras.append(fillers[i % len(fillers)] if fillers else "……")
        # slight variation
        if i % 3 == 0:
            paras.append(rng.choice(fillers))
        n = zh_len(strip_tags(paras_to_html(paras)))
        i += 1
    while n > TARGET_MAX + 500 and len(paras) > 14:
        paras.pop()
        n = zh_len(strip_tags(paras_to_html(paras)))
    return paras

def pack(n: int, title: str, paras: list[str]) -> dict:
    html = paras_to_html(paras)
    return {"n": n, "title": title, "html": html, "chars": zh_len(strip_tags(html))}

def dump_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
