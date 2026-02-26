# 宠名片获客改造交付（2026Q1）

## 已交付能力

### 1) 增长数据底座
- 统一事件结构：`event_id / visitor_id / session_id / source / share_id / inviter_id / funnel_step`
- 漏斗步骤覆盖：
  - `landing`
  - `photo_uploaded`
  - `breed_identified`
  - `home_to_info`
  - `home_to_card_quick`
  - `info_view`
  - `info_submitted`
  - `card_view`
  - `card_generated`
  - `share_link_copied`
  - `card_saved`
  - `group_cta_clicked`
  - `group_intent_submitted`

### 2) 先结果后补资料（降流失）
- 首页新增极速路径：`30秒生成可分享卡`
- 旧路径保留：`完善资料再生成`
- Info 页改为轻表单：昵称+城市+至少1个标签即可生成

### 3) 裂变链路
- 生成专属分享链接：自动带 `share_id + inviter_id`
- 结果页新增：
  - 复制朋友圈文案+链接
  - 复制专属邀请链接
- 被邀用户完成关键动作时会记录 `referral_converted`

### 4) 可传播模板
- 卡片模板支持 3 种：
  - 经典名片
  - 同城排行
  - 交友邀请
- 卡面新增社交货币指标：萌力值、同城名次、品种热度

### 5) 进群承接
- 结果页支持按品种/城市二维码映射（可扩展）
- 新增“提交进群意向”（可选微信号）写入 `user_profiles`

### 6) 邀请奖励闭环（新增）
- `user-profile` 云函数支持邀请关系绑定与去重计数
- 邀请奖励阈值：
  - 邀请 1 人：解锁同城排行模板
  - 邀请 3 人：解锁交友邀请模板
  - 邀请 5 人：解锁优先进群权益
- 结果页显示邀请进度与下一个奖励目标
- 模板切换与奖励联动：未解锁模板显示锁标并提示还差多少邀请

### 7) 动态分流路由（新增）
- 进群路由支持 `breed_city -> breed -> city -> default` 优先级
- 线索提交增加字段：`joinIntentType / joinIntentNote / groupRouteKey / groupRouteType`
- 便于后端按群路由和用户意向分发

### 8) 体验兜底（新增）
- 非微信浏览器不再强制跳授权，自动使用稳定 fallback ID
- 未配置 CloudBase 环境/模型时，识别自动切本地 mock，流程可完整演示

## 关键文件
- `src/utils/tracking.js`
- `cloudfunctions/track-event/index.js`
- `src/views/HomePage.vue`
- `src/views/InfoForm.vue`
- `src/views/CardPreview.vue`
- `src/composables/useCardGenerator.js`
- `src/utils/viralProfile.js`
- `src/data/groupQrcodes.js`

## 上线前必做
1. 重新部署云函数 `track-event`（字段已升级）
2. 在 `public/` 放置默认二维码：`public/qrcode.png`
3. 如需分城市/品种二维码，放置：
   - `public/qrcodes/shanghai.png`
   - `public/qrcodes/beijing.png`
   - `public/qrcodes/corgi.png` 等

## 建议明日看板（events 集合）
- 漏斗转化：
  - `landing -> photo_uploaded -> card_generated -> share_link_copied -> card_saved -> group_intent_submitted`
- 裂变效率：
  - `viral_entry` 数量
  - `referral_converted / viral_entry`
- 模板效果：
  - 按 `template_style` 对比 `share_link_copied` 与 `card_saved`
