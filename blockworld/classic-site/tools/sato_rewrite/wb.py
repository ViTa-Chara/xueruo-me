# -*- coding: utf-8 -*-
import sys, re
from pathlib import Path
B = Path("/workspace/xueruo-deploy/tools/sato_rewrite/bodies")
def zh(t): return len(re.findall(r"[\u4e00-\u9fff]", t))
n = int(sys.argv[1])
text = sys.stdin.read()
(B/f"{n:02d}.txt").write_text(text.strip()+"\n", encoding="utf-8")
print(n, zh(text))
