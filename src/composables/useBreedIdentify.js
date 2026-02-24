import { ref } from 'vue'
import { callFunction } from '../utils/cloudbase'
import { trackEvent, EVENTS } from '../utils/tracking'

export function useBreedIdentify() {
  const loading = ref(false)
  const result = ref(null)
  const error = ref(null)

  async function identifyBreed(imageBase64) {
    loading.value = true
    error.value = null
    result.value = null

    try {
      const res = await callFunction('breed-identify', {
        image: imageBase64
      })

      result.value = res

      // 埋点
      trackEvent(EVENTS.BREED_IDENTIFIED, {
        breed: res.breed,
        confidence: res.confidence,
        candidates: res.candidates?.map(c => c.breed).join(',')
      })

      return res
    } catch (e) {
      error.value = '识别失败，请重试'
      console.error('品种识别失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    result,
    error,
    identifyBreed
  }
}
