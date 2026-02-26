/**
 * 云函数：breed-identify
 * 基于 CloudBase AI（默认混元）识别宠物品种
 *
 * 入参: { image: "base64图片数据" }
 * 出参: { breed, confidence, candidates, petType, multiPet, description }
 */
const tcb = require('@cloudbase/node-sdk')

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const ai = app.ai()

// 通过环境变量配置模型分组与模型名，方便后续切换 DeepSeek/自定义模型组
const MODEL_GROUP = process.env.CLOUDBASE_AI_MODEL_GROUP || 'hunyuan-exp'
const MODEL_NAME = process.env.CLOUDBASE_AI_MODEL_NAME || 'hunyuan-vision'

const SYSTEM_PROMPT = `你是专业宠物品种识别专家。请分析图片中的宠物并返回 JSON。

规则：
1) 图片中有宠物（猫或狗）时，识别主宠物品种
2) 多只宠物时，识别最显眼/最大的那只
3) 没有宠物时返回 petType: "none"
4) 给出 0-1 的置信度和前 3 个候选品种

严格只返回 JSON，不要额外说明。格式如下：
{
  "petType": "dog" | "cat" | "none",
  "breed": "品种名称",
  "confidence": 0.85,
  "candidates": [
    {"breed": "品种1", "confidence": 0.85},
    {"breed": "品种2", "confidence": 0.10},
    {"breed": "品种3", "confidence": 0.05}
  ],
  "multiPet": false,
  "description": "一句话描述"
}`

exports.main = async (event) => {
  const { image } = event

  if (!image) {
    return { error: '缺少图片数据' }
  }

  const { mediaType, imageBase64 } = parseImageData(image)

  try {
    const aiResult = await callCloudbaseAI({ imageBase64, mediaType })
    return normalizeResult(aiResult)
  } catch (err) {
    console.error('[breed-identify] CloudBase AI 调用失败:', err)
    return {
      error: '识别失败',
      breed: '',
      confidence: 0,
      candidates: [],
      petType: 'unknown',
      multiPet: false,
      description: ''
    }
  }
}

async function callCloudbaseAI({ imageBase64, mediaType }) {
  const model = ai.createModel(MODEL_GROUP)

  // CloudBase AI SDK 会透传模型方参数；多模态输入按 OpenAI content 数组结构传递
  const response = await model.generateText({
    model: MODEL_NAME,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请识别这张图片中的宠物品种。'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mediaType};base64,${imageBase64}`
            }
          }
        ]
      }
    ]
  })

  return parseModelJson(response?.text || '')
}

function parseImageData(image) {
  const dataUrlMatch = image.match(/^data:(image\/\w+);base64,(.+)$/)
  if (dataUrlMatch) {
    return {
      mediaType: dataUrlMatch[1],
      imageBase64: dataUrlMatch[2]
    }
  }

  // 兼容直接传裸 base64 的情况
  return {
    mediaType: 'image/jpeg',
    imageBase64: image
  }
}

function parseModelJson(text) {
  const payload = String(text || '').trim()
  if (!payload) throw new Error('empty_model_response')

  // 优先直接解析
  try {
    return JSON.parse(payload)
  } catch (e) {
    // 兜底解析 markdown/codeblock 包裹 JSON
  }

  const jsonMatch = payload.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('invalid_json_response')
  }

  return JSON.parse(jsonMatch[0])
}

function normalizeResult(raw = {}) {
  const petType = ['dog', 'cat', 'none'].includes(raw.petType) ? raw.petType : 'unknown'
  const breed = String(raw.breed || '').trim()
  const confidence = clamp01(Number(raw.confidence) || 0)

  const candidates = Array.isArray(raw.candidates)
    ? raw.candidates
      .map((item) => ({
        breed: String(item?.breed || '').trim(),
        confidence: clamp01(Number(item?.confidence) || 0)
      }))
      .filter((item) => item.breed)
      .slice(0, 3)
    : []

  return {
    petType,
    breed,
    confidence,
    candidates,
    multiPet: Boolean(raw.multiPet),
    description: String(raw.description || '').trim()
  }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return Number(value.toFixed(4))
}
