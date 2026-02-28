/**
 * 云函数：track-event
 * 数据埋点记录
 *
 * 入参: { event, event_id, session_id, visitor_id, funnel_step, ... }
 */
const tcb = require('@cloudbase/node-sdk')

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const db = app.database()

exports.main = async (event) => {
  const { event: eventName, ...params } = event

  if (!eventName) {
    return { error: '缺少事件名称' }
  }

  try {
    const timestamp = Number.isFinite(params.timestamp) ? params.timestamp : Date.now()
    const source = params.src || params.source || 'direct'
    const campaign = params.campaign || params.utm_campaign || ''
    const contentId = params.content_id || params.utm_content || ''

    const res = await db.collection('events').add({
      event: eventName,
      eventId: params.event_id || '',
      eventSchema: params.event_schema || '',
      visitorId: params.visitor_id || '',
      sessionId: params.session_id || '',
      funnelStep: params.funnel_step || '',
      pagePath: params.page_path || '',
      source,
      src: source,
      campaign,
      contentId,
      shareId: params.share_id || '',
      inviterId: params.inviter_id || '',
      isSharedEntry: Boolean(params.is_shared_entry),
      params,
      createdAt: new Date(timestamp),
      serverReceivedAt: new Date(),
      // CloudBase 会自动注入 OPENID
      _openid: event.userInfo?.openId || event?.wxContext?.OPENID || ''
    })

    return { success: true, id: res.id }
  } catch (err) {
    console.error('埋点记录失败:', err)
    return { error: '记录失败', message: err.message }
  }
}
