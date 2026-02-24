<template>
  <div class="page-container card-page">
    <!-- 生成中 -->
    <div v-if="generating" class="loading-spinner">
      <div class="spinner"></div>
      <p class="text">正在生成你的专属名片...</p>
    </div>

    <!-- 名片预览 -->
    <div v-if="cardImage && !generating" class="card-preview-area">
      <h1 class="page-title">名片已生成！</h1>
      <p class="page-subtitle">长按图片保存，分享给同品种的朋友</p>

      <!-- 名片主图 -->
      <div class="card-image-wrapper">
        <img
          :src="cardImage"
          class="card-image"
          alt="宠物名片"
          @longpress="onLongPress"
        />
      </div>

      <!-- 操作按钮组 -->
      <div class="action-buttons">
        <button class="btn-primary" @click="saveCard">
          保存名片到相册 💾
        </button>

        <button
          v-if="comparisonImage"
          class="btn-secondary"
          style="margin-top: 12px;"
          @click="showComparison = true"
        >
          查看同品种对比卡 📊
        </button>

        <button
          v-if="!comparisonImage && cardSaved"
          class="unlock-hint"
          disabled
        >
          🔓 对比卡已解锁，正在生成...
        </button>
      </div>

      <!-- 进群 CTA -->
      <div class="group-cta" @click="onGroupCtaClick">
        <div class="cta-content">
          <div class="cta-icon">🎉</div>
          <div class="cta-text">
            <p class="cta-title">加入{{ cardData.breed }}群，找到同类人</p>
            <p class="cta-sub">500+同品种社群等你来</p>
          </div>
          <div class="cta-arrow">→</div>
        </div>
        <!-- TODO: 替换为真实企微二维码 -->
        <div class="qr-placeholder">
          <div class="qr-box">
            <span class="qr-icon">📱</span>
            <span class="qr-text">企微二维码占位</span>
            <span class="qr-hint">请替换为真实二维码图片</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MVP-2: 对比卡弹窗 -->
    <div v-if="showComparison" class="comparison-overlay" @click.self="showComparison = false">
      <div class="comparison-modal">
        <div class="modal-header">
          <h2>同品种对比卡</h2>
          <button class="modal-close" @click="showComparison = false">✕</button>
        </div>
        <img
          v-if="comparisonImage"
          :src="comparisonImage"
          class="comparison-image"
          alt="对比卡"
        />
        <button class="btn-primary" @click="saveComparisonCard" style="margin-top:16px;">
          保存对比卡 💾
        </button>
      </div>
    </div>

    <!-- 重新制作 -->
    <div v-if="cardImage && !generating" class="redo-section">
      <button class="btn-link" @click="goHome">重新制作一张</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCardGenerator } from '../composables/useCardGenerator'
import { useWxAuth } from '../composables/useWxAuth'
import { trackEvent, EVENTS } from '../utils/tracking'
import { callFunction } from '../utils/cloudbase'
import { getBreedPercentageText } from '../data/breeds'

const router = useRouter()
const cardData = ref({})
const cardImage = ref(null)
const comparisonImage = ref(null)
const cardSaved = ref(false)
const showComparison = ref(false)

const { generating, generateCard, generateComparisonCard } = useCardGenerator()
const { requestAuth, openId } = useWxAuth()

onMounted(async () => {
  const stored = sessionStorage.getItem('pet_card_data')
  if (!stored) {
    router.replace('/')
    return
  }

  cardData.value = JSON.parse(stored)

  // 生成名片
  try {
    cardImage.value = await generateCard(cardData.value)
    trackEvent(EVENTS.CARD_GENERATED, {
      breed: cardData.value.breed,
      template_style: 'meme'
    })
  } catch (e) {
    console.error('生成名片失败:', e)
  }
})

async function saveCard() {
  trackEvent(EVENTS.CARD_SAVED)
  cardSaved.value = true

  // MVP-2: 保存时触发微信授权
  await requestAuth()

  // 下载图片
  downloadImage(cardImage.value, '我家毛孩子的名片.png')

  // MVP-2: 保存后解锁对比卡
  generateComparisonCardAsync()

  // MVP-2: 用户建档
  saveUserProfile()
}

async function generateComparisonCardAsync() {
  try {
    const stats = {
      percentageText: getBreedPercentageText(cardData.value.breed),
      sameCityCount: Math.floor(Math.random() * 200) + 50, // TODO: 对接真实数据
      totalCount: Math.floor(Math.random() * 2000) + 500
    }
    comparisonImage.value = await generateComparisonCard(cardData.value, stats)
    trackEvent(EVENTS.COMPARISON_VIEWED)
  } catch (e) {
    console.error('对比卡生成失败:', e)
  }
}

async function saveUserProfile() {
  try {
    await callFunction('user-profile', {
      action: 'save',
      data: {
        openid: openId.value || 'anonymous_' + Date.now(),
        breed: cardData.value.breed,
        city: cardData.value.city,
        ageText: cardData.value.age,
        hasJoinedGroup: false,
        source: new URLSearchParams(window.location.search).get('source') || 'direct',
        createdAt: Date.now()
      }
    })
  } catch (e) {
    console.warn('建档失败:', e)
  }
}

function saveComparisonCard() {
  if (comparisonImage.value) {
    downloadImage(comparisonImage.value, '同品种对比卡.png')
  }
}

function downloadImage(dataUrl, filename) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function onLongPress() {
  // 移动端长按保存由浏览器原生支持
}

function onGroupCtaClick() {
  trackEvent(EVENTS.GROUP_CTA_SCAN, {
    breed: cardData.value.breed,
    city: cardData.value.city
  })
}

function goHome() {
  sessionStorage.removeItem('pet_card_data')
  router.replace('/')
}
</script>

<style scoped>
.card-page {
  padding-bottom: 40px;
  text-align: center;
}

.card-preview-area {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-image-wrapper {
  margin: 20px 0;
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: 0 12px 34px rgba(180, 120, 100, 0.12);
  border: 1px solid rgba(255, 180, 160, 0.25);
}

.card-image {
  width: 100%;
  display: block;
}

.action-buttons {
  margin: 24px 0;
}

.unlock-hint {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(180deg, #F0FFF5 0%, #E8FAF0 100%);
  border: 1px dashed rgba(126, 217, 166, 0.5);
  border-radius: 14px;
  color: #3DA06B;
  font-size: 14px;
  cursor: default;
}

/* 进群 CTA */
.group-cta {
  margin: 28px 0;
  padding: 24px;
  background: linear-gradient(180deg, #FFFAF8 0%, #FFF5F0 100%);
  border: 1.5px solid rgba(255, 180, 160, 0.3);
  border-radius: var(--radius-card);
  cursor: pointer;
  transition: all 0.3s;
}

.group-cta:active {
  background: #FFF0EB;
}

.cta-content {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.cta-icon {
  font-size: 36px;
}

.cta-text {
  flex: 1;
  text-align: left;
}

.cta-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}

.cta-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

.cta-arrow {
  font-size: 24px;
  color: var(--primary);
}

.qr-placeholder {
  display: flex;
  justify-content: center;
}

.qr-box {
  width: 200px;
  height: 200px;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #F3F4F6;
}

.qr-icon {
  font-size: 40px;
}

.qr-text {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 600;
}

.qr-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* 对比卡弹窗 */
.comparison-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(12, 24, 48, 0.42);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.comparison-modal {
  background: linear-gradient(180deg, #FFFFFF 0%, #FFFAF8 100%);
  border-radius: 24px;
  border: 1px solid rgba(255, 180, 160, 0.25);
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.2);
  padding: 20px;
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h2 {
  font-size: 20px;
  color: var(--text-main);
}

.modal-close {
  background: #fff;
  border: 1px solid #FFD4CC;
  color: #8A94A7;
  font-size: 22px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.modal-close:active {
  background: #FFF0F2;
  transform: scale(0.97);
}

.comparison-image {
  width: 100%;
  border-radius: 16px;
}

/* 重新制作 */
.redo-section {
  margin-top: 24px;
}

.btn-link {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
  padding: 12px;
}
</style>
