/**
 * Word 支持的字体列表
 */
export const WORD_FONTS = [
  // 中文字体
  '宋体',
  '黑体',
  '楷体',
  '仿宋',
  '微软雅黑',
  '等线',
  '华文仿宋',
  '华文楷体',
  '华文宋体',
  '华文中宋',
  '方正书宋',
  '方正仿宋',

  // 英文字体
  'Times New Roman',
  'Arial',
  'Calibri',
  'Cambria',
  'Consolas',
  'Courier New',
  'Georgia',
  'Verdana',
  'Comic Sans MS',
  'Trebuchet MS',
  'Impact',
  'Palatino Linotype',
  'Garamond',
  'Tahoma',
];

/**
 * Word 标准字号映射
 * 中文字号名称 -> pt 值
 */
export const WORD_FONT_SIZES = [
  { name: '初号', value: 42 },
  { name: '小初', value: 36 },
  { name: '一号', value: 26 },
  { name: '小一', value: 24 },
  { name: '二号', value: 22 },
  { name: '小二', value: 18 },
  { name: '三号', value: 16 },
  { name: '小三', value: 15 },
  { name: '四号', value: 14 },
  { name: '小四', value: 12 },
  { name: '五号', value: 10.5 },
  { name: '小五', value: 9 },
  { name: '六号', value: 7.5 },
  { name: '小六', value: 6.5 },
  { name: '七号', value: 5.5 },
  { name: '八号', value: 5 },
];

/**
 * 根据 pt 值获取 Word 字号名称
 */
export function getFontSizeName(pt: number): string {
  const size = WORD_FONT_SIZES.find(s => s.value === pt);
  return size ? size.name : `${pt}pt`;
}

/**
 * 根据字号名称获取 pt 值
 */
export function getFontSizeValue(name: string): number {
  const size = WORD_FONT_SIZES.find(s => s.name === name);
  return size ? size.value : 12;
}
