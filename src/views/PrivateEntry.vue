<template>
  <div class="page-container private-page">
    <h1 class="page-title">AI 私域权益页</h1>
    <p class="page-subtitle">这里不是空白页，你的稀缺权益和入群信息都在这里</p>

    <div class="rare-card">
      <p class="rare-label">稀缺通行证</p>
      <p class="rare-title">{{ insight.scarcityTitle }}</p>
      <button class="copy-code-btn" @click="copyScarcityCode">
        复制编号 {{ insight.scarcityCode || '--' }}
      </button>
    </div>

    <div class="benefits-card">
      <p class="section-title">入私域后可领取</p>
      <p v-for="(item, idx) in insight.privateBenefits" :key="idx" class="line-item">· {{ item }}</p>
    </div>

    <div class="benefits-card">
      <p class="section-title">AI 推荐开场白（可直接发群）</p>
      <p v-for="(item, idx) in insight.iceBreakers" :key="idx" class="line-item">· {{ item }}</p>
    </div>

    <div class="qr-card">
      <p class="section-title">扫码进入：{{ groupRoute.routeLabel }}</p>
      <p class="route-sub">{{ groupRoute.advisoryText }}</p>

      <div class="qr-placeholder">
        <img
          v-if="groupQrAvailable"
          :src="groupQrcode"
          class="qr-image"
          alt="进群二维码"
          @load="groupQrAvailable = true"
          @error="groupQrAvailable = false"
        />
        <div v-else class="qr-box">
          <span class="qr-icon">📱</span>
          <span class="qr-text">二维码占位</span>
          <span class="qr-hint">可在 public/qrcode.png 替换</span>
        </div>
      </div>

      <p class="route-tip">长按识别二维码进入私域</p>
    </div>

    <div class="action-area">
      <button class="btn-primary" @click="markJoined">
        我已扫码，继续下一步
      </button>
      <button class="btn-secondary" style="margin-top: 10px;" @click="goBackCard">
        返回上一页
      </button>
      <p v-if="notice" class="notice">{{ notice }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { resolveGroupRoute } from '../data/groupQrcodes'
import { usePetInsight } from '../composables/usePetInsight'
import { callFunction } from '../utils/cloudbase'
import { getAttributionContext, getTrackingContextSnapshot, trackEvent, trackFunnel, EVENTS, FUNNEL_STEPS } from '../utils/tracking'

const router = useRouter()
const cardData = ref({})
const groupRoute = ref({
  routeType: 'default',
  routeKey: 'default_all',
  routeLabel: '全国综合交流群',
  advisoryText: ''
})
const groupQrcode = ref('/qrcode.png')
const groupQrAvailable = ref(true)
const notice = ref('')
const insight = ref({
  scarcityTitle: '同城AI社交雷达编号',
  scarcityCode: '',
  privateBenefits: ['加入私域后可领取专属权益'],
  iceBreakers: ['我家毛孩子做完测试了，你家也来试试？']
})

const { generateInsight } = usePetInsight()

onMounted(async () => {
  const stored = sessionStorage.getItem('pet_card_data')
  const forcePreview = new URLSearchParams(window.location.search).get('preview') === '1'
  if (!stored) {
    if (!forcePreview) {
      router.replace('/')
      return
    }
    cardData.value = buildDemoCardData()
  } else {
    cardData.value = JSON.parse(stored)
  }

  groupRoute.value = resolveGroupRoute(cardData.value)
  groupQrcode.value = groupRoute.value.qrcode || '/qrcode.png'
  groupQrAvailable.value = Boolean(groupQrcode.value)

  const cachedInsight = sessionStorage.getItem('pet_ai_insight')
  if (cachedInsight) {
    try {
      insight.value = JSON.parse(cachedInsight)
    } catch (e) {
      // ignore parse error
    }
  } else {
    const fresh = await generateInsight(cardData.value)
    if (fresh) insight.value = fresh
  }

  trackEvent(EVENTS.PRIVATE_PAGE_VIEW, {
    breed: cardData.value.breed || '',
    city: cardData.value.city || '',
    route_key: groupRoute.value.routeKey || 'default_all'
  })
})

async function markJoined() {
  await syncLeadIntent()
  notice.value = '已记录你的入群意向，运营会优先跟进'
}

function goBackCard() {
  router.push('/card')
}

async function copyScarcityCode() {
  const code = insight.value.scarcityCode || ''
  if (!code) return
  const ok = await copyToClipboard(code)
  notice.value = ok ? '已复制稀缺编号' : '复制失败，请手动复制'
}

async function syncLeadIntent() {
  try {
    const attribution = getAttributionContext()
    const tracking = getTrackingContextSnapshot()
    await callFunction('user-profile', {
      action: 'save',
      data: {
        openid: `lead_${tracking.visitor_id}`,
        breed: cardData.value.breed || '',
        city: cardData.value.city || '',
        ageText: cardData.value.age || '',
        hasJoinedGroup: false,
        hasJoinIntent: true,
        joinIntentType: 'private_page_confirmed',
        groupRouteType: groupRoute.value.routeType || 'default',
        groupRouteKey: groupRoute.value.routeKey || 'default_all',
        groupRouteLabel: groupRoute.value.routeLabel || '',
        source: tracking.src || attribution.source || 'direct',
        campaign: tracking.campaign || '',
        contentId: tracking.content_id || '',
        shareId: attribution.share_id || '',
        inviterId: attribution.inviter_id || '',
        incrementCardCount: false
      }
    })
    trackFunnel(FUNNEL_STEPS.GROUP_INTENT_SUBMITTED, {
      breed: cardData.value.breed || '',
      city: cardData.value.city || '',
      route_key: groupRoute.value.routeKey || 'default_all'
    })
  } catch (e) {
    // ignore sync failures in UI
  }
}

function buildDemoCardData() {
  return {
    breed: '柯基',
    city: '上海',
    nickname: '奶酪',
    tags: ['社交主动', '贴贴怪', '运动派']
  }
}

async function copyToClipboard(content) {
  if (!content) return false

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(content)
      return true
    } catch (e) {
      // fallback
    }
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = content
    textarea.setAttribute('readonly', 'readonly')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const result = document.execCommand('copy')
    document.body.removeChild(textarea)
    return result
  } catch (e) {
    return false
  }
}
</script>

<style scoped>
.private-page {
  padding-bottom: 40px;
}

.rare-card,
.benefits-card,
.qr-card {
  background: #fff;
  border: 1px solid rgba(255, 180, 160, 0.28);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
}

.rare-card {
  background: linear-gradient(180deg, #fff8ff 0%, #fffdf8 100%);
  border-color: rgba(188, 141, 255, 0.34);
}

.rare-label {
  font-size: 12px;
  color: #7b6592;
}

.rare-title {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 900;
  color: #4f3272;
}

.copy-code-btn {
  margin-top: 8px;
  border: 1px solid rgba(188, 141, 255, 0.4);
  border-radius: 999px;
  background: #fff;
  color: #693ca6;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: #4a3d33;
  margin-bottom: 8px;
}

.line-item {
  font-size: 13px;
  color: #6d5a4d;
  line-height: 1.6;
}

.route-sub {
  font-size: 12px;
  color: #826651;
}

.qr-placeholder {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.qr-box {
  width: 184px;
  height: 184px;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #F3F4F6;
}

.qr-image {
  width: 184px;
  height: 184px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid #f0d5cd;
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

.route-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #7d6554;
}

.action-area {
  margin-top: 18px;
}

.notice {
  margin-top: 8px;
  font-size: 13px;
  color: #3f8a5f;
}
</style>
