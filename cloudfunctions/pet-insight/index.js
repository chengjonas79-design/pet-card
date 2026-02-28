/**
 * 云函数：pet-insight
 * 生成 AI 性格解读、分享话术和私域稀缺权益文案
 *
 * 入参:
 * {
 *   breed, city, nickname, personalityTitle,
 *   tags: string[], answers: object
 * }
 */
const tcb = require('@cloudbase/node-sdk')

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const ai = app.ai()

const MODEL_GROUP = process.env.CLOUDBASE_AI_MODEL_GROUP || 'hunyuan-exp'
const MODEL_NAME = process.env.CLOUDBASE_AI_MODEL_NAME || 'hunyuan-lite'

const SYSTEM_PROMPT = `你是宠物增长产品的AI策略助手。请根据输入生成“可分享、可传播、可进私域”的JSON结果。

要求：
1) 用中文输出，口吻自然，不要官话
2) 结果要有稀缺感，且不过度夸张
3) 必须严格返回 JSON，不要解释性文字
4) 每个数组最多3条，每条不超过28字

JSON格式：
{
  "personaTitle": "性格标题",
  "personaSummary": "一段总结",
  "shareHook": "朋友圈/群可直接发的一句话",
  "scarcityCode": "如PET1234",
  "scarcityTitle": "稀缺权益标题",
  "inviteTask": "邀请任务文案",
  "privateBenefits": ["", "", ""],
  "iceBreakers": ["", "", ""]
}`

exports.main = async (event) => {
  const payload = sanitizePayload(event)

  try {
    const aiResult = await callCloudbaseAI(payload)
    const normalized = normalizeInsight(aiResult, payload)
    return {
      ...normalized,
      generatedBy: 'cloud_ai'
    }
  } catch (err) {
    console.error('[pet-insight] CloudBase AI 调用失败:', err)
    const fallback = buildFallbackInsight(payload)
    return {
      ...fallback,
      generatedBy: 'fallback'
    }
  }
}

async function callCloudbaseAI(payload) {
  const model = ai.createModel(MODEL_GROUP)
  const response = await model.generateText({
    model: MODEL_NAME,
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: JSON.stringify(payload)
      }
    ]
  })

  return parseModelJson(response?.text || '')
}

function parseModelJson(text) {
  const raw = String(text || '').trim()
  if (!raw) throw new Error('empty_model_response')

  try {
    return JSON.parse(raw)
  } catch (e) {
    // fallback parse codeblock JSON
  }

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('invalid_json_response')
  return JSON.parse(match[0])
}

function normalizeInsight(raw = {}, fallbackPayload = {}) {
  const fallback = buildFallbackInsight(fallbackPayload)

  const privateBenefits = Array.isArray(raw.privateBenefits)
    ? raw.privateBenefits.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
    : []
  const iceBreakers = Array.isArray(raw.iceBreakers)
    ? raw.iceBreakers.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
    : []

  return {
    personaTitle: String(raw.personaTitle || fallback.personaTitle),
    personaSummary: String(raw.personaSummary || fallback.personaSummary),
    shareHook: String(raw.shareHook || fallback.shareHook),
    scarcityCode: String(raw.scarcityCode || fallback.scarcityCode),
    scarcityTitle: String(raw.scarcityTitle || fallback.scarcityTitle),
    inviteTask: String(raw.inviteTask || fallback.inviteTask),
    privateBenefits: privateBenefits.length > 0 ? privateBenefits : fallback.privateBenefits,
    iceBreakers: iceBreakers.length > 0 ? iceBreakers : fallback.iceBreakers
  }
}

function sanitizePayload(event = {}) {
  return {
    breed: String(event.breed || '神秘品种').slice(0, 30),
    city: String(event.city || '同城').slice(0, 20),
    nickname: String(event.nickname || '我家毛孩子').slice(0, 20),
    personalityTitle: String(event.personalityTitle || '').slice(0, 30),
    tags: Array.isArray(event.tags)
      ? event.tags.map((item) => String(item || '').slice(0, 16)).filter(Boolean).slice(0, 5)
      : [],
    answers: typeof event.answers === 'object' && event.answers ? event.answers : {}
  }
}

function buildFallbackInsight(payload = {}) {
  const breed = payload.breed || '毛孩子'
  const city = payload.city || '同城'
  const nickname = payload.nickname || '我家毛孩子'
  const tags = Array.isArray(payload.tags) ? payload.tags : []
  const personaTitle = payload.personalityTitle || inferPersonaByTags(tags)
  const topTags = tags.length > 0 ? tags.slice(0, 3).join('、') : '稳定陪伴、社交友好、生活有趣'
  const seed = hash(`${breed}_${city}_${nickname}_${personaTitle}_${topTags}`)
  const scarcityCode = `PET${String((seed % 9000) + 1000)}`

  return {
    personaTitle,
    personaSummary: `${nickname}偏「${personaTitle}」，核心标签是${topTags}。`,
    shareHook: `${nickname}的AI性格解读出来了：${personaTitle}（${topTags}），你家毛孩子是哪一型？`,
    scarcityCode,
    scarcityTitle: `同城AI社交雷达编号 #${scarcityCode}`,
    inviteTask: `24小时内邀请2位好友完成测试，可解锁${city}${breed}优先匹配`,
    privateBenefits: [
      `加入${city}群后优先匹配同品种`,
      '领取7天养宠建议（喂养+行为）',
      '本周线下活动优先通知'
    ],
    iceBreakers: [
      `我家是${personaTitle}，你家是哪型？`,
      `同城${breed}周末约遛宠吗？`,
      `你家最像这三个标签里的哪一个：${topTags}？`
    ]
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
