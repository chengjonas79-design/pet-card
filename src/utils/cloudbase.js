import cloudbase from '@cloudbase/js-sdk'

let app = null

export function getCloudbaseApp() {
  if (!app) {
    app = cloudbase.init({
      env: import.meta.env.VITE_CLOUDBASE_ENV_ID
    })
  }
  return app
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
