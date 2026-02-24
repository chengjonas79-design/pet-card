/**
 * 云函数：track-event
 * 数据埋点记录
 *
 * 入参: { event, timestamp, source, ... }
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
    await db.collection('events').add({
      event: eventName,
      params,
      createdAt: new Date(),
      // CloudBase 会自动注入 OPENID
      _openid: event.userInfo?.openId || ''
    })

    return { success: true }
  } catch (err) {
    console.error('埋点记录失败:', err)
    return { error: '记录失败', message: err.message }
  }
}
