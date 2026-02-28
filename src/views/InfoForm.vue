<template>
  <div class="page-container info-page">
    <h1 class="page-title">最后一步：生成性格标签</h1>
    <p class="page-subtitle">AI 负责识别品种，性格标签来自你对毛孩子的 3 个回答</p>

    <div class="breed-confirm">
      <div class="breed-main">
        <span class="breed-label">识别品种</span>
        <span class="breed-value">{{ cardData.breed }}</span>
      </div>
      <div class="breed-side">
        <span v-if="cardData.identifyConfidence" class="confidence-chip">
          置信度 {{ Math.round(cardData.identifyConfidence * 100) }}%
        </span>
        <button class="breed-edit" @click="goBack">返回修改</button>
      </div>
    </div>

    <div class="logic-card">
      <p class="logic-title">性格标签生成逻辑</p>
      <p class="logic-line">1. 用图片识别品种</p>
      <p class="logic-line">2. 你回答 3 个行为问题</p>
      <p class="logic-line">3. 组合成可解释的性格标签</p>
    </div>

    <div class="form-section">
      <div class="form-group">
        <label class="form-label">宠物昵称 *</label>
        <input
          v-model="form.nickname"
          class="form-input"
          placeholder="比如：奶酪"
          maxlength="10"
        />
      </div>

      <div class="form-group">
        <label class="form-label">所在城市 *</label>
        <input
          v-model="form.city"
          class="form-input"
          placeholder="比如：上海"
          maxlength="10"
        />
      </div>

      <div class="form-group">
        <label class="form-label">性别（选填）</label>
        <div class="gender-options">
          <button
            v-for="g in genderOptions"
            :key="g.value"
            class="gender-item"
            :class="{ active: form.gender === g.value }"
            @click="form.gender = g.value"
          >
            {{ g.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="form-section">
      <p class="section-title">3 个行为问题</p>

      <div
        v-for="q in behaviorQuestions"
        :key="q.id"
        class="question-card"
      >
        <p class="question-title">{{ q.title }}</p>
        <div class="question-options">
          <button
            v-for="opt in q.options"
            :key="opt.value"
            class="option-chip"
            :class="{ active: form[q.id] === opt.value }"
            @click="form[q.id] = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="form-section">
      <p class="section-title">即将生成的性格结果</p>
      <div class="result-preview">
        <p class="persona-title">{{ personalityTitle }}</p>
        <div class="tag-list">
          <span v-for="tag in generatedTags" :key="tag" class="tag-item selected">{{ tag }}</span>
        </div>
      </div>
    </div>

    <div class="action-bar safe-bottom">
      <button
        class="btn-primary"
        :disabled="!canGenerate"
        @click="generateCard"
      >
        生成名片并去分享
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { trackEvent, trackFunnel, EVENTS, FUNNEL_STEPS } from '../utils/tracking'

const router = useRouter()

const cardData = ref({})
const form = reactive({
  nickname: '',
  city: '',
  gender: '',
  q1: '',
  q2: '',
  q3: ''
})

const genderOptions = [
  { value: '弟弟', label: '弟弟' },
  { value: '妹妹', label: '妹妹' },
  { value: '不确定', label: '不确定' }
]

const behaviorQuestions = [
  {
    id: 'q1',
    title: '在家里最常见的状态是？',
    options: [
      { value: 'clingy', label: '黏人求抱抱', tag: '黏人撒娇' },
      { value: 'observe', label: '独处观察', tag: '独立观察' },
      { value: 'energetic', label: '精力旺盛', tag: '活力充沛' },
      { value: 'calm', label: '淡定躺平', tag: '佛系稳重' }
    ]
  },
  {
    id: 'q2',
    title: '遇到陌生人通常会？',
    options: [
      { value: 'social', label: '主动社交', tag: '社交主动' },
      { value: 'slow', label: '慢热试探', tag: '慢热谨慎' },
      { value: 'guard', label: '警惕护主', tag: '护主警觉' },
      { value: 'ignore', label: '无视路过', tag: '淡定路人' }
    ]
  },
  {
    id: 'q3',
    title: '最喜欢的活动是？',
    options: [
      { value: 'run', label: '追球奔跑', tag: '运动派' },
      { value: 'explore', label: '嗅闻探索', tag: '探索控' },
      { value: 'cuddle', label: '贴贴撒娇', tag: '贴贴怪' },
      { value: 'sleep', label: '吃完就睡', tag: '宅家党' }
    ]
  }
]

const canGenerate = computed(() => {
  return Boolean(
    form.nickname &&
    form.city &&
    form.q1 &&
    form.q2 &&
    form.q3
  )
})

const generatedTags = computed(() => {
  const tags = behaviorQuestions.map((q) => {
    const selected = q.options.find((opt) => opt.value === form[q.id])
    return selected?.tag
  }).filter(Boolean)

  if (tags.length >= 3) return tags
  return ['稳定陪伴', '社交友好', '生活有趣']
})

const personalityTitle = computed(() => {
  if (form.q1 === 'energetic' && form.q3 === 'run') return '运动发电机'
  if (form.q1 === 'clingy' && form.q2 === 'social') return '社牛小甜豆'
  if (form.q1 === 'observe' && form.q2 === 'slow') return '慢热观察家'
  if (form.q1 === 'calm') return '佛系治愈系'
  return '稳定陪伴型'
})

function goBack() {
  router.back()
}

function generateCard() {
  if (!canGenerate.value) return

  const fullData = {
    ...cardData.value,
    nickname: form.nickname,
    city: form.city,
    gender: form.gender || '不确定',
    age: cardData.value.age || '保密',
    tags: generatedTags.value,
    signature: '',
    availableTime: '',
    quickMode: false,
    templateStyle: 'meme',
    personalityProfile: {
      title: personalityTitle.value,
      source: 'breed_plus_quiz',
      answers: {
        q1: form.q1,
        q2: form.q2,
        q3: form.q3
      }
    }
  }

  trackEvent(EVENTS.INFO_SUBMITTED, {
    breed: cardData.value.breed,
    personality_title: personalityTitle.value,
    tag_count: fullData.tags.length
  })

  trackFunnel(FUNNEL_STEPS.INFO_SUBMITTED, {
    breed: cardData.value.breed
  })

  sessionStorage.setItem('pet_card_data', JSON.stringify(fullData))
  router.push('/card')
}

onMounted(() => {
  const stored = sessionStorage.getItem('pet_card_data')
  if (!stored) {
    router.replace('/')
    return
  }

  cardData.value = JSON.parse(stored)
  form.nickname = cardData.value.nickname || ''
  form.city = cardData.value.city || ''
  form.gender = cardData.value.gender || ''
  form.q1 = cardData.value.personalityProfile?.answers?.q1 || ''
  form.q2 = cardData.value.personalityProfile?.answers?.q2 || ''
  form.q3 = cardData.value.personalityProfile?.answers?.q3 || ''
})
</script>

<style scoped>
.info-page {
  padding-bottom: 100px;
}

.breed-confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 180, 160, 0.32);
  background: linear-gradient(180deg, #fff7f3 0%, #fffdfb 100%);
}

.breed-main {
  display: flex;
  flex-direction: column;
}

.breed-label {
  font-size: 12px;
  color: #8c7e73;
}

.breed-value {
  font-size: 22px;
  font-weight: 900;
  color: var(--primary);
  line-height: 1.2;
}

.breed-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.confidence-chip {
  font-size: 12px;
  color: #476f59;
  background: #eefaf3;
  border: 1px solid rgba(126, 217, 166, 0.42);
  border-radius: 999px;
  padding: 4px 8px;
}

.breed-edit {
  border: 1px solid rgba(255, 180, 160, 0.36);
  background: #fff;
  border-radius: 999px;
  color: var(--text-muted);
  padding: 4px 10px;
  font-size: 12px;
}

.logic-card {
  margin-bottom: 22px;
  border-radius: 14px;
  background: #fff8ed;
  border: 1px solid rgba(255, 196, 134, 0.42);
  padding: 12px;
}

.logic-title {
  font-size: 13px;
  font-weight: 800;
  color: #7e5528;
  margin-bottom: 6px;
}

.logic-line {
  font-size: 13px;
  color: #7e6654;
  line-height: 1.5;
}

.form-section {
  margin-bottom: 22px;
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.gender-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.gender-item {
  border: 1.5px solid rgba(255, 180, 160, 0.3);
  border-radius: 12px;
  background: #fff;
  padding: 10px 6px;
  color: #745d4d;
  font-size: 14px;
  font-weight: 700;
}

.gender-item.active {
  border-color: var(--primary);
  color: var(--primary-dark);
  background: #fff0f2;
}

.question-card {
  border-radius: 14px;
  border: 1px solid rgba(255, 180, 160, 0.24);
  background: #fff;
  padding: 12px;
  margin-bottom: 10px;
}

.question-title {
  font-size: 14px;
  font-weight: 700;
  color: #4a3d33;
  margin-bottom: 8px;
}

.question-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-chip {
  border: 1.5px solid rgba(255, 180, 160, 0.3);
  border-radius: 999px;
  background: #fff7f4;
  color: #6e5a4a;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
}

.option-chip.active {
  border-color: var(--primary);
  background: #fff0f2;
  color: var(--primary-dark);
}

.result-preview {
  border-radius: 14px;
  border: 1px solid rgba(126, 217, 166, 0.38);
  background: linear-gradient(180deg, #f2fff7 0%, #ffffff 100%);
  padding: 12px;
}

.persona-title {
  font-size: 16px;
  font-weight: 900;
  color: #2f6a4a;
  margin-bottom: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 750px;
  margin: 0 auto;
  padding: 16px 20px;
  background: linear-gradient(transparent, var(--bg) 30%);
}
</style>
