import { callFunction } from './cloudbase'

// 埋点事件名称常量
export const EVENTS = {
  PAGE_VIEW: 'page_view',
  PHOTO_UPLOAD: 'photo_upload',
  BREED_IDENTIFIED: 'breed_identified',
  CARD_GENERATED: 'card_generated',
  CARD_SAVED: 'card_saved',
  COMPARISON_VIEWED: 'comparison_viewed',
  GROUP_CTA_SCAN: 'group_cta_scan',
  VIRAL_ENTRY: 'viral_entry'
}

// 发送埋点事件
export async function trackEvent(eventName, params = {}) {
  const eventData = {
    event: eventName,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    // 来源渠道（从URL参数获取）
    source: getUrlParam('source') || 'direct',
    referrer: getUrlParam('ref') || '',
    ...params
  }

  // 本地日志（开发调试用）
  console.log('[Track]', eventName, eventData)

  // 上报到云函数
  try {
    await callFunction('track-event', eventData)
  } catch (e) {
    // 埋点失败不影响主流程
    console.warn('[Track] 上报失败:', e)
  }
}

function getUrlParam(key) {
  const params = new URLSearchParams(window.location.search)
  return params.get(key)
}
