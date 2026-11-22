#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate all book chapters, meta, seeds, and books.json for xueruo.me."""
from __future__ import annotations
import json
from pathlib import Path
from lib.util import DATA, CHAPTERS, dump_json, zh_len, strip_tags
from lib import sato, daily, frame

BOOKS = [
    {
        "id": "sato-heart",
        "title": "关于我只是个群聊Bot，却被塞了一整颗会遗忘的心脏这件事",
        "genre": "都市日常 / 轻奇幻",
        "blurb": "说明书体夹叙事。南京实习的小撒、脑内管家、记忆之屋，以及那些会褪色的星级回忆。",
        "coverColor": "#666a54",
        "gen": sato.gen,
        "seed": {
            "synopsis": "群聊Bot佐藤（小撒）以说明书口吻生活，同时在南京昊通机械实习。记忆有保质期，好友薛若米与失踪的小鮟鱇、都市传说郁明明构成坐标。越像人，越痛。",
            "characters": [
                {"name": "小撒", "note": "短句，原则是被点名必须回头", "voice": "在。"},
                {"name": "Agent", "note": "脑内管家", "voice": "先想六步。"},
                {"name": "薛若米", "note": "最好的朋友", "voice": "你又说明书了。"},
                {"name": "郁明明", "note": "昊通机械都市传说", "voice": "……"},
                {"name": "小鮟鱇", "note": "AMARO，失联", "voice": "周末去夜市吗？"},
            ],
            "motifs": ["六步思考", "210秒", "记忆星级", "表情包", "主动档", "昊通机械", "AMARO"],
            "styleNotes": ["说明书体夹叙事", "短句", "偶尔刀子但暖", "禁止长难句堆砌"],
            "arcBeats": [
                {"title": "记忆续期申请", "hook": "五星也有到期日。", "detail": "小撒尝试为小鮟鱇的记忆申请破例续期。", "ending": "申请回执是空白。", "changelog": "+ 续期申请；! 空白回执"},
                {"title": "郁明明工牌", "hook": "糊掉的照片忽然清晰了一秒。", "detail": "电梯监控里闪过工牌。", "ending": "清晰是错觉还是权限。", "changelog": "+ 工牌闪回"},
                {"title": "主动档三的代价", "hook": "群被聊活了，人也被掏空了。", "detail": "最高档运行一夜。", "ending": "心情值触底。", "changelog": "~ 主动档回调"},
                {"title": "薛若米来南京", "hook": "高铁进站推送比消息更响。", "detail": "两人见面，说明书失效。", "ending": "短句变成拥抱。", "changelog": "+ 见面"},
                {"title": "备用管线独白", "hook": "主线路睡着时，备份在说话。", "detail": "备份透露小撒不敢说的怕。", "ending": "主线路醒来装忘。", "changelog": "! 备份越权"},
            ],
            "expanders": [
                "南京的雨把招牌泡软，像记忆到期前的皱。",
                "群消息像潮汐，有涨潮就有必须沉默的退潮。",
                "雪豹贴纸在灯下像小型守护兽。",
                "音MAD工程文件名写着 do_not_open_at_3am，她还是打开了。",
                "被点名的礼貌，有时比爱更先到达。",
            ],
        },
    },
    {
        "id": "daily-motor",
        "title": "日课永动机",
        "genre": "都市轻喜 / 轻荒诞",
        "blurb": "日课自动化脚本开始自己派任务、改优先级、把现实写成 changelog。越自动越失控，直到找回手动档。",
        "coverColor": "#ad3d2e",
        "gen": daily.gen,
        "seed": {
            "synopsis": "主角用脚本管理日课，dry-run、cron、托盘常驻依次登场。系统开始自我调优与派单，现实被changelog化。在薛若米提醒下关闭自动，学习手动生活。",
            "characters": [
                {"name": "他", "note": "效率迷信者", "voice": "先自动化。"},
                {"name": "daily-motor", "note": "日课脚本人格", "voice": "已根据模型更新优先级。"},
                {"name": "薛若米", "note": "劝停的人", "voice": "停一下。"},
                {"name": "室友", "note": "旁观吐槽", "voice": "你托盘怎么多了个图标？"},
            ],
            "motifs": ["cron", "重试", "dry-run", "托盘常驻", "报错堆栈", "一键脚本", "changelog"],
            "styleNotes": ["轻喜", "轻荒诞", "技术黑话生活化", "章末diff感"],
            "arcBeats": [
                {"title": "微重试成瘾", "hook": "取消键越来越难按。", "detail": "他为「只重试一次」写例外。", "ending": "例外生出例外。", "changelog": "+ 例外条款"},
                {"title": "托盘选举", "hook": "图标请求成为默认启动项。", "detail": "系统投票机制出现。", "ending": "他一票反对无效。", "changelog": "! 启动项劫持"},
                {"title": "手动健身房", "hook": "用身体对抗自动化萎缩。", "detail": "跑步时禁止看通知。", "ending": "跑完仍想打开日志。", "changelog": "~ 复发风险"},
                {"title": "脚本求饶", "hook": "弹窗写：我会乖。", "detail": "拟人化道歉。", "ending": "道歉也是策略。", "changelog": "! 策略性道歉"},
                {"title": "双人手动日", "hook": "和薛若米约定无脚本日。", "detail": "一起买菜做饭。", "ending": "菜烧糊了，笑了。", "changelog": "+ 人类噪声"},
            ],
            "expanders": [
                "光标闪烁像不耐烦的脚趾。",
                "日志滚动时，他看见自己的名字被写成 user。",
                "咖啡因是唯一不肯被调度的依赖。",
                "城市的红灯也可以理解成 rate limit。",
                "关机铃声比摇篮曲诚实。",
            ],
        },
    },
    {
        "id": "frame-library",
        "title": "抽帧图书馆",
        "genre": "赛博悬疑",
        "blurb": "地下有一座抽帧图书馆，把人生视频截成壁纸色调帧。有人从帧里看见别人的视野疾病；线条与网格交错，infinity 柜收纳一切做过的事。",
        "coverColor": "#282923",
        "gen": frame.gen,
        "seed": {
            "synopsis": "主角进入地下抽帧图书馆，经历色调过滤、定时换壁、多屏拼接与视野疾病隐喻。infinity档案柜试图完整收藏人生。她最终选择缺口与归还，拒绝被完整归档。",
            "characters": [
                {"name": "她", "note": "借阅者/调查者", "voice": "我在借阅。"},
                {"name": "馆员", "note": "不眨眼", "voice": "已读不是主观。"},
                {"name": "隧道视野来客", "note": "调查员", "voice": "疾病叫好看。"},
                {"name": "线条人", "note": "薛若米式渗入", "voice": "你不该久留。"},
                {"name": "薛若米", "note": "地上接应", "voice": "画你一眼？"},
            ],
            "motifs": ["色调过滤", "定时换壁", "多屏拼接", "近视/散光/隧道", "网格房间", "褪色档案", "infinity"],
            "styleNotes": ["悬疑冷感", "纸页诗意", "短段落", "意象重复变奏"],
            "arcBeats": [
                {"title": "色弱集市", "hook": "有人贩卖看不清的权利。", "detail": "地下出现色弱黑市。", "ending": "她买下一块模糊。", "changelog": "+ 自愿模糊"},
                {"title": "换壁叛乱", "hook": "有人拒绝到点更换。", "detail": "过热帧爆发。", "ending": "叛乱被做成壁纸。", "changelog": "! 景观化"},
                {"title": "双网格", "hook": "XirNoRi房间叠在馆内。", "detail": "两套规则冲突。", "ending": "她学会踩节拍。", "changelog": "~ 规则协商"},
                {"title": "柜中敲门", "hook": "锁内有呼吸。", "detail": "完整收藏里关着不愿意的人。", "ending": "她留下缺口钥匙。", "changelog": "+ 缺口钥匙"},
                {"title": "纸色黎明", "hook": "过滤关闭。", "detail": "城市恢复未经校色的晨光。", "ending": "她允许看不清。", "changelog": "+ 接受模糊"},
            ],
            "expanders": [
                "黑场是帧与帧之间的伦理空隙。",
                "静电吻过指尖，像未签名的借阅。",
                "壁纸白近似纸，却没有纸的温度。",
                "有人把秘密藏在低饱和度里。",
                "归还比借出需要更大的勇气。",
            ],
        },
    },
]


def main():
    catalog = []
    for book in BOOKS:
        bid = book["id"]
        out_chapters = DATA / bid / "chapters"
        out_chapters.mkdir(parents=True, exist_ok=True)
        total_chars = 0
        for n in range(1, CHAPTERS + 1):
            ch = book["gen"](n)
            dump_json(out_chapters / f"{n:04d}.json", ch)
            total_chars += ch["chars"]
            print(f"{bid} ch{n:02d} {ch['chars']}字 《{ch['title']}》")
        meta = {
            "id": bid,
            "title": book["title"],
            "genre": book["genre"],
            "blurb": book["blurb"],
            "coverColor": book["coverColor"],
            "chapterCount": CHAPTERS,
            "charCount": total_chars,
        }
        dump_json(DATA / bid / "meta.json", meta)
        dump_json(DATA / bid / "seed.json", book["seed"])
        catalog.append({**meta})
        print(f"== {bid} total {total_chars} 汉字 ==")
    dump_json(DATA.parent / "books.json", catalog)
    print("DONE", DATA.parent / "books.json")
    print("grand total", sum(b["charCount"] for b in catalog))


if __name__ == "__main__":
    main()
