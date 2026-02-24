// 性格标签库 - 4类共24个标签，用户选择3个
export const tagCategories = [
  {
    name: '性格类',
    icon: '😎',
    tags: [
      '社交牛牛', '高冷御姐', '胆小鬼',
      '怒晕包', '自来熟', '慢热型'
    ]
  },
  {
    name: '行为类',
    icon: '🐾',
    tags: [
      '拆家小能手', '食神', '撒娇达人',
      '贴贴虫', '独行侠', '巡逻队长'
    ]
  },
  {
    name: '体质类',
    icon: '💪',
    tags: [
      '铁胃王', '玻璃胃', '睡神',
      '运动健将', '沙发土豆', '精力无限'
    ]
  },
  {
    name: '社交类',
    icon: '🌟',
    tags: [
      '遛弯大师', '狗生赢家', '拍照模特',
      '旅行达人', '宅家快乐'
    ]
  }
]

// 所有标签扁平列表
export const allTags = tagCategories.flatMap(c => c.tags)
