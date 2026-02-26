import { ref } from 'vue'
import { callFunction, isCloudbaseReady } from '../utils/cloudbase'
import { hotBreeds } from '../data/breeds'
import { trackEvent, trackFunnel, EVENTS, FUNNEL_STEPS } from '../utils/tracking'

const FORCE_MOCK_IDENTIFY = String(import.meta.env.VITE_MOCK_BREED_IDENTIFY || '').toLowerCase() === 'true'
const IS_CLOUDBASE_READY = isCloudbaseReady()

export function useBreedIdentify() {
  const loading = ref(false)
  const result = ref(null)
  const error = ref(null)
  const identifyMode = ref('cloud')

  async function identifyBreed(imageBase64) {
    loading.value = true
    error.value = null
    result.value = null

    const shouldUseMockDirectly = FORCE_MOCK_IDENTIFY || !IS_CLOUDBASE_READY

    try {
      trackEvent(EVENTS.BREED_IDENTIFY_STARTED, {
        identify_strategy: shouldUseMockDirectly ? 'mock_direct' : 'cloud_first'
      })

      if (shouldUseMockDirectly) {
        const mockRes = buildMockIdentifyResult(imageBase64)
        applyIdentifyResult(mockRes, 'mock', IS_CLOUDBASE_READY ? 'force_mock' : 'cloudbase_not_ready')
        return mockRes
      }

      const res = await callFunction('breed-identify', {
        image: imageBase64
      })

      if (!res || res.error) {
        throw new Error(res?.error || 'breed_identify_failed')
      }

      applyIdentifyResult(res, 'cloud')
      return res
    } catch (e) {
      // 云端失败时自动降级到本地mock，保证流程可体验
      trackEvent(EVENTS.BREED_IDENTIFY_FAILED, {
        error_message: e?.message || 'unknown'
      })

      const mockRes = buildMockIdentifyResult(imageBase64)
      applyIdentifyResult(mockRes, 'mock', 'cloud_error')
      return mockRes
    } finally {
      loading.value = false
    }
  }

  function applyIdentifyResult(res, mode, reason = '') {
    identifyMode.value = mode
    error.value = null
    result.value = res

    const confidenceBucket = getConfidenceBucket(res.confidence)

    if (mode === 'mock') {
      trackEvent(EVENTS.BREED_IDENTIFY_MOCK_USED, {
        reason,
        breed: res.breed,
        confidence: res.confidence,
        confidence_bucket: confidenceBucket
      })
    }

    trackEvent(EVENTS.BREED_IDENTIFIED, {
      breed: res.breed,
      confidence: res.confidence,
      candidates: res.candidates?.map(c => c.breed).join(','),
      pet_type: res.petType || 'unknown',
      confidence_bucket: confidenceBucket,
      identify_mode: mode
    })

    trackFunnel(FUNNEL_STEPS.BREED_IDENTIFIED, {
      breed: res.breed,
      confidence_bucket: confidenceBucket,
      identify_mode: mode
    })
  }

  return {
    loading,
    result,
    error,
    identifyMode,
    identifyBreed
  }
}

function buildMockIdentifyResult(imageBase64 = '') {
  const seed = hashText(imageBase64.slice(0, 5000))
  const petType = seed % 2 === 0 ? 'dog' : 'cat'
  const pool = hotBreeds[petType]

  const firstIndex = seed % pool.length
  const secondIndex = (firstIndex + 3) % pool.length
  const thirdIndex = (firstIndex + 7) % pool.length

  const topConfidence = Number((0.78 + (seed % 15) / 100).toFixed(2))
  const secondConfidence = Number((Math.max(0.08, (1 - topConfidence) * 0.65)).toFixed(2))
  const thirdConfidence = Number(Math.max(0.02, 1 - topConfidence - secondConfidence).toFixed(2))

  return {
    petType,
    breed: pool[firstIndex],
    confidence: topConfidence,
    candidates: [
      { breed: pool[firstIndex], confidence: topConfidence },
      { breed: pool[secondIndex], confidence: secondConfidence },
      { breed: pool[thirdIndex], confidence: thirdConfidence }
    ],
    multiPet: false,
    description: '演示模式：本地模拟识别结果'
  }
}

function getConfidenceBucket(confidence = 0) {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}

function hashText(text) {
  let value = 0
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 33 + text.charCodeAt(i)) >>> 0
  }
  return value
}
