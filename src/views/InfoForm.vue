<template>
  <div class="page-container info-page">
    <h1 class="page-title">填写毛孩子档案</h1>
    <p class="page-subtitle">让名片更有趣，信息越详细越吸引同品种铲屎官</p>

    <!-- 品种确认 -->
    <div class="breed-confirm">
      <span class="breed-label">品种：</span>
      <span class="breed-value">{{ cardData.breed }}</span>
      <button class="breed-edit" @click="goBack">修改</button>
    </div>

    <!-- 基础信息 -->
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">宠物昵称 *</label>
        <input
          v-model="form.nickname"
          class="form-input"
          placeholder="你家毛孩子叫什么？"
          maxlength="10"
        />
      </div>

      <div class="form-group">
        <label class="form-label">性别 *</label>
        <div class="gender-options">
          <div
            v-for="g in genderOptions"
            :key="g.value"
            class="gender-item"
            :class="{ active: form.gender === g.value }"
            @click="form.gender = g.value"
          >
            <span class="gender-icon">{{ g.icon }}</span>
            <span>{{ g.label }}</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">年龄 *</label>
        <input
          v-model="form.age"
          class="form-input"
          placeholder="比如：2岁半、6个月"
          maxlength="10"
        />
      </div>

      <div class="form-group">
        <label class="form-label">所在城市 *</label>
        <input
          v-model="form.city"
          class="form-input"
          placeholder="比如：上海、北京"
          maxlength="10"
        />
      </div>
    </div>

    <!-- 性格标签 -->
    <div class="form-section">
      <label class="form-label">
        性格标签 * <span class="tag-count">（已选 {{ form.tags.length }}/3）</span>
      </label>
      <div
        v-for="category in tagCategories"
        :key="category.name"
        class="tag-category"
      >
        <div class="category-name">{{ category.icon }} {{ category.name }}</div>
        <div class="tag-list">
          <span
            v-for="tag in category.tags"
            :key="tag"
            class="tag-item"
            :class="{
              selected: form.tags.includes(tag),
              disabled: form.tags.length >= 3 && !form.tags.includes(tag)
            }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- 选填信息 -->
    <div class="form-section">
      <div class="section-divider">
        <span>以下选填，让名片更丰富</span>
      </div>

      <div class="form-group">
        <label class="form-label">一句话签名</label>
        <input
          v-model="form.signature"
          class="form-input"
          placeholder="比如：我吃完饭必须遗忘"
          maxlength="30"
        />
      </div>

      <div class="form-group">
        <label class="form-label">可约时间</label>
        <div class="time-options">
          <span
            v-for="t in timeOptions"
            :key="t"
            class="tag-item"
            :class="{ selected: form.availableTime === t }"
            @click="form.availableTime = form.availableTime === t ? '' : t"
          >
            {{ t }}
          </span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-bar safe-bottom">
      <button
        class="btn-primary"
        :disabled="!canGenerate"
        @click="generateCard"
      >
        生成名片 🎨
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { tagCategories } from '../data/tags'

const router = useRouter()

const cardData = ref({})

const form = reactive({
  nickname: '',
  gender: '',
  age: '',
  city: '',
  tags: [],
  signature: '',
  availableTime: ''
})

const genderOptions = [
  { value: '弟弟', label: '弟弟', icon: '♂️' },
  { value: '妹妹', label: '妹妹', icon: '♀️' },
  { value: '不确定', label: '不确定', icon: '❓' }
]

const timeOptions = ['工作日白天', '工作日晚上', '周末上午', '周末下午', '周末全天', '随时可约']

const canGenerate = computed(() => {
  return form.nickname &&
    form.gender &&
    form.age &&
    form.city &&
    form.tags.length === 3
})

function toggleTag(tag) {
  const idx = form.tags.indexOf(tag)
  if (idx > -1) {
    form.tags.splice(idx, 1)
  } else if (form.tags.length < 3) {
    form.tags.push(tag)
  }
}

function goBack() {
  router.back()
}

function generateCard() {
  if (!canGenerate.value) return

  // 合并数据
  const fullData = {
    ...cardData.value,
    ...form
  }
  sessionStorage.setItem('pet_card_data', JSON.stringify(fullData))
  router.push('/card')
}

onMounted(() => {
  const stored = sessionStorage.getItem('pet_card_data')
  if (stored) {
    cardData.value = JSON.parse(stored)
  } else {
    router.replace('/')
  }
})
</script>

<style scoped>
.info-page {
  padding-bottom: 100px;
}

.breed-confirm {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: rgba(78, 205, 196, 0.1);
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: var(--radius-sm);
  margin-bottom: 28px;
}

.breed-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.breed-value {
  font-size: 20px;
  font-weight: 700;
  color: #4ECDC4;
  flex: 1;
  margin-left: 8px;
}

.breed-edit {
  background: none;
  border: 1px solid var(--text-muted);
  color: var(--text-muted);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
}

.form-section {
  margin-bottom: 28px;
}

/* 性别选择 */
.gender-options {
  display: flex;
  gap: 12px;
}

.gender-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px;
  background: var(--bg-input);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.gender-item.active {
  border-color: var(--primary);
  background: rgba(255, 107, 107, 0.1);
}

.gender-icon {
  font-size: 20px;
}

/* 标签选择 */
.tag-count {
  font-weight: 400;
  color: var(--primary);
  font-size: 13px;
}

.tag-category {
  margin-bottom: 16px;
}

.category-name {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
}

.tag-item.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 选填分割线 */
.section-divider {
  display: flex;
  align-items: center;
  margin: 8px 0 20px;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.section-divider span {
  padding: 0 16px;
  font-size: 13px;
  color: var(--text-muted);
}

/* 可约时间 */
.time-options {
  display: flex;
  flex-wrap: wrap;
}

/* 底部操作栏 */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 750px;
  margin: 0 auto;
  padding: 16px 20px;
  background: linear-gradient(transparent, var(--bg-dark) 30%);
}
</style>
