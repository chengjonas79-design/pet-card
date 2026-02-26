import { ref } from 'vue'
import { callFunction } from '../utils/cloudbase'
import { getTrackingContextSnapshot } from '../utils/tracking'

// MVP-2: 微信授权登录（保存名片时触发）
export function useWxAuth() {
  const isAuthed = ref(false)
  const userInfo = ref(null)
  const openId = ref(null)

  // 检查是否已授权
  function checkAuth() {
    const cached = localStorage.getItem('pet_card_openid')
    if (cached) {
      openId.value = cached
      isAuthed.value = true
      return true
    }
    return false
  }

  // 发起微信授权
  async function requestAuth() {
    // 如果已授权，直接返回
    if (checkAuth()) return true

    const appId = import.meta.env.VITE_WX_APPID
    const fallbackOpenId = getStableFallbackOpenId()

    // 非微信浏览器下直接走稳定 fallback，避免跳转失败影响主流程
    if (!isWechatBrowser()) {
      console.warn('[WxAuth] 当前不是微信浏览器，使用 fallback openid')
      openId.value = fallbackOpenId
      localStorage.setItem('pet_card_openid', fallbackOpenId)
      isAuthed.value = true
      return true
    }

    if (!appId || appId === 'your-wechat-appid') {
      console.warn('[WxAuth] 未配置微信 AppID，跳过授权')
      openId.value = fallbackOpenId
      localStorage.setItem('pet_card_openid', openId.value)
      isAuthed.value = true
      return true
    }

    // 微信网页授权 - 静默授权获取 openid
    const redirectUri = encodeURIComponent(window.location.href)
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=pet_card#wechat_redirect`

    // 检查 URL 中是否有 code 参数（授权回调）
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      // 用 code 换取 openid
      try {
        const res = await callFunction('wx-auth', { code })
        if (res?.openid) {
          openId.value = res.openid
          localStorage.setItem('pet_card_openid', res.openid)
          isAuthed.value = true

          // 清除 URL 中的 code 参数
          urlParams.delete('code')
          urlParams.delete('state')
          const cleanUrl = window.location.pathname +
            (urlParams.toString() ? '?' + urlParams.toString() : '')
          window.history.replaceState({}, '', cleanUrl)

          return true
        }
      } catch (e) {
        console.error('[WxAuth] code 换取 openid 失败:', e)
      }
      return false
    }

    // 跳转到微信授权页
    window.location.href = authUrl
    return false
  }

  return {
    isAuthed,
    userInfo,
    openId,
    checkAuth,
    requestAuth
  }
}

function isWechatBrowser() {
  const ua = window.navigator.userAgent || ''
  return /micromessenger/i.test(ua)
}

function getStableFallbackOpenId() {
  const tracking = getTrackingContextSnapshot()
  const visitorId = tracking.visitor_id || ''
  if (!visitorId) return `visitor_${Date.now()}`
  return `visitor_${visitorId}`
}
