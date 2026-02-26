import cloudbase from '@cloudbase/js-sdk'

let app = null
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || ''
const IS_CLOUDBASE_READY = Boolean(ENV_ID && !ENV_ID.includes('your-'))

export function getCloudbaseApp() {
  if (!IS_CLOUDBASE_READY) {
    throw new Error('cloudbase_env_not_configured')
  }

  if (!app) {
    app = cloudbase.init({
      env: ENV_ID
    })
  }
  return app
}

export function isCloudbaseReady() {
  return IS_CLOUDBASE_READY
}

// 调用云函数
export async function callFunction(name, data = {}) {
  const app = getCloudbaseApp()
  try {
    const res = await app.callFunction({
      name,
      data
    })
    return res.result
  } catch (err) {
    console.error(`云函数 ${name} 调用失败:`, err)
    throw err
  }
}

// 获取数据库引用
export function getDb() {
  const app = getCloudbaseApp()
  return app.database()
}
