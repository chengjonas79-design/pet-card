import { breedPercentage, getBreedPercentageText } from '../data/breeds'

export function buildViralProfile(cardData = {}) {
  const breed = cardData.breed || '神秘品种'
  const nickname = cardData.nickname || '毛孩子'
  const city = cardData.city || '同城'
  const seed = `${breed}_${nickname}_${city}_${cardData.age || ''}`

  const charmPercentile = 68 + (hash(seed) % 30) // 68-97
  const cityRank = 1 + (hash(`${seed}_rank`) % 99)
  const matchScore = 72 + (hash(`${seed}_match`) % 27) // 72-98
  const rarityValue = breedPercentage[breed] || 2

  return {
    breed,
    city,
    charmPercentile,
    cityRank,
    matchScore,
    rarityValue,
    rarityLabel: getRarityLabel(rarityValue),
    percentageText: getBreedPercentageText(breed)
  }
}

export function buildShareMessage(cardData = {}, viralProfile = {}, shareUrl = '') {
  const nickname = cardData.nickname || '我家毛孩子'
  const breed = viralProfile.breed || cardData.breed || '神秘品种'
  const city = viralProfile.city || cardData.city || '同城'
  const charm = viralProfile.charmPercentile || 88
  const rank = viralProfile.cityRank || 35

  return [
    `刚给${nickname}做了宠名片，AI识别是${breed}！`,
    `同城萌力值打败${charm}%毛孩子，预计排在${city}前${rank}名。`,
    `你也来测测你家毛孩子：${shareUrl}`
  ].join('\n')
}

function getRarityLabel(rarityValue) {
  if (rarityValue <= 2) return '稀有选手'
  if (rarityValue <= 4) return '小众宝藏'
  if (rarityValue <= 6) return '人气品种'
  return '热门顶流'
}

function hash(text) {
  let value = 0
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0
  }
  return value
}
