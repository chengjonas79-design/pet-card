<template>
  <div class="page-container card-page">
    <div v-if="generating" class="loading-spinner">
      <div class="spinner"></div>
      <p class="text">正在生成你的专属名片...</p>
    </div>

    <div v-if="cardImage && !generating" class="card-preview-area">
      <h1 class="page-title">名片已生成</h1>
      <p class="page-subtitle">先分享，再进入 AI 私域权益页</p>
      <p class="flow-pill">识别品种 -> 3题行为 -> AI个性解读</p>

      <div class="card-image-wrapper">
        <img :src="cardImage" class="card-image" alt="宠物名片" />
      </div>

      <div class="ai-panel">
        <div class="ai-panel-head">
          <span class="ai-badge">AI 专属解读</span>
          <span class="ai-mode">{{ aiModeLabel }}</span>
        </div>

        <div v-if="insightLoading" class="ai-loading">
          正在生成稀缺报告...
        </div>

        <template v-else>
          <p class="ai-title">{{ aiInsight.personaTitle }}</p>
          <p class="ai-summary">{{ aiInsight.personaSummary }}</p>
          <p class="ai-rare">{{ aiInsight.scarcityTitle }}</p>
          <p class="ai-task">{{ aiInsight.inviteTask }}</p>
        </template>
      </div>

      <div class="action-buttons">
        <button class="btn-primary" @click="onPrimaryShareAction">
          一键保存并复制 AI 分享文案
        </button>

        <button
          class="btn-secondary"
          style="margin-top: 10px;"
          :disabled="!cardSaved"
          @click="goPrivatePage"
        >
          下一步：进入 AI 私域权益页
        </button>

        <p v-if="!cardSaved" class="helper-text">请先完成上方分享动作，再进入下一步</p>
        <p v-if="shareNotice" class="share-notice">{{ shareNotice }}</p>
      </div>
    </div>

    <div v-if="cardImage && !generating" class="redo-section">
      <button class="btn-link" @click="goHome">重新制作一张</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCardGenerator } from '../composables/useCardGenerator'
import { useWxAuth } from '../composables/useWxAuth'
import { usePetInsight } from '../composables/usePetInsight'
import {
  trackEvent,
  trackFunnel,
  createShareLink,
  getAttributionContext,
  getTrackingContextSnapshot,
  EVENTS,
  FUNNEL_STEPS
} from '../utils/tracking'
import { buildViralProfile } from '../utils/viralProfile'
import { resolveGroupRoute } from '../data/groupQrcodes'
import { callFunction } from '../utils/cloudbase'

const router = useRouter()
const cardData = ref({})
const viralProfile = ref({
  charmPercentile: 88,
  cityRank: 35,
  rarityLabel: '人气品种'
})
const cardImage = ref(null)
const cardSaved = ref(false)
const shareNotice = ref('')
const sharePayload = ref({ share_id: '', inviter_id: '', share_url: '' })
const groupRoute = ref({
  routeType: 'default',
  routeKey: 'default_all',
  routeLabel: '全国综合交流群',
  advisoryText: ''
})
const aiInsight = ref(buildFallbackInsightView())

const { generating, generateCard } = useCardGenerator()
const { requestAuth, openId, checkAuth } = useWxAuth()
const { loading: insightLoading, insight, insightMode, generateInsight } = usePetInsight()

const aiModeLabel = computed(() => {
  if (insightMode.value === 'cloud_ai' || insightMode.value === 'cloud') return 'Cloud AI'
  return '智能兜底'
})

const shareTextMessage = computed(() => {
  const nickname = cardData.value.nickname || '我家毛孩子'
  const breed = cardData.value.breed || '神秘品种'
  const city = cardData.value.city || '同城'
  return [
    aiInsight.value.shareHook || `${nickname}的AI性格解读出来了，识别品种是${breed}。`,
    aiInsight.value.inviteTask || '来测测你家毛孩子的专属类型吧。',
    `${city}养宠朋友也来测测：${sharePayload.value.share_url}`
  ].join('\n')
})

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
    cardData.value = normalizeCardData(JSON.parse(stored))
  }

  viralProfile.value = buildViralProfile(cardData.value)
  cardData.value.viralProfile = viralProfile.value
  groupRoute.value = resolveGroupRoute(cardData.value)

  sharePayload.value = createShareLink({
    src: 'wx_share',
    campaign: 'pet_card_h5',
    content_id: 'card_ai',
    breed: cardData.value.breed,
    city: cardData.value.city
  })

  trackEvent(EVENTS.SHARE_LINK_CREATED, {
    share_id: sharePayload.value.share_id,
    inviter_id: sharePayload.value.inviter_id,
    content_id: 'card_ai'
  })

  checkAuth()
  await syncProfileStatus(false, false)
  await generateMainCard()
  await generateAIInsight()
})

async function generateMainCard() {
  cardData.value.templateStyle = 'meme'
  cardData.value.viralProfile = viralProfile.value

  try {
    trackEvent(EVENTS.CARD_GENERATE_STARTED, {
      breed: cardData.value.breed,
      template_style: 'meme',
      quick_mode: false
    })

    cardImage.value = await generateCard(cardData.value, {
      templateStyle: 'meme'
    })

    trackEvent(EVENTS.CARD_GENERATED, {
      breed: cardData.value.breed,
      template_style: 'meme',
      quick_mode: false
    })

    trackFunnel(FUNNEL_STEPS.CARD_GENERATED, {
      breed: cardData.value.breed,
      template_style: 'meme'
    })
  } catch (e) {
    trackEvent(EVENTS.CARD_GENERATE_FAILED, {
      breed: cardData.value?.breed || '',
      template_style: 'meme',
      error_message: e?.message || 'unknown'
    })
    console.error('生成名片失败:', e)
  }
}

async function generateAIInsight() {
  const result = await generateInsight(cardData.value)
  if (result) {
    aiInsight.value = result
    sessionStorage.setItem('pet_ai_insight', JSON.stringify(result))
  }
}

async function onPrimaryShareAction() {
  if (!cardSaved.value) {
    await saveCard()
  }
  await copyShareText()
}

async function saveCard() {
  trackEvent(EVENTS.CARD_SAVED, {
    breed: cardData.value.breed,
    template_style: 'meme'
  })
  trackFunnel(FUNNEL_STEPS.CARD_SAVED, {
    breed: cardData.value.breed
  })
  cardSaved.value = true

  const attribution = getAttributionContext()
  if (attribution.is_shared_entry) {
    trackEvent(EVENTS.REFERRAL_CONVERTED, {
      share_id: attribution.share_id,
      inviter_id: attribution.inviter_id,
      conversion_step: 'card_saved',
      breed: cardData.value.breed
    })
  }

  try {
    await requestAuth()
  } catch (e) {
    // 授权失败不阻塞主流程
  }

  downloadImage(cardImage.value, '我家毛孩子的名片.png')
  await syncProfileStatus(true, false)
}

async function copyShareText() {
  const ok = await copyToClipboard(shareTextMessage.value)
  if (ok) {
    trackEvent(EVENTS.SHARE_TEXT_COPIED, {
      share_id: sharePayload.value.share_id,
      template_style: 'meme',
      content_id: 'card_ai'
    })
    trackFunnel(FUNNEL_STEPS.SHARE_LINK_COPIED, {
      share_id: sharePayload.value.share_id,
      copied_payload: 'ai_share_text',
      content_id: 'card_ai'
    })
    showShareNotice('已保存名片并复制 AI 文案，去朋友圈粘贴即可')
    return
  }

  trackEvent(EVENTS.SHARE_COPY_FAILED, {
    type: 'text',
    share_id: sharePayload.value.share_id,
    content_id: 'card_ai'
  })
  showShareNotice('复制失败，请手动长按复制')
}

async function goPrivatePage() {
  if (!cardSaved.value) {
    showShareNotice('请先完成保存与分享')
    return
  }

  trackEvent(EVENTS.PRIVATE_CTA_CLICKED, {
    cta_type: 'go_private_page',
    route_key: groupRoute.value.routeKey || 'default_all',
    breed: cardData.value.breed,
    city: cardData.value.city
  })
  trackFunnel(FUNNEL_STEPS.GROUP_CTA_CLICKED, {
    breed: cardData.value.breed,
    city: cardData.value.city,
    route_key: groupRoute.value.routeKey || 'default_all'
  })

  await syncProfileStatus(false, true)
  sessionStorage.setItem('pet_card_data', JSON.stringify(cardData.value))
  sessionStorage.setItem('pet_ai_insight', JSON.stringify(aiInsight.value))
  router.push('/private')
}

async function syncProfileStatus(incrementCardCount = false, hasJoinIntent = false) {
  try {
    const attribution = getAttributionContext()
    const tracking = getTrackingContextSnapshot()
    await callFunction('user-profile', {
      action: 'save',
      data: {
        openid: openId.value || `visitor_${tracking.visitor_id}`,
        breed: cardData.value.breed,
        city: cardData.value.city,
        ageText: cardData.value.age,
        hasJoinedGroup: false,
        hasJoinIntent,
        joinIntentType: hasJoinIntent ? 'private_page' : '',
        groupRouteType: groupRoute.value.routeType || 'default',
        groupRouteKey: groupRoute.value.routeKey || 'default_all',
        groupRouteLabel: groupRoute.value.routeLabel || '',
        source: tracking.src || attribution.source || 'direct',
        campaign: tracking.campaign || '',
        contentId: tracking.content_id || '',
        shareId: attribution.share_id || '',
        inviterId: attribution.inviter_id || '',
        quickMode: false,
        templateStyle: 'meme',
        incrementCardCount
      }
    })
  } catch (e) {
    console.warn('建档/线索同步失败:', e)
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

function goHome() {
  sessionStorage.removeItem('pet_card_data')
  sessionStorage.removeItem('pet_ai_insight')
  router.replace('/')
}

function showShareNotice(message) {
  shareNotice.value = message
  window.clearTimeout(showShareNotice.timer)
  showShareNotice.timer = window.setTimeout(() => {
    shareNotice.value = ''
  }, 2500)
}
showShareNotice.timer = null

function normalizeCardData(data) {
  return {
    photoUrl: data.photoUrl || '',
    breed: data.breed || '神秘品种',
    nickname: data.nickname || '我家毛孩子',
    gender: data.gender || '不确定',
    age: data.age || '保密',
    city: data.city || '同城',
    tags: Array.isArray(data.tags) && data.tags.length > 0
      ? data.tags
      : ['稳定陪伴', '社交友好', '生活有趣'],
    personalityProfile: data.personalityProfile || null
  }
}

function buildDemoCardData() {
  return normalizeCardData({
    photoUrl: '',
    breed: '柯基',
    nickname: '奶酪',
    gender: '弟弟',
    age: '2岁',
    city: '上海',
    tags: ['社交主动', '贴贴怪', '运动派'],
    personalityProfile: {
      title: '社牛小甜豆',
      source: 'breed_plus_quiz',
      answers: { q1: 'clingy', q2: 'social', q3: 'cuddle' }
    }
  })
}

function buildFallbackInsightView() {
  return {
    personaTitle: '稳定陪伴型',
    personaSummary: '正在准备你的专属AI解读...',
    shareHook: '',
    scarcityCode: '',
    scarcityTitle: '同城AI社交雷达编号',
    inviteTask: '邀请2位好友完成测试，可解锁优先匹配',
    privateBenefits: [],
    iceBreakers: [],
    generatedBy: 'fallback'
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
.card-page {
  padding-bottom: 40px;
  text-align: center;
}

.card-preview-area {
  animation: fadeIn 0.45s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.flow-pill {
  margin: -10px auto 14px;
  width: fit-content;
  font-size: 12px;
  color: #7b624f;
  background: #fff8ed;
  border: 1px solid rgba(255, 196, 134, 0.42);
  padding: 6px 11px;
  border-radius: 999px;
}

.card-image-wrapper {
  margin: 14px 0;
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: 0 12px 34px rgba(180, 120, 100, 0.12);
  border: 1px solid rgba(255, 180, 160, 0.25);
}

.card-image {
  width: 100%;
  display: block;
}

.ai-panel {
  margin: 0 0 14px;
  padding: 12px;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff7ff 0%, #fffefb 100%);
  border: 1px solid rgba(188, 141, 255, 0.32);
  text-align: left;
}

.ai-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ai-badge {
  font-size: 12px;
  font-weight: 800;
  color: #7e43c7;
}

.ai-mode {
  font-size: 11px;
  color: #7b6592;
}

.ai-loading {
  font-size: 13px;
  color: #6f5f81;
}

.ai-title {
  font-size: 17px;
  font-weight: 900;
  color: #3d2b54;
}

.ai-summary {
  margin-top: 5px;
  font-size: 13px;
  color: #5f4d74;
  line-height: 1.55;
}

.ai-rare {
  margin-top: 7px;
  font-size: 12px;
  color: #6d3fb0;
  font-weight: 700;
}

.ai-task {
  margin-top: 6px;
  font-size: 12px;
  color: #6c5b7a;
}

.action-buttons {
  margin: 12px 0 18px;
}

.helper-text {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.share-notice {
  margin-top: 8px;
  font-size: 13px;
  color: #3f8a5f;
}

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
