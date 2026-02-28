import { ref } from 'vue'
import { callFunction, isCloudbaseReady } from '../utils/cloudbase'
import { trackEvent, EVENTS } from '../utils/tracking'

const FORCE_MOCK_INSIGHT = String(import.meta.env.VITE_MOCK_PET_INSIGHT || '').toLowerCase() === 'true'
const IS_CLOUDBASE_READY = isCloudbaseReady()

export function usePetInsight() {
  const loading = ref(false)
  const insight = ref(null)
  const insightMode = ref('local')

  async function generateInsight(cardData = {}) {
    const payload = buildInsightPayload(cardData)
    loading.value = true

    trackEvent(EVENTS.AI_INSIGHT_STARTED, {
      breed: payload.breed,
      city: payload.city
    })

    try {
      if (FORCE_MOCK_INSIGHT || !IS_CLOUDBASE_READY) {
        throw new Error(FORCE_MOCK_INSIGHT ? 'force_mock_insight' : 'cloudbase_not_ready')
      }

      const res = await callFunction('pet-insight', payload)
      if (!res || res.error) {
        throw new Error(res?.error || 'pet_insight_failed')
      }

      const normalized = normalizeInsight(res, payload)
      insight.value = normalized
      insightMode.value = normalized.generatedBy || 'cloud'

      trackEvent(EVENTS.AI_INSIGHT_GENERATED, {
        breed: payload.breed,
        city: payload.city,
        mode: insightMode.value
      })

      return normalized
    } catch (e) {
      const fallback = buildLocalInsight(payload)
      insight.value = fallback
      insightMode.value = 'fallback'

      trackEvent(EVENTS.AI_INSIGHT_FALLBACK_USED, {
        breed: payload.breed,
        city: payload.city,
        reason: e?.message || 'unknown'
      })

      return fallback
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    insight,
    insightMode,
    generateInsight
  }
}

function buildInsightPayload(cardData = {}) {
  return {
    breed: String(cardData.breed || '神秘品种'),
    city: String(cardData.city || '同城'),
    nickname: String(cardData.nickname || '我家毛孩子'),
    personalityTitle: String(cardData.personalityProfile?.title || ''),
    tags: Array.isArray(cardData.tags) ? cardData.tags.slice(0, 5) : [],
    answers: cardData.personalityProfile?.answers || {}
  }
}

function normalizeInsight(raw, fallbackPayload = {}) {
  const privateBenefits = Array.isArray(raw.privateBenefits) ? raw.privateBenefits.filter(Boolean).slice(0, 3) : []
  const iceBreakers = Array.isArray(raw.iceBreakers) ? raw.iceBreakers.filter(Boolean).slice(0, 3) : []

  return {
    personaTitle: String(raw.personaTitle || fallbackPayload.personalityTitle || '稳定陪伴型'),
    personaSummary: String(raw.personaSummary || ''),
    shareHook: String(raw.shareHook || ''),
    scarcityCode: String(raw.scarcityCode || ''),
    scarcityTitle: String(raw.scarcityTitle || ''),
    inviteTask: String(raw.inviteTask || ''),
    privateBenefits: privateBenefits.length > 0 ? privateBenefits : buildLocalInsight(fallbackPayload).privateBenefits,
    iceBreakers: iceBreakers.length > 0 ? iceBreakers : buildLocalInsight(fallbackPayload).iceBreakers,
    generatedBy: String(raw.generatedBy || 'cloud')
  }
}

function buildLocalInsight(payload = {}) {
  const breed = payload.breed || '毛孩子'
  const city = payload.city || '同城'
  const nickname = payload.nickname || '我家毛孩子'
  const tags = Array.isArray(payload.tags) ? payload.tags : []
  const personaTitle = payload.personalityTitle || inferPersonaByTags(tags)
  const seed = hash(`${breed}_${city}_${nickname}_${personaTitle}_${tags.join('_')}`)
  const scarcityCode = `PET${String((seed % 9000) + 1000)}`
  const topTags = tags.length > 0 ? tags.slice(0, 3).join('、') : '稳定陪伴、社交友好、生活有趣'

  return {
    personaTitle,
    personaSummary: `${nickname}是偏「${personaTitle}」的${breed}，关键标签：${topTags}。`,
    shareHook: `${nickname}的AI性格解读出来了：${personaTitle}（${topTags}），你家毛孩子是什么类型？`,
    scarcityCode,
    scarcityTitle: `同城AI社交雷达编号 #${scarcityCode}`,
    inviteTask: `24小时内邀请2位朋友完成测试，可解锁「${city}${breed}优先匹配」`,
    privateBenefits: [
      `加入${city}群后优先匹配同品种宠友`,
      '领取7天养宠建议（喂养/行为/社交）',
      '获得本周线下活动优先通知'
    ],
    iceBreakers: [
      `我家是${personaTitle}，你家是哪一型？`,
      `同城${breed}周末想约一起遛宠吗？`,
      `你家毛孩子最像哪一个标签：${topTags}？`
    ],
    generatedBy: 'fallback'
  }
}

function inferPersonaByTags(tags = []) {
  const text = tags.join('|')
  if (text.includes('社交') || text.includes('贴贴')) return '社牛小甜豆'
  if (text.includes('独立') || text.includes('观察')) return '慢热观察家'
  if (text.includes('运动') || text.includes('活力')) return '运动发电机'
  return '稳定陪伴型'
}

function hash(text) {
  let value = 0
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0
  }
  return value
}
