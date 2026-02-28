# 萌宠联萌 · 宠名片（pet-card）

用于获客裂变的微信 H5 工具：上传宠物照片 -> 识别品种 -> 生成可分享名片 -> 邀请好友 -> 进群承接。

## 技术栈
- 前端：Vue 3 + Vite
- 云能力：腾讯云 CloudBase（云函数 / 数据库 / 托管）
- 识别：CloudBase AI（默认混元视觉模型）

## 本地运行
```bash
npm install
cp .env.example .env
npm run dev
```

默认访问：`http://localhost:5173/`

## 演示模式（不接模型也能完整走通）
在 `.env` 中配置：
```bash
VITE_MOCK_BREED_IDENTIFY=true
VITE_MOCK_PET_INSIGHT=true
```

说明：
- 首页识别会走本地 mock 结果。
- 后续名片生成、分享、进群意向流程可完整体验。

## 关键环境变量
- `VITE_CLOUDBASE_ENV_ID`：CloudBase 环境 ID
- `VITE_WX_APPID`：微信公众号 AppID（可先不填，系统会走 fallback ID）
- `CLOUDBASE_AI_MODEL_GROUP`：模型分组（云函数环境变量）
- `CLOUDBASE_AI_MODEL_NAME`：模型名称（云函数环境变量）

## 云函数
目录：`cloudfunctions/`
- `breed-identify`：品种识别
- `pet-insight`：AI性格解读/分享话术
- `track-event`：埋点上报
- `user-profile`：用户建档、邀请奖励、进群意向

建议先创建集合：
- `events`
- `user_profiles`

## 当前增长能力
- 漏斗埋点：Landing -> 上传 -> 识别 -> 生成 -> 分享 -> 进群
- 极速模式：先出卡再补资料
- 邀请裂变：专属链接 + 邀请计数 + 奖励解锁（1/3/5）
- 模板解锁：同城排行、交友邀请与邀请奖励联动
- 进群分流：`breed_city -> breed -> city -> default`

## 部署（CloudBase）
1. 前端构建
```bash
npm run build
```
2. 部署云函数（示例）
```bash
tcb fn deploy breed-identify
tcb fn deploy pet-insight
tcb fn deploy track-event
tcb fn deploy user-profile
```
3. 将前端静态资源部署到 CloudBase 静态托管或云托管。

## 文档
- 交付说明：`docs/growth-delivery-2026q1.md`
- 微信H5裂变方案：`docs/h5-wechat-growth-plan-2026q1.md`
- 上线占位清单：`TODO_PLACEHOLDERS.md`
- 产品方案：`萌宠联萌_同品种社交名片_产品方案_V3终版.md`
