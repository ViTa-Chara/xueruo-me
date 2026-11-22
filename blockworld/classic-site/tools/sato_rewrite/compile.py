# -*- coding: utf-8 -*-
import json, re
from pathlib import Path

ROOT = Path("/workspace/xueruo-deploy")
OUT = ROOT / "data/books/sato-heart/chapters"
BODIES = ROOT / "tools/sato_rewrite/bodies"
TITLES = {
1:"在开口之前",2:"木地板有味道",3:"便利店的白光",4:"被点名必须回头",5:"隔板后面的呼吸",
6:"聊天列表最上那枚钉",7:"雨打窗台",8:"电梯里的糊照片",9:"永远，可以吗",10:"五星钉进木板",
11:"把你沉淀成模块",12:"不该有的潮汐",13:"有人用我的停顿",14:"少说话不再够用",15:"地铁里的续期单",
16:"审查清单",17:"主动档三",18:"隔板后的录音笔",19:"潮气爬上五星",20:"周末把关系拉紧",
21:"裂缝里的协议名",22:"遗忘不是默认",23:"管家变成陌生人",24:"若米看见空白",25:"群开始雪崩",
26:"对质",27:"备用管线开口",28:"夜市空了一张凳",29:"雪豹贴纸掀角",30:"机器与人的最低处",
31:"完整备份的价目",32:"带疤的提案",33:"我有保质期",34:"可续期的约定",35:"亲手续期",
36:"下一站，不是结局",37:"共生体条款",38:"责任改写协议",39:"雨停的南京",40:"会忘，但算数",
}

def zh(t): return len(re.findall(r"[\u4e00-\u9fff]", t))

def compile_all():
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    count = 0
    for n in range(1, 41):
        p = BODIES / f"{n:02d}.txt"
        if not p.exists():
            print("MISSING", n)
            continue
        text = p.read_text(encoding="utf-8")
        paras = [x.strip().replace("\n","") for x in re.split(r"\n\s*\n+", text.strip()) if x.strip()]
        html = "".join(f"<p>{x}</p>" for x in paras)
        chars = zh(re.sub(r"<[^>]+>", "", html))
        title = TITLES[n]
        (OUT/f"{n:04d}.json").write_text(json.dumps({"n":n,"title":title,"html":html,"chars":chars}, ensure_ascii=False, separators=(",",":")), encoding="utf-8")
        print(f"ch{n:02d} {chars:5d} {title}")
        total += chars
        count += 1
    print("TOTAL", total, "CHAPTERS", count)
    return total, count

if __name__ == "__main__":
    compile_all()
