/**
 * 云函数：breed-identify
 * 调用通义千问VL多模态模型识别宠物品种
 *
 * 入参: { image: "base64图片数据" }
 * 出参: { breed, confidence, candidates, petType }
 */
const https = require('https')

// TODO: 替换为真实的通义千问 API Key
// 在 CloudBase 控制台 -> 云函数 -> 环境变量中配置 DASHSCOPE_API_KEY
const API_KEY = process.env.DASHSCOPE_API_KEY || 'your-dashscope-api-key'

exports.main = async (event) => {
  const { image } = event

  if (!image) {
    return { error: '缺少图片数据' }
  }

  // 去除 base64 前缀
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

  try {
    const result = await callQwenVL(base64Data)
    return result
  } catch (err) {
    console.error('通义千问调用失败:', err)
    return {
      error: '识别失败',
      breed: '',
      confidence: 0,
      candidates: [],
      petType: 'unknown'
    }
  }
}

function callQwenVL(imageBase64) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'qwen-vl-plus',
      input: {
        messages: [
          {
            role: 'system',
            content: [
              {
                text: `你是一个专业的宠物品种识别专家。请分析图片中的宠物，返回JSON格式结果。

规则：
1. 如果图片中有宠物（猫或狗），识别其品种
2. 如果图片中有多只宠物，识别最显眼/最大的那只
3. 如果图片中没有宠物，返回 petType: "none"
4. 给出置信度(0-1)和前3个候选品种

必须严格按以下JSON格式返回，不要包含任何其他文字：
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
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                image: `data:image/jpeg;base64,${imageBase64}`
              },
              {
                text: '请识别这张图片中的宠物品种。'
              }
            ]
          }
        ]
      },
      parameters: {
        result_format: 'message'
      }
    })

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      path: '/api/v1/services/aigc/multimodal-generation/generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const response = JSON.parse(data)

          if (response.output?.choices?.[0]?.message?.content) {
            const content = response.output.choices[0].message.content
            // 提取文本内容
            let textContent = ''
            if (Array.isArray(content)) {
              textContent = content.find(c => c.text)?.text || ''
            } else {
              textContent = content
            }

            // 解析JSON
            const jsonMatch = textContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0])
              resolve(result)
            } else {
              resolve({
                breed: '',
                confidence: 0,
                candidates: [],
                petType: 'unknown',
                error: 'AI返回格式异常'
              })
            }
          } else {
            console.error('API响应异常:', data)
            resolve({
              breed: '',
              confidence: 0,
              candidates: [],
              petType: 'unknown',
              error: response.message || 'API响应异常'
            })
          }
        } catch (e) {
          console.error('解析响应失败:', e, data)
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.write(requestBody)
    req.end()
  })
}
