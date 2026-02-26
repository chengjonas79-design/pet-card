<template>
  <div class="page-container home-page">
    <!-- 顶部品牌 -->
    <div class="brand-header">
      <!-- TODO: 替换为真实 logo -->
      <div class="brand-logo">🐾</div>
      <h1 class="page-title">给你家毛孩子做张名片</h1>
      <p class="page-subtitle">拍一拍，AI 识别品种，生成专属社交名片</p>
    </div>

    <!-- 上传区域 -->
    <div
      class="upload-area"
      :class="{ 'has-photo': photoPreview }"
      @click="triggerUpload"
    >
      <template v-if="!photoPreview">
        <div class="upload-icon">📸</div>
        <p class="upload-text">拍照 / 上传宠物照片</p>
        <p class="upload-hint">支持猫咪和狗狗，AI 自动识别品种</p>
      </template>
      <template v-else>
        <img :src="photoPreview" class="photo-preview" alt="宠物照片" />
        <div class="photo-overlay">
          <span>点击重新选择</span>
        </div>
      </template>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display: none"
      @change="onFileSelected"
    />

    <!-- 识别中状态 -->
    <div v-if="identifying" class="loading-spinner">
      <div class="spinner"></div>
      <p class="text">AI 正在识别品种中...</p>
      <p class="text" style="font-size:12px; margin-top:4px;">大约需要2-3秒</p>
    </div>

    <!-- 识别结果 -->
    <div v-if="identifyResult && !identifying" class="result-section">
      <div v-if="identifyMode === 'mock'" class="demo-mode-tip">
        当前为演示识别模式（未接大模型），你可以继续完整体验后续流程。
      </div>

      <!-- 高置信度: ≥80% -->
      <div v-if="identifyResult.confidence >= 0.8" class="result-card high-confidence">
        <div class="result-breed">{{ identifyResult.breed }}</div>
        <div class="result-confidence">
          AI 置信度 {{ Math.round(identifyResult.confidence * 100) }}%
        </div>
        <button class="btn-change" @click="openManualSelect('high_confidence')">
          不对？点这里修改
        </button>
      </div>

      <!-- 中置信度: 50%-80% -->
      <div v-else-if="identifyResult.confidence >= 0.5" class="result-card mid-confidence">
        <p class="result-hint">AI 觉得它可能是：</p>
        <div class="candidate-list">
          <div
            v-for="(c, i) in identifyResult.candidates"
            :key="i"
            class="candidate-item"
            :class="{ active: selectedBreed === c.breed }"
            @click="onCandidateSelect(c, i)"
          >
            <span class="candidate-num">{{ i + 1 }}</span>
            <span class="candidate-name">{{ c.breed }}</span>
            <span class="candidate-pct">{{ Math.round(c.confidence * 100) }}%</span>
          </div>
        </div>
        <button class="btn-change" @click="openManualSelect('mid_confidence')">
          都不对？手动选择
        </button>
      </div>

      <!-- 低置信度: <50% -->
      <div v-else class="result-card low-confidence">
        <p class="result-hint">🤔 AI 没有足够把握识别品种</p>
        <p class="result-sub-hint">请手动选择你家毛孩子的品种</p>
      </div>

      <!-- 手动选择面板 -->
      <div v-if="showManualSelect || identifyResult.confidence < 0.5" class="manual-select">
        <div class="search-box">
          <input
            v-model="breedSearch"
            class="form-input"
            placeholder="搜索品种..."
          />
        </div>
        <div class="breed-tabs">
          <span
            class="breed-tab"
            :class="{ active: breedTab === 'dog' }"
            @click="breedTab = 'dog'"
          >🐶 狗狗</span>
          <span
            class="breed-tab"
            :class="{ active: breedTab === 'cat' }"
            @click="breedTab = 'cat'"
          >🐱 猫猫</span>
        </div>
        <div class="breed-grid">
          <div
            v-for="breed in filteredBreeds"
            :key="breed"
            class="breed-option"
            :class="{ active: selectedBreed === breed }"
            @click="onBreedOptionSelect(breed, 'manual_list')"
          >
            {{ breed }}
          </div>
          <div
            class="breed-option mixed"
            :class="{ active: selectedBreed === '混血/不确定' }"
            @click="onBreedOptionSelect('混血/不确定', 'manual_list')"
          >
            混血/不确定
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="identifyError" class="error-tip">
      <p>{{ identifyError }}</p>
      <button class="btn-secondary" @click="resetUpload" style="margin-top:12px;">
        重新上传
      </button>
    </div>

    <!-- 下一步按钮 -->
    <div v-if="canProceed" class="action-bar safe-bottom">
      <button class="btn-primary" @click="goQuickGenerate">
        30秒生成可分享卡 ⚡
      </button>
      <button class="btn-secondary btn-with-gap" @click="goNext">
        完善资料再生成 ✏️
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBreedIdentify } from '../composables/useBreedIdentify'
import { trackEvent, trackFunnel, EVENTS, FUNNEL_STEPS } from '../utils/tracking'
import { hotBreeds } from '../data/breeds'

const router = useRouter()
const fileInput = ref(null)
const photoPreview = ref(null)
const photoBase64 = ref(null)
const selectedBreed = ref('')
const showManualSelect = ref(false)
const breedSearch = ref('')
const breedTab = ref('dog')

const {
  loading: identifying,
  result: identifyResult,
  error: identifyError,
  identifyMode,
  identifyBreed
} = useBreedIdentify()

// 过滤品种列表
const filteredBreeds = computed(() => {
  const list = hotBreeds[breedTab.value] || []
  if (!breedSearch.value) return list
  return list.filter(b => b.includes(breedSearch.value))
})

// 是否可以进入下一步
const canProceed = computed(() => {
  if (!photoPreview.value) return false
  if (identifying.value) return false
  // 高置信度自动有品种
  if (identifyResult.value?.confidence >= 0.8 && !showManualSelect.value) return true
  // 手动或候选选择了品种
  if (selectedBreed.value) return true
  return false
})

// 最终确认的品种
const finalBreed = computed(() => {
  if (selectedBreed.value) return selectedBreed.value
  if (identifyResult.value?.confidence >= 0.8) return identifyResult.value.breed
  return ''
})

function triggerUpload() {
  fileInput.value?.click()
}

async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return

  // 预览
  const reader = new FileReader()
  reader.onload = async (ev) => {
    photoPreview.value = ev.target.result
    photoBase64.value = ev.target.result

    // 重置状态
    selectedBreed.value = ''
    showManualSelect.value = false

    trackEvent(EVENTS.PHOTO_UPLOAD, {
      file_size: file.size || 0,
      file_type: file.type || 'unknown'
    })
    trackFunnel(FUNNEL_STEPS.PHOTO_UPLOADED)

    // 调用品种识别
    try {
      const result = await identifyBreed(ev.target.result)
      if (result.confidence >= 0.8) {
        selectedBreed.value = result.breed
      }
    } catch (e) {
      // 错误已在 composable 中处理
    }
  }
  reader.readAsDataURL(file)
}

function resetUpload() {
  photoPreview.value = null
  photoBase64.value = null
  identifyResult.value = null
  identifyError.value = null
  selectedBreed.value = ''
  showManualSelect.value = false
  if (fileInput.value) fileInput.value.value = ''
}

function goNext() {
  // 将数据传递到下一页
  const data = {
    photoUrl: photoPreview.value,
    breed: finalBreed.value,
    breedModified: identifyResult.value?.breed !== finalBreed.value
  }

  trackEvent(EVENTS.NEXT_TO_INFO, {
    breed: finalBreed.value,
    breed_modified: data.breedModified,
    confidence_bucket: getConfidenceBucket(identifyResult.value?.confidence)
  })

  trackFunnel(FUNNEL_STEPS.HOME_TO_INFO, {
    breed: finalBreed.value
  })

  // 使用 sessionStorage 传递数据（避免 URL 过长）
  sessionStorage.setItem('pet_card_data', JSON.stringify(data))
  router.push('/info')
}

function goQuickGenerate() {
  const breed = finalBreed.value
  const data = {
    photoUrl: photoPreview.value,
    breed,
    breedModified: identifyResult.value?.breed !== breed,
    nickname: '我家毛孩子',
    gender: '不确定',
    age: '保密',
    city: '同城',
    tags: ['社交牛牛', '撒娇达人', '拍照模特'],
    signature: '',
    availableTime: '',
    quickMode: true,
    templateStyle: 'meme'
  }

  trackEvent(EVENTS.QUICK_GENERATE_CLICKED, {
    breed,
    confidence_bucket: getConfidenceBucket(identifyResult.value?.confidence)
  })

  trackFunnel(FUNNEL_STEPS.HOME_TO_CARD_QUICK, {
    breed
  })

  sessionStorage.setItem('pet_card_data', JSON.stringify(data))
  router.push('/card')
}

function openManualSelect(triggerFrom) {
  showManualSelect.value = true
  trackEvent(EVENTS.BREED_MANUAL_SELECT_OPENED, {
    trigger_from: triggerFrom,
    current_confidence: identifyResult.value?.confidence ?? null
  })
}

function onCandidateSelect(candidate, index) {
  selectedBreed.value = candidate.breed
  trackEvent(EVENTS.BREED_SELECTED, {
    select_source: 'candidate',
    candidate_index: index + 1,
    breed: candidate.breed,
    confidence: candidate.confidence
  })
}

function onBreedOptionSelect(breed, source) {
  selectedBreed.value = breed
  trackEvent(EVENTS.BREED_SELECTED, {
    select_source: source,
    breed
  })
}

function getConfidenceBucket(confidence = 0) {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand-header {
  text-align: center;
  margin-bottom: 32px;
}

.brand-logo {
  font-size: 56px;
  margin-bottom: 12px;
}

/* 上传区域 */
.upload-area {
  width: 100%;
  min-height: 280px;
  border: 3px dashed rgba(255, 180, 160, 0.5);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #FFF5F0 0%, #FFEDE8 100%);
}

.upload-area:active {
  border-color: var(--primary);
  background: #FFF0F2;
}

.upload-area.has-photo {
  border-style: solid;
  border-color: var(--primary);
  min-height: 360px;
  background: #fff;
}

.upload-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 14px;
  color: var(--text-muted);
}

.photo-preview {
  width: 100%;
  height: 360px;
  object-fit: cover;
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.5));
  text-align: center;
  color: rgba(255,255,255,0.9);
  font-size: 14px;
}

/* 识别结果 */
.result-section {
  width: 100%;
  margin-top: 24px;
}

.demo-mode-tip {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff4df;
  border: 1px solid rgba(255, 185, 97, 0.38);
  color: #7e5528;
  font-size: 13px;
  text-align: left;
}

.result-card {
  padding: 24px;
  border-radius: var(--radius-card);
  text-align: center;
  margin-bottom: 16px;
  background: linear-gradient(180deg, #FFFFFF 0%, #FFFAF8 100%);
  box-shadow: 0 8px 24px rgba(180, 120, 100, 0.08);
  border: 1px solid rgba(255, 180, 160, 0.20);
}

.high-confidence {
  border-color: rgba(126, 217, 166, 0.4);
  background: linear-gradient(180deg, #F0FFF5 0%, #FFFFFF 100%);
}

.mid-confidence {
  border-color: rgba(255, 214, 102, 0.4);
  background: linear-gradient(180deg, #FFFBF0 0%, #FFFFFF 100%);
}

.low-confidence {
  border-color: rgba(255, 107, 129, 0.3);
  background: linear-gradient(180deg, #FFF5F5 0%, #FFFFFF 100%);
}

.result-breed {
  font-size: 36px;
  font-weight: 900;
  color: var(--primary);
  margin-bottom: 8px;
}

.result-confidence {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.result-hint {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 16px;
}

.result-sub-hint {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.btn-change {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
  padding: 8px;
}

/* 候选列表 */
.candidate-list {
  margin-bottom: 12px;
}

.candidate-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  margin: 8px 0;
  background: var(--bg-input);
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.candidate-item.active {
  border-color: var(--primary);
  background: #FFF0F2;
}

.candidate-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  margin-right: 12px;
}

.candidate-name {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  text-align: left;
  color: var(--text-main);
}

.candidate-pct {
  font-size: 14px;
  color: var(--text-muted);
}

/* 手动选择 */
.manual-select {
  margin-top: 16px;
}

.search-box {
  margin-bottom: 16px;
}

.breed-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.breed-tab {
  flex: 1;
  padding: 12px;
  text-align: center;
  background: var(--bg-input);
  border-radius: 14px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.breed-tab.active {
  background: #FFF0F2;
  color: var(--primary);
}

.breed-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.breed-option {
  padding: 10px 16px;
  background: var(--bg-input);
  border: 2px solid transparent;
  border-radius: 999px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.breed-option.active {
  border-color: var(--primary);
  background: #FFF0F2;
  color: var(--primary);
}

.breed-option.mixed {
  border-style: dashed;
  border-color: var(--text-muted);
  color: var(--text-muted);
}

.breed-option.mixed.active {
  border-color: var(--primary);
  color: var(--primary);
}

/* 错误提示 */
.error-tip {
  width: 100%;
  margin-top: 24px;
  padding: 20px;
  background: #FFF0F2;
  border: 1px solid rgba(255, 107, 129, 0.3);
  border-radius: var(--radius-card);
  text-align: center;
  color: var(--primary-dark);
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
  background: linear-gradient(transparent, var(--bg) 30%);
}

.btn-with-gap {
  margin-top: 10px;
}
</style>
