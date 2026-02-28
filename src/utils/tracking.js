import { callFunction } from './cloudbase'

const STORAGE_KEYS = {
  VISITOR_ID: 'pet_card_visitor_id',
  SESSION_ID: 'pet_card_session_id',
  ATTRIBUTION: 'pet_card_attribution_context',
  VIRAL_ENTRY_TRACKED: 'pet_card_viral_entry_tracked'
}

const EVENT_SCHEMA_VERSION = '2026_q1_funnel_v1'

// 埋点事件名称常量
export const EVENTS = {
  PAGE_VIEW: 'page_view',
  VIRAL_ENTRY: 'viral_entry',
  FUNNEL_STEP: 'funnel_step',
  PHOTO_UPLOAD: 'photo_upload',
  QUICK_GENERATE_CLICKED: 'quick_generate_clicked',
  BREED_IDENTIFY_STARTED: 'breed_identify_started',
  BREED_IDENTIFIED: 'breed_identified',
  BREED_IDENTIFY_FAILED: 'breed_identify_failed',
  BREED_IDENTIFY_MOCK_USED: 'breed_identify_mock_used',
  BREED_MANUAL_SELECT_OPENED: 'breed_manual_select_opened',
  BREED_SELECTED: 'breed_selected',
  NEXT_TO_INFO: 'next_to_info',
  INFO_SUBMITTED: 'info_submitted',
  CARD_GENERATE_STARTED: 'card_generate_started',
  CARD_GENERATED: 'card_generated',
  CARD_GENERATE_FAILED: 'card_generate_failed',
  TEMPLATE_SELECTED: 'template_selected',
  TEMPLATE_LOCKED_CLICKED: 'template_locked_clicked',
  SHARE_LINK_CREATED: 'share_link_created',
  SHARE_LINK_COPIED: 'share_link_copied',
  SHARE_ASSET_SELECTED: 'share_asset_selected',
  SHARE_ASSET_TEXT_COPIED: 'share_asset_text_copied',
  SHARE_TEXT_COPIED: 'share_text_copied',
  SHARE_COPY_FAILED: 'share_copy_failed',
  AI_INSIGHT_STARTED: 'ai_insight_started',
  AI_INSIGHT_GENERATED: 'ai_insight_generated',
  AI_INSIGHT_FALLBACK_USED: 'ai_insight_fallback_used',
  REFERRAL_CONVERTED: 'referral_converted',
  REFERRAL_REWARD_UNLOCKED: 'referral_reward_unlocked',
  CARD_SAVED: 'card_saved',
  COMPARISON_VIEWED: 'comparison_viewed',
  PRIVATE_CTA_CLICKED: 'private_cta_clicked',
  PRIVATE_PAGE_VIEW: 'private_page_view',
  GROUP_CTA_SCAN: 'group_cta_scan',
  GROUP_INTENT_SUBMITTED: 'group_intent_submitted'
}

export const FUNNEL_STEPS = {
  LANDING: 'landing',
  VIRAL_ENTRY: 'viral_entry',
  PHOTO_UPLOADED: 'photo_uploaded',
  BREED_IDENTIFIED: 'breed_identified',
  HOME_TO_INFO: 'home_to_info',
  HOME_TO_CARD_QUICK: 'home_to_card_quick',
  INFO_VIEW: 'info_view',
  INFO_SUBMITTED: 'info_submitted',
  CARD_VIEW: 'card_view',
  CARD_GENERATED: 'card_generated',
  SHARE_LINK_COPIED: 'share_link_copied',
  CARD_SAVED: 'card_saved',
  GROUP_CTA_CLICKED: 'group_cta_clicked',
  GROUP_INTENT_SUBMITTED: 'group_intent_submitted'
}

let cachedAttribution = null

// 发送埋点事件
export async function trackEvent(eventName, params = {}) {
  const eventData = {
    event: eventName,
    event_id: createId('evt'),
    event_schema: EVENT_SCHEMA_VERSION,
    timestamp: Date.now(),
    url: window.location.href,
    page_path: window.location.pathname,
    user_agent: navigator.userAgent,
    ...getTrackingContext(),
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

export function trackFunnel(step, params = {}) {
  return trackEvent(EVENTS.FUNNEL_STEP, {
    funnel_step: step,
    ...params
  })
}

export function trackViralEntryIfNeeded() {
  const attribution = getAttributionContext()
  if (!attribution.is_shared_entry) return

  if (safeGetSessionItem(STORAGE_KEYS.VIRAL_ENTRY_TRACKED) === '1') return
  safeSetSessionItem(STORAGE_KEYS.VIRAL_ENTRY_TRACKED, '1')

  trackEvent(EVENTS.VIRAL_ENTRY, {
    funnel_step: FUNNEL_STEPS.VIRAL_ENTRY,
    share_id: attribution.share_id,
    inviter_id: attribution.inviter_id
  })
}

export function createShareLink(extraParams = {}) {
  const tracking = getTrackingContext()
  const shareId = createId('shr')
  const inviterId = getInviterProfileId(tracking.visitor_id)
  const basePath = import.meta.env.BASE_URL || '/'
  const url = new URL(basePath, window.location.origin)
  const source = extraParams.src || tracking.src || 'wx_share'

  url.searchParams.set('src', source)
  url.searchParams.set('source', source)
  url.searchParams.set('campaign', extraParams.campaign || tracking.campaign || 'pet_card_h5')
  url.searchParams.set('content_id', extraParams.content_id || tracking.content_id || 'card')
  url.searchParams.set('share_id', shareId)
  url.searchParams.set('inviter_id', inviterId)

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })

  return {
    share_id: shareId,
    inviter_id: inviterId,
    share_url: url.toString()
  }
}

export function getTrackingContextSnapshot() {
  return {
    ...getTrackingContext()
  }
}

export function getAttributionContext() {
  if (cachedAttribution) return cachedAttribution

  const stored = safeReadSessionJson(STORAGE_KEYS.ATTRIBUTION)
  if (stored) {
    cachedAttribution = stored
    return stored
  }

  const params = new URLSearchParams(window.location.search)
  const shareId = params.get('share_id') || ''
  const inviterId = params.get('inviter_id') || ''
  const src =
    params.get('src') ||
    params.get('source') ||
    params.get('utm_source') ||
    (shareId || inviterId ? 'share' : 'direct')
  const campaign = params.get('campaign') || params.get('utm_campaign') || ''
  const contentId = params.get('content_id') || params.get('utm_content') || ''

  const attribution = {
    source: src,
    src,
    campaign,
    content_id: contentId,
    referrer: params.get('ref') || document.referrer || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: campaign,
    utm_content: contentId,
    share_id: shareId,
    inviter_id: inviterId,
    is_shared_entry: Boolean(shareId || inviterId),
    entry_path: window.location.pathname,
    entry_timestamp: Date.now()
  }

  cachedAttribution = attribution
  safeSetSessionJson(STORAGE_KEYS.ATTRIBUTION, attribution)
  return attribution
}

function getTrackingContext() {
  const attribution = getAttributionContext()

  return {
    visitor_id: getOrCreateLocalValue(STORAGE_KEYS.VISITOR_ID, 'vid'),
    session_id: getOrCreateSessionValue(STORAGE_KEYS.SESSION_ID, 'sid'),
    source: attribution.source,
    src: attribution.src,
    campaign: attribution.campaign,
    content_id: attribution.content_id,
    referrer: attribution.referrer,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    share_id: attribution.share_id,
    inviter_id: attribution.inviter_id,
    is_shared_entry: attribution.is_shared_entry,
    entry_path: attribution.entry_path,
    entry_timestamp: attribution.entry_timestamp
  }
}

function getOrCreateLocalValue(key, prefix) {
  return getOrCreateValue(localStorage, key, prefix)
}

function getOrCreateSessionValue(key, prefix) {
  return getOrCreateValue(sessionStorage, key, prefix)
}

function getOrCreateValue(storage, key, prefix) {
  try {
    const existing = storage.getItem(key)
    if (existing) return existing

    const next = createId(prefix)
    storage.setItem(key, next)
    return next
  } catch (e) {
    // 浏览器禁用存储时仍可继续埋点
    return createId(prefix)
  }
}

function createId(prefix) {
  const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
  return `${prefix}_${randomPart}`
}

function safeReadSessionJson(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function safeSetSessionJson(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // 忽略存储失败
  }
}

function safeGetSessionItem(key) {
  try {
    return sessionStorage.getItem(key)
  } catch (e) {
    return null
  }
}

function safeSetSessionItem(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch (e) {
    // 忽略存储失败
  }
}

function getInviterProfileId(visitorId) {
  try {
    const authedOpenId = localStorage.getItem('pet_card_openid')
    if (authedOpenId) return authedOpenId
  } catch (e) {
    // ignore storage failures
  }
  return `visitor_${visitorId}`
}
