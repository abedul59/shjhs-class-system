<template>
  <div class="weather-widget">
    <div v-if="isLoading" class="loading">⏳ 天氣載入中...</div>
    <div v-else class="weather-info">
      <span class="location-tag">📍新化區</span>
      
      <div v-for="(w, index) in weatherData" :key="w.label" class="weather-day" :class="{ 'is-tomorrow': index === 1 }">
        <span class="w-label">{{ w.label }}</span>
        <span class="w-icon" :title="w.text">{{ w.icon }}</span>
        <span class="w-temp">{{ w.tempMin }}° ~ {{ w.tempMax }}°</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const weatherData = ref([])
const isLoading = ref(true)

const fetchWeather = async () => {
  try {
    // 鎖定台南市新化區座標 (Lat: 23.0385, Lon: 120.3067)，抓取今明兩天資料
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=23.0385&longitude=120.3067&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTaipei&forecast_days=2'
    const res = await fetch(url)
    const data = await res.json()

    // 國際氣象代碼 (WMO Weather interpretation codes) 轉換為表情與文字
    const parseWeatherCode = (code) => {
      if (code === 0) return { icon: '☀️', text: '晴天' }
      if (code === 1 || code === 2) return { icon: '⛅', text: '多雲' }
      if (code === 3) return { icon: '☁️', text: '陰天' }
      if (code >= 45 && code <= 48) return { icon: '🌫️', text: '霧' }
      if (code >= 51 && code <= 67) return { icon: '🌧️', text: '雨天' }
      if (code >= 71 && code <= 77) return { icon: '❄️', text: '雪' }
      if (code >= 80 && code <= 82) return { icon: '🌦️', text: '陣雨' }
      if (code >= 95 && code <= 99) return { icon: '⛈️', text: '雷雨' }
      return { icon: '🌈', text: '未知' }
    }

    weatherData.value = data.daily.time.map((date, index) => {
      const codeInfo = parseWeatherCode(data.daily.weathercode[index])
      return {
        label: index === 0 ? '今日' : '明日',
        icon: codeInfo.icon,
        text: codeInfo.text,
        tempMin: Math.round(data.daily.temperature_2m_min[index]),
        tempMax: Math.round(data.daily.temperature_2m_max[index])
      }
    })
  } catch (e) {
    console.error('天氣抓取失敗', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchWeather()
})
</script>

<style scoped>
.weather-widget {
  display: inline-flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 50px;
  padding: 6px 15px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05);
  font-family: sans-serif;
}
.loading {
  font-size: 0.9rem;
  color: #64748b;
}
.weather-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.location-tag {
  font-weight: bold;
  color: #0369a1;
  background: #e0f2fe;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
  border: 1px solid #bae6fd;
}
.weather-day {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
}
.is-tomorrow {
  border-left: 2px dotted #cbd5e1;
  padding-left: 12px;
}
.w-label { color: #64748b; font-weight: bold; font-size: 0.85rem; }
.w-icon { font-size: 1.15rem; cursor: help; }
.w-temp { font-weight: bold; color: #334155; }

@media (max-width: 768px) {
  .weather-widget { border-radius: 12px; padding: 10px; }
  .weather-info { flex-direction: column; gap: 8px; align-items: flex-start; }
  .is-tomorrow { border-left: none; padding-left: 0; border-top: 1px dashed #cbd5e1; padding-top: 8px; width: 100%;}
}
</style>
