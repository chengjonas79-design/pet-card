import { ref } from 'vue'

export function useCardGenerator() {
  const generating = ref(false)
  const cardImageUrl = ref(null)

  // 生成名片主图（玩梗系风格）
  async function generateCard(cardData) {
    generating.value = true

    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1920
      const ctx = canvas.getContext('2d')

      // 背景
      drawBackground(ctx)

      // 顶部标题区
      drawHeader(ctx)

      // 宠物头像
      await drawAvatar(ctx, cardData.photoUrl)

      // 品种名称（大字 + 玩梗装饰）
      drawBreedName(ctx, cardData.breed)

      // 宠物信息
      drawPetInfo(ctx, cardData)

      // 性格标签
      drawTags(ctx, cardData.tags)

      // 签名档
      if (cardData.signature) {
        drawSignature(ctx, cardData.signature)
      }

      // 底部进群CTA
      await drawFooter(ctx, cardData.breed)

      // 水印
      drawWatermark(ctx)

      cardImageUrl.value = canvas.toDataURL('image/png')
      return cardImageUrl.value
    } catch (e) {
      console.error('名片生成失败:', e)
      throw e
    } finally {
      generating.value = false
    }
  }

  // 生成对比卡（MVP-2）
  async function generateComparisonCard(cardData, breedStats) {
    generating.value = true
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1920
      const ctx = canvas.getContext('2d')

      drawBackground(ctx)
      drawComparisonHeader(ctx)
      await drawAvatar(ctx, cardData.photoUrl, 180)
      drawComparisonStats(ctx, cardData, breedStats)
      await drawFooter(ctx, cardData.breed)
      drawWatermark(ctx)

      return canvas.toDataURL('image/png')
    } finally {
      generating.value = false
    }
  }

  return {
    generating,
    cardImageUrl,
    generateCard,
    generateComparisonCard
  }
}

// ============ Canvas 绘制函数 ============

function drawBackground(ctx) {
  // 深色渐变背景
  const gradient = ctx.createLinearGradient(0, 0, 0, 1920)
  gradient.addColorStop(0, '#1a1a2e')
  gradient.addColorStop(0.5, '#16213e')
  gradient.addColorStop(1, '#0f3460')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1920)

  // 装饰性圆形光晕
  drawGlow(ctx, 200, 300, 250, 'rgba(255, 107, 107, 0.08)')
  drawGlow(ctx, 880, 1400, 300, 'rgba(78, 205, 196, 0.06)')
  drawGlow(ctx, 540, 900, 200, 'rgba(255, 230, 109, 0.05)')

  // 顶部装饰线条
  ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)'
  ctx.lineWidth = 3
  ctx.setLineDash([20, 10])
  ctx.beginPath()
  ctx.moveTo(40, 80)
  ctx.lineTo(1040, 80)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawGlow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawHeader(ctx) {
  // "我家毛孩子的名片" 标题
  ctx.textAlign = 'center'
  ctx.font = 'bold 36px "PingFang SC", sans-serif'
  ctx.fillStyle = '#FFE66D'
  ctx.fillText('🐾 我家毛孩子的名片 🐾', 540, 140)

  // 副标题装饰
  ctx.font = '22px "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(168, 178, 209, 0.7)'
  ctx.fillText('— 萌宠联萌出品 —', 540, 185)
}

function drawAvatar(ctx, photoUrl, size = 320) {
  return new Promise((resolve) => {
    if (!photoUrl) {
      // 占位头像
      const cx = 540
      const cy = 430
      const r = size / 2

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.closePath()
      ctx.fillStyle = '#0f3460'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)'
      ctx.lineWidth = 6
      ctx.stroke()

      ctx.font = '80px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.fillText('🐱', cx, cy + 30)
      ctx.restore()
      resolve()
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const cx = 540
      const cy = 430
      const r = size / 2

      ctx.save()
      // 圆形裁剪
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      // 居中裁剪绘制
      const aspect = img.width / img.height
      let sx, sy, sw, sh
      if (aspect > 1) {
        sh = img.height
        sw = img.height
        sx = (img.width - sw) / 2
        sy = 0
      } else {
        sw = img.width
        sh = img.width
        sx = 0
        sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, cx - r, cy - r, size, size)
      ctx.restore()

      // 头像边框
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = '#FF6B6B'
      ctx.lineWidth = 6
      ctx.stroke()

      // 头像装饰角标
      ctx.save()
      ctx.font = 'bold 48px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('⭐', cx + r - 20, cy - r + 30)
      ctx.restore()

      resolve()
    }
    img.onerror = () => {
      // 图片加载失败用占位
      const cx = 540
      const cy = 430
      const r = size / 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = '#0f3460'
      ctx.fill()
      ctx.font = '80px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🐾', cx, cy + 30)
      resolve()
    }
    img.src = photoUrl
  })
}

function drawBreedName(ctx, breed) {
  const y = 650

  // 品种名称大字
  ctx.textAlign = 'center'
  ctx.font = 'bold 56px "PingFang SC", sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(breed || '神秘品种', 540, y)

  // 底部装饰线
  const textWidth = ctx.measureText(breed || '神秘品种').width
  ctx.strokeStyle = '#FF6B6B'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(540 - textWidth / 2 - 20, y + 15)
  ctx.lineTo(540 + textWidth / 2 + 20, y + 15)
  ctx.stroke()

  // 小装饰 - "认证" 标签
  const badgeY = y + 50
  ctx.font = 'bold 20px "PingFang SC", sans-serif'
  const badgeText = '✓ 已认证萌宠'
  const badgeWidth = ctx.measureText(badgeText).width + 24
  roundRect(ctx, 540 - badgeWidth / 2, badgeY - 18, badgeWidth, 32, 16)
  ctx.fillStyle = 'rgba(78, 205, 196, 0.2)'
  ctx.fill()
  ctx.strokeStyle = '#4ECDC4'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = '#4ECDC4'
  ctx.textAlign = 'center'
  ctx.fillText(badgeText, 540, badgeY + 5)
}

function drawPetInfo(ctx, data) {
  const startY = 770
  const items = [
    { label: '昵称', value: data.nickname, icon: '💫' },
    { label: '性别', value: data.gender, icon: data.gender === '弟弟' ? '♂️' : data.gender === '妹妹' ? '♀️' : '❓' },
    { label: '年龄', value: data.age, icon: '🎂' },
    { label: '坐标', value: data.city, icon: '📍' }
  ]

  if (data.availableTime) {
    items.push({ label: '可约', value: data.availableTime, icon: '📅' })
  }

  // 信息卡片背景
  const cardH = items.length * 58 + 40
  roundRect(ctx, 60, startY - 20, 960, cardH, 20)
  ctx.fillStyle = 'rgba(15, 52, 96, 0.6)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 107, 107, 0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  items.forEach((item, i) => {
    const y = startY + 25 + i * 58
    ctx.textAlign = 'left'

    // icon
    ctx.font = '26px sans-serif'
    ctx.fillText(item.icon, 100, y)

    // label
    ctx.font = '24px "PingFang SC", sans-serif'
    ctx.fillStyle = 'rgba(168, 178, 209, 0.8)'
    ctx.fillText(item.label, 145, y)

    // value
    ctx.font = 'bold 26px "PingFang SC", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(item.value || '—', 260, y)
  })
}

function drawTags(ctx, tags) {
  if (!tags || tags.length === 0) return

  const y = 1130
  ctx.textAlign = 'center'
  ctx.font = '22px "PingFang SC", sans-serif'
  ctx.fillStyle = '#FFE66D'
  ctx.fillText('— 性格标签 —', 540, y)

  const tagColors = ['#FF6B6B', '#4ECDC4', '#FFE66D']
  const tagY = y + 50
  const totalWidth = tags.reduce((sum, tag, i) => {
    ctx.font = 'bold 28px "PingFang SC", sans-serif'
    return sum + ctx.measureText(tag).width + 48 + (i > 0 ? 16 : 0)
  }, 0)

  let x = 540 - totalWidth / 2
  tags.forEach((tag, i) => {
    ctx.font = 'bold 28px "PingFang SC", sans-serif'
    const w = ctx.measureText(tag).width + 48
    const color = tagColors[i % tagColors.length]

    // 标签背景
    roundRect(ctx, x, tagY - 22, w, 48, 24)
    ctx.fillStyle = color + '25'
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()

    // 标签文字
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.fillText(tag, x + w / 2, tagY + 8)

    x += w + 16
  })
}

function drawSignature(ctx, signature) {
  const y = 1310

  ctx.textAlign = 'center'
  ctx.font = 'italic 26px "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(168, 178, 209, 0.9)'
  ctx.fillText(`"${signature}"`, 540, y)
}

async function drawFooter(ctx, breed) {
  const y = 1450

  // 分割线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, y)
  ctx.lineTo(1020, y)
  ctx.stroke()

  // 进群 CTA 区域背景
  roundRect(ctx, 60, y + 30, 960, 350, 20)
  ctx.fillStyle = 'rgba(255, 107, 107, 0.08)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 107, 107, 0.2)'
  ctx.lineWidth = 2
  ctx.stroke()

  // CTA 文案
  ctx.textAlign = 'center'
  ctx.font = 'bold 32px "PingFang SC", sans-serif'
  ctx.fillStyle = '#FF6B6B'
  ctx.fillText(`加入${breed || '同品种'}群`, 540, y + 85)
  ctx.fillText('找到同类人 🎉', 540, y + 130)

  // 二维码占位区域
  const qrSize = 160
  const qrX = 540 - qrSize / 2
  const qrY = y + 155

  roundRect(ctx, qrX, qrY, qrSize, qrSize, 12)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  // 占位文字（实际使用时替换为真实二维码图片）
  ctx.font = '16px "PingFang SC", sans-serif'
  ctx.fillStyle = '#999'
  ctx.textAlign = 'center'
  ctx.fillText('扫码加入', 540, qrY + qrSize / 2 + 6)

  // TODO: 加载真实企微二维码图片
  // 占位标记
  ctx.font = '40px sans-serif'
  ctx.fillText('📱', 540, qrY + qrSize / 2 - 20)
}

function drawWatermark(ctx) {
  ctx.textAlign = 'center'
  ctx.font = '20px "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(168, 178, 209, 0.4)'
  ctx.fillText('萌宠联萌 · 同品种社交名片', 540, 1880)
  ctx.font = '16px "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(168, 178, 209, 0.25)'
  ctx.fillText('长按保存图片 · 分享给同品种的朋友', 540, 1905)
}

// 对比卡专用绘制函数
function drawComparisonHeader(ctx) {
  ctx.textAlign = 'center'
  ctx.font = 'bold 36px "PingFang SC", sans-serif'
  ctx.fillStyle = '#4ECDC4'
  ctx.fillText('📊 同品种对比卡 📊', 540, 140)

  ctx.font = '22px "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(168, 178, 209, 0.7)'
  ctx.fillText('— 看看你家在同品种里的排名 —', 540, 185)
}

function drawComparisonStats(ctx, cardData, stats) {
  const startY = 700
  const items = [
    { label: '品种', value: cardData.breed, sub: stats?.percentageText || '' },
    { label: '同城铲屎官', value: stats?.sameCityCount ? `${stats.sameCityCount}人` : '数据加载中' },
    { label: '全国同品种', value: stats?.totalCount ? `${stats.totalCount}人` : '数据加载中' }
  ]

  items.forEach((item, i) => {
    const y = startY + i * 120

    // 卡片
    roundRect(ctx, 80, y - 30, 920, 100, 16)
    ctx.fillStyle = 'rgba(15, 52, 96, 0.6)'
    ctx.fill()

    ctx.textAlign = 'left'
    ctx.font = '24px "PingFang SC", sans-serif'
    ctx.fillStyle = '#a8b2d1'
    ctx.fillText(item.label, 120, y + 10)

    ctx.textAlign = 'right'
    ctx.font = 'bold 32px "PingFang SC", sans-serif'
    ctx.fillStyle = '#FFE66D'
    ctx.fillText(item.value, 960, y + 10)

    if (item.sub) {
      ctx.font = '18px "PingFang SC", sans-serif'
      ctx.fillStyle = '#4ECDC4'
      ctx.fillText(item.sub, 960, y + 42)
    }
  })
}

// 圆角矩形辅助函数
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
