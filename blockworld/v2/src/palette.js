// Engine-neutral registry. All colours, patterns and geometry are made for this project.
export const palette = [{ id: 0, name: '空气', color: '#000000', category: '材料', solid: false }];
const add = (name, color, category = '材料', extra = {}) => {
  const item = { id: palette.length, name, color, category, solid: true, shape: 'cube', ...extra };
  palette.push(item); return item.id;
};
export const M = {
  concrete: add('工业混凝土', '#b4b9b5'), asphalt: add('沥青路面', '#3b4249'),
  steel: add('结构钢', '#667785'), checker: add('花纹钢板', '#7d8990'),
  yellow: add('安全黄', '#eaba37', '标识'), white: add('标线白', '#e9e9dc', '标识'),
  blue: add('机床蓝', '#3b748e', '机械'), orange: add('荧光橙', '#de7b31', '机械'),
  red: add('消防红', '#bd4c3e', '机械'), dark: add('铸铁黑', '#28353b', '机械'),
  glass: add('幕墙玻璃', '#87bdcd', '材料', { solid: false, opacity: 0.42 }),
  grass: add('绿地', '#68915c'), brick: add('红砖', '#a6674b'),
  wood: add('木箱', '#b9985f', '机械'), green: add('运行指示灯', '#6dcc8c', '机械'),
  water: add('景观水', '#60a6b0', '材料', { solid: false, opacity: 0.7 }),
  roof: add('压型钢板', '#9eafbb'), skin: add('肤色', '#ebcdb0', '机械'),
  navy: add('藏青工装', '#334c64', '机械'), hair: add('白发', '#eeeae2', '机械')
};
const bases = [
  ['拉丝钢板', '#788994'], ['镀锌板', '#a5b5bb'], ['铝板', '#bac4c4'],
  ['红色机壳', '#b95249'], ['蓝色机壳', '#477f98'], ['白色机壳', '#d3d6ca'],
  ['绿色机壳', '#5d8b76'], ['橙色机壳', '#db843c'], ['黄色机壳', '#d7b23c'],
  ['耐火砖', '#af8165'], ['水泥砖', '#89978f'], ['橡胶', '#354045'],
  ['不锈钢', '#99aeb8'], ['铁格栅', '#5a707b'], ['铜材', '#bd8658'],
  ['绝缘陶瓷', '#e0d8bd'], ['管道钢', '#6a8b91'], ['木材', '#ac895d']
];
for (const [name, color] of bases) {
  for (const [label, shape] of [['整块', 'cube'], ['半砖', 'slab'], ['立柱', 'post'], ['薄板', 'panel'], ['管道', 'pipe']]) {
    add(`${name} · ${label}`, color, name.includes('机壳') ? '机械' : '材料', { shape });
  }
}
for (const [name, color] of [['黄黑警示', '#eaba37'], ['禁止通行', '#bd4c3e'], ['安全通道', '#6aa67c'], ['设备编号', '#6f95a3'], ['消防标识', '#df624a'], ['照明灯', '#fff1bb'], ['控制屏', '#65c8b1'], ['电缆桥架', '#8e9caa'], ['风管', '#aab7bc'], ['托盘', '#b89b67']]) add(name, color, '标识');
export const tools = [
  { id: 'wrench', name: '扳手', category: '工具', color: '#9baeba', tool: true },
  { id: 'hammer', name: '锤子', category: '工具', color: '#c19864', tool: true },
  { id: 'welder', name: '焊枪', category: '工具', color: '#75c7d7', tool: true },
  { id: 'laser', name: '激光工具', category: '工具', color: '#e5a4a1', tool: true }
];
export const items = [...palette.slice(1), ...tools];
