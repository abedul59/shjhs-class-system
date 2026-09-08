<template>
  <div v-if="marqueeData?.isVisible && marqueeData?.text" class="marquee-widget" :style="cssVars">
    <div :class="['marquee-text', `effect-${marqueeData.effect}`]">
      {{ marqueeData.text }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  marqueeData: {
    type: Object,
    default: () => ({ isVisible: false, text: '', speed: 15, effect: 'scroll-left', color: '#dc2626', bgColor: '#fee2e2' })
  }
})

// 將使用者的設定綁定為 CSS 變數
const cssVars = computed(() => {
  const d = props.marqueeData || {}
  return {
    '--mq-speed': `${d.speed || 15}s`,
    '--mq-color': d.color || '#dc2626',
    '--mq-bg': d.bgColor || '#fee2e2'
  }
})
</script>

<style scoped>
.marquee-widget {
  width: 100%;
  overflow: hidden;
  background-color: var(--mq-bg);
  color: var(--mq-color);
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 1.15rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.02);
}

.marquee-text {
  white-space: nowrap;
  width: 100%;
}

/* 1. 向左捲動 (經典跑馬燈) */
.effect-scroll-left {
  display: inline-block;
  padding-left: 100%;
  animation: scroll var(--mq-speed) linear infinite;
}
@keyframes scroll { 
  0% { transform: translateX(0); } 
  100% { transform: translateX(-100%); } 
}

/* 2. 閃爍警告 */
.effect-blink {
  text-align: center;
  animation: blink var(--mq-speed) step-end infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* 3. 呼吸光暈 */
.effect-pulse {
  text-align: center;
  animation: pulse var(--mq-speed) ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); opacity: 0.8; } }

/* 4. 靜態置中 */
.effect-static {
  text-align: center;
}
</style>
