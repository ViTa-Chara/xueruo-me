# -*- coding: utf-8 -*-
"""Convert raw/NNN-title.md files (paragraphs separated by blank lines) to chapter JSON."""
import re, json, sys
from pathlib import Path
from util import write_chapter, zh_len

RAW = Path(__file__).parent / "raw"

def parse_md(path: Path):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    title = None
    body_lines = []
    for i, line in enumerate(lines):
        if line.startswith("# "):
            title = line[2:].strip()
        else:
            body_lines.append(line)
    body = "\n".join(body_lines).strip()
    # paragraphs: split on blank lines
    paras = [p.replace("\n", "").strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    return title, paras

def main():
    files = sorted(RAW.glob("*.md"))
    total = 0
    for f in files:
        m = re.match(r"^(\d+)", f.name)
        if not m:
            continue
        n = int(m.group(1))
        title, paras = parse_md(f)
        if not title:
            title = f.stem
        obj = write_chapter(n, title, paras)
        total += obj["chars"]
    print("TOTAL_WRITTEN", total)

if __name__ == "__main__":
    main()
