# 萌宠联萌 - 同品种社交名片

## 项目概述
微信H5宠物社交名片工具：拍照识别品种 → 生成玩梗系名片 → 保存分享 → 引导进群。
需求文档: `萌宠联萌_同品种社交名片_产品方案_V3终版.md`

## 当前进度
- MVP-1（核心流程）+ MVP-2（增长组件）代码已完成
- GitHub: https://github.com/chengjonas79-design/pet-card
- 本地开发服务器: `cd pet-card && npx vite --host`

## 技术架构
| 模块 | 方案 |
|------|------|
| 前端 | Vue 3 + Vite 7 |
| 后端 | 腾讯云 CloudBase 云开发 |
| 品种识别 | CloudBase AI（默认混元视觉模型） |
| 名片渲染 | Canvas（玩梗系风格，1080×1920px） |
| 进群方式 | 统一企微二维码，话术引导分群 |

## 代码结构
```
pet-card/
├── src/views/         # 3个页面: HomePage, InfoForm, CardPreview
├── src/composables/   # 业务逻辑: useBreedIdentify, useCardGenerator, useWxAuth
├── src/utils/         # cloudbase.js, tracking.js
├── src/data/          # breeds.js(品种库), tags.js(24个性格标签)
├── cloudfunctions/    # 3个云函数: breed-identify, track-event, user-profile
├── TODO_PLACEHOLDERS.md  # 占位符替换清单（上线前必看）
└── .env.example       # 配置模板
```

## 上线前待办
详见 `pet-card/TODO_PLACEHOLDERS.md`，核心是:
1. `.env` 填真实配置（CloudBase环境ID、微信AppID、CloudBase AI 模型配置）
2. 放入企微二维码图片
3. CloudBase创建数据库集合 + 部署云函数
4. 微信公众号配置安全域名

## 开发约定
- Node.js 通过 nvm 管理（v20.20.0）
- 部署环境: 腾讯云
- GitHub: chengjonas79-design
- 微信公众号: 已认证
