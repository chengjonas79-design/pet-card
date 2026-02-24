/**
 * 云函数：user-profile
 * MVP-2: 用户自动建档
 *
 * 入参:
 *   action: 'save' | 'get' | 'update'
 *   data: { openid, breed, city, ageText, hasJoinedGroup, source }
 */
const tcb = require('@cloudbase/node-sdk')

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const db = app.database()
const _ = db.command
const collection = db.collection('user_profiles')

exports.main = async (event) => {
  const { action, data } = event

  switch (action) {
    case 'save':
      return await saveProfile(data)
    case 'get':
      return await getProfile(data?.openid)
    case 'update':
      return await updateProfile(data?.openid, data)
    default:
      return { error: '未知操作' }
  }
}

async function saveProfile(data) {
  if (!data?.openid) {
    return { error: '缺少openid' }
  }

  try {
    // 查看是否已存在
    const existing = await collection
      .where({ openid: data.openid })
      .limit(1)
      .get()

    if (existing.data?.length > 0) {
      // 更新已有记录
      await collection
        .where({ openid: data.openid })
        .update({
          ...data,
          updatedAt: new Date(),
          cardCount: _.inc(1)
        })
      return { success: true, action: 'updated' }
    }

    // 新建记录
    await collection.add({
      ...data,
      cardCount: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return { success: true, action: 'created' }
  } catch (err) {
    console.error('建档失败:', err)
    return { error: '建档失败', message: err.message }
  }
}

async function getProfile(openid) {
  if (!openid) return { error: '缺少openid' }

  try {
    const res = await collection
      .where({ openid })
      .limit(1)
      .get()
    return { profile: res.data?.[0] || null }
  } catch (err) {
    return { error: '查询失败' }
  }
}

async function updateProfile(openid, updates) {
  if (!openid) return { error: '缺少openid' }

  try {
    await collection
      .where({ openid })
      .update({
        ...updates,
        updatedAt: new Date()
      })
    return { success: true }
  } catch (err) {
    return { error: '更新失败' }
  }
}
