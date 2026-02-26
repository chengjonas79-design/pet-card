/**
 * 云函数：user-profile
 * 用户建档 + 邀请奖励
 *
 * 入参:
 *   action: 'save' | 'get' | 'update'
 *   data: {
 *     openid,
 *     inviterId,
 *     hasJoinIntent,
 *     incrementCardCount,
 *     ...
 *   }
 */
const tcb = require('@cloudbase/node-sdk')

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const db = app.database()
const _ = db.command
const collection = db.collection('user_profiles')

const REWARD_RULES = [
  { count: 1, level: 'starter', title: '解锁同城排行模板' },
  { count: 3, level: 'pro', title: '解锁交友邀请模板' },
  { count: 5, level: 'partner', title: '解锁优先进群权益' }
]

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

  const now = new Date()
  const payload = sanitizePayload(data)
  const incrementCardCount = payload.incrementCardCount !== false

  delete payload.incrementCardCount
  delete payload.createdAt

  try {
    const existing = await getProfileDoc(payload.openid)

    let referralHandled = false
    let inviterReward = null

    if (existing) {
      const updateData = {
        ...payload,
        updatedAt: now
      }

      if (incrementCardCount) {
        updateData.cardCount = _.inc(1)
      }

      if (payload.hasJoinIntent) {
        updateData.joinIntentAt = now
      }

      if (shouldBindInviter(existing, payload)) {
        updateData.referredBy = payload.inviterId
        updateData.referredAt = now
        updateData.convertedFromShare = true
        referralHandled = true
      }

      await collection.where({ openid: payload.openid }).update(updateData)

      if (referralHandled) {
        inviterReward = await applyReferralReward(payload.inviterId, payload.openid, now)
      }

      const latest = await getProfileDoc(payload.openid)
      return {
        success: true,
        action: 'updated',
        profile: latest,
        inviterReward
      }
    }

    const baseRecord = {
      ...payload,
      cardCount: incrementCardCount ? 1 : 0,
      referralCount: 0,
      rewardLevel: 'none',
      unlockedRewards: [],
      referredUsers: [],
      createdAt: now,
      updatedAt: now
    }

    if (payload.hasJoinIntent) {
      baseRecord.joinIntentAt = now
    }

    if (payload.inviterId && payload.inviterId !== payload.openid) {
      baseRecord.referredBy = payload.inviterId
      baseRecord.referredAt = now
      baseRecord.convertedFromShare = true
      referralHandled = true
    }

    await collection.add(baseRecord)

    if (referralHandled) {
      inviterReward = await applyReferralReward(payload.inviterId, payload.openid, now)
    }

    const latest = await getProfileDoc(payload.openid)
    return {
      success: true,
      action: 'created',
      profile: latest,
      inviterReward
    }
  } catch (err) {
    console.error('建档失败:', err)
    return { error: '建档失败', message: err.message }
  }
}

async function getProfile(openid) {
  if (!openid) return { error: '缺少openid' }

  try {
    const doc = await getProfileDoc(openid)
    return { profile: doc || null }
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
        ...sanitizePayload(updates),
        updatedAt: new Date()
      })
    return { success: true }
  } catch (err) {
    return { error: '更新失败' }
  }
}

async function applyReferralReward(inviterId, inviteeOpenid, now) {
  if (!inviterId || !inviteeOpenid || inviterId === inviteeOpenid) return null

  const inviterDoc = await getProfileDoc(inviterId)

  if (!inviterDoc) {
    const referralCount = 1
    const rewardInfo = getRewardInfo(referralCount)

    await collection.add({
      openid: inviterId,
      cardCount: 0,
      referralCount,
      rewardLevel: rewardInfo.level,
      unlockedRewards: rewardInfo.unlockedRewards,
      referredUsers: [inviteeOpenid],
      lastReferralAt: now,
      createdAt: now,
      updatedAt: now
    })

    return {
      inviterId,
      referralCount,
      rewardLevel: rewardInfo.level,
      newlyUnlocked: rewardInfo.latestUnlocked,
      alreadyCounted: false
    }
  }

  const referredUsers = Array.isArray(inviterDoc.referredUsers) ? inviterDoc.referredUsers : []
  if (referredUsers.includes(inviteeOpenid)) {
    return {
      inviterId,
      referralCount: inviterDoc.referralCount || 0,
      rewardLevel: inviterDoc.rewardLevel || 'none',
      newlyUnlocked: null,
      alreadyCounted: true
    }
  }

  const nextReferralCount = (inviterDoc.referralCount || 0) + 1
  const nextUsers = [...referredUsers, inviteeOpenid]
  const prevLevel = inviterDoc.rewardLevel || 'none'
  const rewardInfo = getRewardInfo(nextReferralCount)

  await collection.where({ openid: inviterId }).update({
    referralCount: nextReferralCount,
    referredUsers: nextUsers,
    rewardLevel: rewardInfo.level,
    unlockedRewards: rewardInfo.unlockedRewards,
    lastReferralAt: now,
    updatedAt: now
  })

  return {
    inviterId,
    referralCount: nextReferralCount,
    rewardLevel: rewardInfo.level,
    newlyUnlocked: rewardInfo.level !== prevLevel ? rewardInfo.latestUnlocked : null,
    alreadyCounted: false
  }
}

function getRewardInfo(referralCount) {
  const unlocked = REWARD_RULES.filter((rule) => referralCount >= rule.count)
  if (unlocked.length === 0) {
    return {
      level: 'none',
      unlockedRewards: [],
      latestUnlocked: null
    }
  }

  const latest = unlocked[unlocked.length - 1]
  return {
    level: latest.level,
    unlockedRewards: unlocked.map((rule) => ({
      level: rule.level,
      count: rule.count,
      title: rule.title
    })),
    latestUnlocked: {
      level: latest.level,
      count: latest.count,
      title: latest.title
    }
  }
}

function shouldBindInviter(existing, payload) {
  if (!payload.inviterId) return false
  if (payload.inviterId === payload.openid) return false
  if (existing.referredBy) return false
  return true
}

async function getProfileDoc(openid) {
  const res = await collection
    .where({ openid })
    .limit(1)
    .get()

  return res.data?.[0] || null
}

function sanitizePayload(data = {}) {
  const result = {}
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return
    result[key] = value
  })
  return result
}
