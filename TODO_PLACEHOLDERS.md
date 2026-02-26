# 占位符清单 - 上线前必须替换

> 以下是所有需要你手动替换的占位项，逐项完成后即可部署上线。

---

## 1. 配置文件 (.env)

| 占位符 | 说明 | 在哪里获取 |
|--------|------|-----------|
| `VITE_CLOUDBASE_ENV_ID` | 腾讯云 CloudBase 环境ID | 腾讯云控制台 → 云开发 → 环境ID |
| `VITE_WX_APPID` | 微信公众号 AppID | 微信公众平台 → 开发 → 基本配置 |
| `CLOUDBASE_AI_MODEL_GROUP` | CloudBase AI 模型分组 | CloudBase 控制台 → AI → 大模型接入 |
| `CLOUDBASE_AI_MODEL_NAME` | CloudBase AI 模型名称 | CloudBase 控制台 → AI → 大模型接入 |

文件位置: `pet-card/.env`

---

## 2. 企微二维码图片

当前状态: 使用文字占位
需要替换: 在名片 Canvas 绘制中加载真实的企微二维码图片

涉及文件:
- `src/composables/useCardGenerator.js` → `drawFooter()` 函数中的二维码绘制区域
- `src/views/CardPreview.vue` → 进群CTA区域的 `qr-placeholder`

替换方式:
1. 将企微二维码图片放到 `public/qrcode.png`
2. 修改 `drawFooter()` 中加载图片的逻辑（代码中已标注 TODO）
3. 修改 `CardPreview.vue` 中的占位区域为 `<img src="/qrcode.png" />`

---

## 3. 品牌 Logo

当前状态: 使用 emoji 🐾 占位
需要替换: 在 HomePage.vue 中替换为真实 logo 图片

涉及文件:
- `src/views/HomePage.vue` → `.brand-logo` 区域

---

## 4. CloudBase 数据库集合

上线前需要在 CloudBase 控制台创建以下数据库集合:

| 集合名 | 用途 |
|--------|------|
| `events` | 埋点事件记录 |
| `user_profiles` | 用户建档数据 |

---

## 5. CloudBase 云函数部署

需要将以下云函数部署到 CloudBase:

| 云函数 | 目录 | 环境变量 |
|--------|------|----------|
| `breed-identify` | `cloudfunctions/breed-identify/` | 需配置 `CLOUDBASE_AI_MODEL_GROUP`、`CLOUDBASE_AI_MODEL_NAME` |
| `track-event` | `cloudfunctions/track-event/` | 无 |
| `user-profile` | `cloudfunctions/user-profile/` | 无 |

部署命令（如已安装 CloudBase CLI）:
```bash
tcb fn deploy breed-identify
tcb fn deploy track-event
tcb fn deploy user-profile
```

---

## 6. 微信公众号配置

需要在微信公众平台配置:
- JS接口安全域名（填入你的 CloudBase 默认域名或自定义域名）
- 网页授权域名（同上）

---

## 7. 品种占比数据（MVP-2 可选）

当前状态: `src/data/breeds.js` 中使用模拟数据
后续: 对接真实社群数据，每周更新占比

---

## 快速部署步骤

```bash
# 1. 安装依赖
cd pet-card
npm install

# 2. 填入真实配置
cp .env.example .env
# 编辑 .env 填入真实值

# 3. 本地测试
npm run dev

# 4. 构建
npm run build

# 5. 部署到 CloudBase
tcb framework deploy
```
