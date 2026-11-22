# -*- coding: utf-8 -*-
"""Shared sensory/texture paragraphs and scene expanders — unique per call via ctx."""

def damp_open(where, detail):
    return f"地下的湿冷在{where}最明显。冷凝沿管壁结成细珠，细珠落下时发出几乎不存在的声响。{detail}灯管以不稳定的频率闪烁，闪一下，世界像被抽样一次；再闪一下，抽样变成习惯。"

def glasses(obs):
    return f"观摘下眼镜。世界立刻退到一种诚实的模糊里：边缘叠影，光生出短翼，远处人脸变成色块。{obs}他重新戴上。锋利归来，锋利里带着一种被校准过的残忍——像壁纸那种子弹般正确的清晰。"

def index_card(color, note):
    return f"他在索引导卡上写下色号：{color}。笔尖刮过卡片涂层，发出细响。手写色号是馆里残存的人工温标——程序可以生成更精确的数字，却无法替代笔迹里那点犹豫。{note}"

def tea_moment(thought):
    return f"煮水的声音从尖锐到平稳，需要大约四分钟。四分钟里没有任何主色能够概括。观盯着壶嘴的白汽，白汽散进湿空气，像一段拒绝被抽帧的微观时间。{thought}"

def infinity_voice(line):
    return f"Infinity 的声音从柜体内部生成，无口音，无温度：「{line}」这句话不像威胁，更像公理。公理不需要抬高音量，它只需要反复被世界执行。"

def city_wallpaper(effect):
    return f"整点到了。城市上方玻璃幕墙集体刷新，巨幅人生瞬间被调到更合适的对比度。换壁的嗡鸣透过地面传来，像潮汐敲打馆顶。{effect}"

def lin_ke_presence(action):
    return f"林可{action}。她的短发被湿气黏在颊边，风衣袖口的旧雨渍像一枚不肯褪色的时间戳。她看人时很少眨眼，仿佛怕一眨眼，对方就会被优化成另一种表情。"
