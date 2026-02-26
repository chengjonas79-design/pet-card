<template>
  <div class="page-container card-page">
    <!-- 生成中 -->
    <div v-if="generating" class="loading-spinner">
      <div class="spinner"></div>
      <p class="text">正在生成你的专属名片...</p>
    </div>

    <!-- 名片预览 -->
    <div v-if="cardImage && !generating" class="card-preview-area">
      <h1 class="page-title">{{ isQuickMode ? '极速卡片已生成！' : '名片已生成！' }}</h1>
      <p class="page-subtitle">
        {{ isQuickMode ? '先分享再完善资料，优先拿到裂变流量' : '长按保存，分享给同品种朋友' }}
      </p>

      <div v-if="isQuickMode" class="quick-mode-tip">
        <span>⚡ 你正在使用极速模式</span>
        <button class="btn-link-inline" @click="goToInfoEnhance">补全资料提升匹配</button>
      </div>

      <div class="template-switcher">
        <button
          v-for="tpl in templateOptions"
          :key="tpl.value"
          class="template-chip"
          :class="{ active: activeTemplate === tpl.value, locked: !isTemplateUnlocked(tpl.value) }"
          @click="onTemplateChange(tpl.value)"
        >
          {{ tpl.label }}
          <span v-if="!isTemplateUnlocked(tpl.value)" class="chip-lock">🔒</span>
        </button>
      </div>

      <!-- 名片主图 -->
      <div class="card-image-wrapper">
        <img
          :src="cardImage"
          class="card-image"
          alt="宠物名片"
          @longpress="onLongPress"
        />
      </div>

      <div class="viral-insights">
        <div class="insight-item">
          <div class="insight-value">{{ viralProfile.charmPercentile }}%</div>
          <div class="insight-label">萌力值</div>
        </div>
        <div class="insight-item">
          <div class="insight-value">TOP {{ viralProfile.cityRank }}</div>
          <div class="insight-label">同城名次</div>
        </div>
        <div class="insight-item">
          <div class="insight-value">{{ viralProfile.rarityLabel }}</div>
          <div class="insight-label">品种热度</div>
        </div>
      </div>

      <!-- 操作按钮组 -->
      <div class="action-buttons">
        <button class="btn-primary" @click="copyShareText">
          复制朋友圈文案 + 链接 🚀
        </button>

        <button class="btn-secondary" style="margin-top: 10px;" @click="copyShareLink">
          复制专属邀请链接
        </button>

        <button class="btn-secondary" style="margin-top: 10px;" @click="saveCard">
          保存名片到相册 💾
        </button>

        <button
          v-if="comparisonImage"
          class="btn-secondary"
          style="margin-top: 10px;"
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

        <p v-if="shareNotice" class="share-notice">{{ shareNotice }}</p>
      </div>

      <div class="reward-panel">
        <p class="reward-title">邀请奖励进度</p>
        <p class="reward-text">已邀请 {{ rewardProgress.referralCount }} 人，当前等级：{{ rewardProgress.rewardLevel }}</p>
        <p v-if="!rewardProgress.isAllUnlocked" class="reward-next">
          下一个奖励：邀请满 {{ rewardProgress.nextTarget }} 人可{{ rewardProgress.nextTitle }}
        </p>
        <p v-else class="reward-next">邀请奖励已全部解锁，可继续邀请提升曝光</p>
      </div>

      <!-- 进群 CTA -->
      <div class="group-cta" @click="onGroupCtaClick">
        <div class="cta-content">
          <div class="cta-icon">🎉</div>
          <div class="cta-text">
            <p class="cta-title">加入{{ cardData.breed }}群，找到同类人</p>
            <p class="cta-sub">{{ groupRoute.routeLabel }} · {{ groupRoute.advisoryText }}</p>
            <p class="cta-sub">路由：{{ groupRoute.routeKey }}</p>
          </div>
          <div class="cta-arrow">→</div>
        </div>

        <div class="qr-placeholder">
          <img
            v-if="groupQrAvailable"
            :src="groupQrcode"
            class="qr-image"
            alt="进群二维码"
            @load="onGroupQrLoad"
            @error="onGroupQrError"
          />
          <div v-else class="qr-box">
            <span class="qr-icon">📱</span>
            <span class="qr-text">企微二维码占位</span>
            <span class="qr-hint">可在 public/qrcode.png 替换</span>
          </div>
        </div>

        <div class="lead-form" @click.stop>
          <select v-model="groupLeadIntent" class="form-input">
            <option>同品种交流</option>
            <option>选粮和用品建议</option>
            <option>线下活动</option>
            <option>问诊与健康咨询</option>
          </select>
          <input
            v-model="groupLeadWechat"
            class="form-input"
            placeholder="留下微信号（选填），优先进群"
            maxlength="40"
          />
          <input
            v-model="groupLeadNote"
            class="form-input"
            placeholder="备注（选填）：如宠物年龄、近期困扰"
            maxlength="50"
            style="margin-top: 8px;"
          />
          <button class="btn-secondary" style="margin-top: 8px;" @click="submitGroupIntent" :disabled="groupLeadSubmitted">
            {{ groupLeadSubmitted ? '已提交进群意向' : '提交进群意向' }}
          </button>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCardGenerator } from '../composables/useCardGenerator'
import { useWxAuth } from '../composables/useWxAuth'
import {
  trackEvent,
  trackFunnel,
  createShareLink,
  getAttributionContext,
  getTrackingContextSnapshot,
  EVENTS,
  FUNNEL_STEPS
} from '../utils/tracking'
import { buildViralProfile, buildShareMessage } from '../utils/viralProfile'
import { resolveGroupRoute } from '../data/groupQrcodes'
import { callFunction } from '../utils/cloudbase'
import { getBreedPercentageText } from '../data/breeds'

const router = useRouter()
const cardData = ref({})
const viralProfile = ref({
  charmPercentile: 88,
  cityRank: 35,
  rarityLabel: '人气品种'
})
const cardImage = ref(null)
const comparisonImage = ref(null)
const cardSaved = ref(false)
const showComparison = ref(false)
const shareNotice = ref('')
const sharePayload = ref({ share_id: '', inviter_id: '', share_url: '' })
const shareTextMessage = ref('')
const groupLeadWechat = ref('')
const groupLeadIntent = ref('同品种交流')
const groupLeadNote = ref('')
const groupLeadSubmitted = ref(false)
const groupQrcode = ref('')
const groupQrAvailable = ref(false)
const groupRoute = ref({
  routeType: 'default',
  routeKey: 'default_all',
  routeLabel: '全国综合交流群',
  advisoryText: ''
})
const rewardProgress = ref({
  referralCount: 0,
  rewardLevel: 'none',
  nextTarget: 1,
  nextTitle: '解锁同城排行模板',
  isAllUnlocked: false,
  remainingCount: 1
})
const activeTemplate = ref('meme')

const templateOptions = [
  { value: 'meme', label: '经典名片', requiredCount: 0 },
  { value: 'ranking', label: '同城排行', requiredCount: 1 },
  { value: 'match', label: '交友邀请', requiredCount: 3 }
]

const rewardMilestones = [
  { count: 1, title: '解锁同城排行模板' },
  { count: 3, title: '解锁交友邀请模板' },
  { count: 5, title: '解锁优先进群权益' }
]

const { generating, generateCard, generateComparisonCard } = useCardGenerator()
const { requestAuth, openId, checkAuth } = useWxAuth()

const isQuickMode = computed(() => Boolean(cardData.value.quickMode))
const unlockedTemplates = computed(() => {
  const count = Number(rewardProgress.value.referralCount) || 0
  return {
    meme: true,
    ranking: count >= 1,
    match: count >= 3
  }
})

onMounted(async () => {
  const stored = sessionStorage.getItem('pet_card_data')
  if (!stored) {
    router.replace('/')
    return
  }

  cardData.value = normalizeCardData(JSON.parse(stored))
  activeTemplate.value = cardData.value.templateStyle || 'meme'

  viralProfile.value = buildViralProfile(cardData.value)
  cardData.value.viralProfile = viralProfile.value

  groupRoute.value = resolveGroupRoute(cardData.value)
  groupQrcode.value = groupRoute.value.qrcode
  groupQrAvailable.value = Boolean(groupQrcode.value)

  sharePayload.value = createShareLink({
    campaign: 'pet_card',
    breed: cardData.value.breed,
    city: cardData.value.city
  })
  shareTextMessage.value = buildShareMessage(cardData.value, viralProfile.value, sharePayload.value.share_url)

  trackEvent(EVENTS.SHARE_LINK_CREATED, {
    share_id: sharePayload.value.share_id,
    inviter_id: sharePayload.value.inviter_id,
    template_style: activeTemplate.value
  })

  checkAuth()
  await syncProfileStatus(false)
  ensureActiveTemplateUnlocked()

  await generateMainCard()
})

async function generateMainCard() {
  cardData.value.templateStyle = activeTemplate.value
  cardData.value.viralProfile = viralProfile.value

  try {
    trackEvent(EVENTS.CARD_GENERATE_STARTED, {
      breed: cardData.value.breed,
      template_style: activeTemplate.value,
      quick_mode: Boolean(cardData.value.quickMode)
    })

    cardImage.value = await generateCard(cardData.value, {
      templateStyle: activeTemplate.value
    })

    trackEvent(EVENTS.CARD_GENERATED, {
      breed: cardData.value.breed,
      template_style: activeTemplate.value,
      quick_mode: Boolean(cardData.value.quickMode)
    })

    trackFunnel(FUNNEL_STEPS.CARD_GENERATED, {
      breed: cardData.value.breed,
      template_style: activeTemplate.value
    })
  } catch (e) {
    trackEvent(EVENTS.CARD_GENERATE_FAILED, {
      breed: cardData.value?.breed || '',
      template_style: activeTemplate.value,
      error_message: e?.message || 'unknown'
    })
    console.error('生成名片失败:', e)
  }
}

async function onTemplateChange(nextTemplate) {
  if (nextTemplate === activeTemplate.value || generating.value) return

  if (!isTemplateUnlocked(nextTemplate)) {
    trackEvent(EVENTS.TEMPLATE_LOCKED_CLICKED, {
      template_style: nextTemplate,
      referral_count: rewardProgress.value.referralCount
    })
    showShareNotice(getTemplateLockHint(nextTemplate))
    return
  }

  activeTemplate.value = nextTemplate
  trackEvent(EVENTS.TEMPLATE_SELECTED, {
    template_style: nextTemplate,
    breed: cardData.value.breed
  })

  await generateMainCard()
}

async function saveCard() {
  trackEvent(EVENTS.CARD_SAVED, {
    breed: cardData.value.breed,
    template_style: activeTemplate.value
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

  // MVP-2: 保存时触发微信授权
  await requestAuth()

  // 下载图片
  downloadImage(cardImage.value, '我家毛孩子的名片.png')

  // MVP-2: 保存后解锁对比卡
  generateComparisonCardAsync()

  // 用户建档
  saveUserProfile()
}

async function generateComparisonCardAsync() {
  try {
    const stats = {
      percentageText: getBreedPercentageText(cardData.value.breed),
      sameCityCount: Math.floor(Math.random() * 200) + 50,
      totalCount: Math.floor(Math.random() * 2000) + 500
    }
    comparisonImage.value = await generateComparisonCard(cardData.value, stats)
    trackEvent(EVENTS.COMPARISON_VIEWED, {
      breed: cardData.value.breed,
      template_style: activeTemplate.value
    })
  } catch (e) {
    console.error('对比卡生成失败:', e)
  }
}

async function saveUserProfile() {
  await syncProfileStatus(true)
}

async function syncProfileStatus(incrementCardCount = false) {
  try {
    const attribution = getAttributionContext()
    const tracking = getTrackingContextSnapshot()
    const res = await callFunction('user-profile', {
      action: 'save',
      data: {
        openid: openId.value || `visitor_${tracking.visitor_id}`,
        breed: cardData.value.breed,
        city: cardData.value.city,
        ageText: cardData.value.age,
        hasJoinedGroup: false,
        source: attribution.source || 'direct',
        shareId: attribution.share_id || '',
        inviterId: attribution.inviter_id || '',
        quickMode: Boolean(cardData.value.quickMode),
        templateStyle: activeTemplate.value,
        incrementCardCount
      }
    })

    if (res?.profile) {
      rewardProgress.value = buildRewardProgress(res.profile)
    }

    if (res?.inviterReward?.newlyUnlocked) {
      trackEvent(EVENTS.REFERRAL_REWARD_UNLOCKED, {
        inviter_id: res.inviterReward.inviterId,
        reward_level: res.inviterReward.newlyUnlocked.level,
        reward_title: res.inviterReward.newlyUnlocked.title,
        referral_count: res.inviterReward.referralCount
      })
    }
  } catch (e) {
    console.warn('建档/奖励同步失败:', e)
  }
}

async function copyShareLink() {
  const ok = await copyToClipboard(sharePayload.value.share_url)
  if (ok) {
    trackEvent(EVENTS.SHARE_LINK_COPIED, {
      share_id: sharePayload.value.share_id,
      template_style: activeTemplate.value
    })
    trackFunnel(FUNNEL_STEPS.SHARE_LINK_COPIED, {
      share_id: sharePayload.value.share_id
    })
    showShareNotice('已复制专属邀请链接')
    return
  }

  trackEvent(EVENTS.SHARE_COPY_FAILED, {
    type: 'link',
    share_id: sharePayload.value.share_id
  })
  showShareNotice('复制失败，请手动长按复制')
}

async function copyShareText() {
  const ok = await copyToClipboard(shareTextMessage.value)
  if (ok) {
    trackEvent(EVENTS.SHARE_TEXT_COPIED, {
      share_id: sharePayload.value.share_id,
      template_style: activeTemplate.value
    })
    trackFunnel(FUNNEL_STEPS.SHARE_LINK_COPIED, {
      share_id: sharePayload.value.share_id,
      copied_payload: 'text_and_link'
    })
    showShareNotice('已复制朋友圈文案和链接')
    return
  }

  trackEvent(EVENTS.SHARE_COPY_FAILED, {
    type: 'text',
    share_id: sharePayload.value.share_id
  })
  showShareNotice('复制失败，请手动长按复制')
}

async function submitGroupIntent() {
  if (groupLeadSubmitted.value) return

  try {
    const tracking = getTrackingContextSnapshot()
    const attribution = getAttributionContext()
    await callFunction('user-profile', {
      action: 'save',
      data: {
        openid: openId.value || `lead_${tracking.visitor_id}`,
        breed: cardData.value.breed,
        city: cardData.value.city,
        ageText: cardData.value.age,
        hasJoinedGroup: false,
        hasJoinIntent: true,
        wechatId: groupLeadWechat.value || '',
        joinIntentType: groupLeadIntent.value,
        joinIntentNote: groupLeadNote.value || '',
        groupRouteType: groupRoute.value.routeType || 'default',
        groupRouteKey: groupRoute.value.routeKey || 'default_all',
        groupRouteLabel: groupRoute.value.routeLabel || '',
        source: attribution.source || 'direct',
        shareId: attribution.share_id || '',
        inviterId: attribution.inviter_id || '',
        incrementCardCount: false
      }
    })

    groupLeadSubmitted.value = true
    trackEvent(EVENTS.GROUP_INTENT_SUBMITTED, {
      breed: cardData.value.breed,
      city: cardData.value.city,
      has_wechat: Boolean(groupLeadWechat.value),
      intent_type: groupLeadIntent.value,
      route_key: groupRoute.value.routeKey || 'default_all'
    })
    trackFunnel(FUNNEL_STEPS.GROUP_INTENT_SUBMITTED, {
      breed: cardData.value.breed,
      city: cardData.value.city
    })
    showShareNotice('已提交进群意向，稍后会优先拉你进群')
  } catch (e) {
    console.warn('提交进群意向失败:', e)
    showShareNotice('提交失败，请稍后重试')
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
    city: cardData.value.city,
    template_style: activeTemplate.value,
    route_key: groupRoute.value.routeKey || 'default_all'
  })
  trackFunnel(FUNNEL_STEPS.GROUP_CTA_CLICKED, {
    breed: cardData.value.breed,
    city: cardData.value.city,
    route_key: groupRoute.value.routeKey || 'default_all'
  })
}

function onGroupQrLoad() {
  groupQrAvailable.value = true
}

function onGroupQrError() {
  groupQrAvailable.value = false
}

function goToInfoEnhance() {
  sessionStorage.setItem('pet_card_data', JSON.stringify({
    ...cardData.value,
    quickMode: false
  }))
  router.push('/info')
}

function goHome() {
  sessionStorage.removeItem('pet_card_data')
  router.replace('/')
}

function showShareNotice(message) {
  shareNotice.value = message
  window.clearTimeout(showShareNotice.timer)
  showShareNotice.timer = window.setTimeout(() => {
    shareNotice.value = ''
  }, 2200)
}
showShareNotice.timer = null

function buildRewardProgress(profile = {}) {
  const referralCount = Number(profile.referralCount) || 0
  const rewardLevel = getRewardLevelText(profile.rewardLevel)
  const nextMilestone = rewardMilestones.find((item) => referralCount < item.count)

  if (!nextMilestone) {
    return {
      referralCount,
      rewardLevel,
      nextTarget: rewardMilestones[rewardMilestones.length - 1].count,
      nextTitle: '已解锁全部邀请奖励',
      isAllUnlocked: true,
      remainingCount: 0
    }
  }

  return {
    referralCount,
    rewardLevel,
    nextTarget: nextMilestone.count,
    nextTitle: nextMilestone.title,
    isAllUnlocked: false,
    remainingCount: nextMilestone.count - referralCount
  }
}

function getRewardLevelText(level = 'none') {
  if (level === 'starter') return '新锐邀请官'
  if (level === 'pro') return '裂变加速官'
  if (level === 'partner') return '超级推荐官'
  return '未解锁'
}

function normalizeCardData(data) {
  return {
    photoUrl: data.photoUrl || '',
    breed: data.breed || '神秘品种',
    breedModified: Boolean(data.breedModified),
    nickname: data.nickname || '我家毛孩子',
    gender: data.gender || '不确定',
    age: data.age || '保密',
    city: data.city || '同城',
    tags: Array.isArray(data.tags) && data.tags.length > 0
      ? data.tags
      : ['社交牛牛', '撒娇达人', '拍照模特'],
    signature: data.signature || '',
    availableTime: data.availableTime || '',
    quickMode: Boolean(data.quickMode),
    templateStyle: data.templateStyle || 'meme'
  }
}

function isTemplateUnlocked(templateStyle) {
  return Boolean(unlockedTemplates.value[templateStyle])
}

function getFirstUnlockedTemplate() {
  const first = templateOptions.find((item) => isTemplateUnlocked(item.value))
  return first?.value || 'meme'
}

function ensureActiveTemplateUnlocked() {
  if (isTemplateUnlocked(activeTemplate.value)) return
  const fallbackTemplate = getFirstUnlockedTemplate()
  activeTemplate.value = fallbackTemplate
  cardData.value.templateStyle = fallbackTemplate
}

function getTemplateLockHint(templateStyle) {
  const option = templateOptions.find((item) => item.value === templateStyle)
  if (!option || option.requiredCount <= 0) return '该模板暂未开放'

  const remain = Math.max(0, option.requiredCount - rewardProgress.value.referralCount)
  if (remain <= 0) return '该模板已解锁，点一下即可切换'
  return `再邀请 ${remain} 位好友解锁「${option.label}」`
}

async function copyToClipboard(content) {
  if (!content) return false

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(content)
      return true
    } catch (e) {
      // fallback to textarea
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
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.quick-mode-tip {
  margin: -8px auto 14px;
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #7d5a3a;
  background: #fff1df;
  border: 1px solid rgba(255, 185, 97, 0.35);
  padding: 7px 12px;
  border-radius: 999px;
}

.btn-link-inline {
  border: none;
  background: transparent;
  color: #d25d2e;
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
}

.template-switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.template-chip {
  flex: 1;
  border: 1.5px solid rgba(255, 180, 160, 0.45);
  border-radius: 999px;
  background: #fff;
  color: var(--text-secondary);
  padding: 9px 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.template-chip.active {
  background: #fff0f2;
  border-color: var(--primary);
  color: var(--primary-dark);
}

.template-chip.locked {
  opacity: 0.62;
}

.chip-lock {
  font-size: 12px;
}

.card-image-wrapper {
  margin: 16px 0;
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: 0 12px 34px rgba(180, 120, 100, 0.12);
  border: 1px solid rgba(255, 180, 160, 0.25);
}

.card-image {
  width: 100%;
  display: block;
}

.viral-insights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 18px;
}

.insight-item {
  background: #fff;
  border: 1px solid rgba(255, 180, 160, 0.32);
  border-radius: 14px;
  padding: 10px 8px;
}

.insight-value {
  font-size: 16px;
  font-weight: 900;
  color: var(--primary-dark);
  line-height: 1.25;
}

.insight-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.action-buttons {
  margin: 12px 0 24px;
}

.unlock-hint {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 12px;
  background: linear-gradient(180deg, #F0FFF5 0%, #E8FAF0 100%);
  border: 1px dashed rgba(126, 217, 166, 0.5);
  border-radius: 14px;
  color: #3DA06B;
  font-size: 14px;
  cursor: default;
}

.share-notice {
  margin-top: 8px;
  font-size: 13px;
  color: #3f8a5f;
}

.reward-panel {
  margin: 0 0 18px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff8e8;
  border: 1px solid rgba(255, 197, 112, 0.45);
  text-align: left;
}

.reward-title {
  font-size: 14px;
  font-weight: 800;
  color: #8a4f1b;
}

.reward-text {
  margin-top: 4px;
  font-size: 13px;
  color: #8a5b31;
}

.reward-next {
  margin-top: 2px;
  font-size: 12px;
  color: #9a6e44;
}

/* 进群 CTA */
.group-cta {
  margin: 20px 0;
  padding: 20px;
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
  gap: 10px;
  margin-bottom: 14px;
}

.cta-icon {
  font-size: 32px;
}

.cta-text {
  flex: 1;
  text-align: left;
}

.cta-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--primary);
}

.cta-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.cta-arrow {
  font-size: 22px;
  color: var(--primary);
}

.qr-placeholder {
  display: flex;
  justify-content: center;
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

.lead-form {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
