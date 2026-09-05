<!-- 替換至 template 中原本時鐘設定的地方 -->
<div class="settings-section" style="margin-top: 25px;">
  <h4>🕒 首頁時鐘樣式總管</h4>
  <p class="help-text">💡 自由搭配 10 種專屬風格、顏色與大小，打造獨一無二的班級看板！</p>

  <div class="clock-settings-grid">
    <div class="form-group">
      <label>🎨 時鐘風格：</label>
      <select v-model="clockConfig.theme" class="edit-input">
        <option value="classic">1. 經典預設 (Classic)</option>
        <option value="lcd">2. 液晶電子 (Digital LCD)</option>
        <option value="flip">3. 復古翻頁 (Retro Flip)</option>
        <option value="neon">4. 科技發光 (Neon Glow)</option>
        <option value="minimal">5. 極簡文青 (Minimalist)</option>
        <option value="gradient">6. 漸層流光 (Gradient)</option>
        <option value="emboss">7. 3D 立體 (3D Emboss)</option>
        <option value="cyber">8. 賽博龐克 (Cyberpunk)</option>
        <option value="glass">9. 質感毛玻璃 (Glassmorphism)</option>
        <option value="chalk">10. 黑板手寫 (Chalkboard)</option>
      </select>
    </div>

    <div class="form-group">
      <label>📏 字體大小 (px)：</label>
      <input type="number" v-model="clockConfig.size" class="edit-input" min="10" max="150" />
    </div>

    <div class="form-group">
      <label>🖌️ 主題顏色：</label>
      <div class="color-picker-box">
        <input type="color" v-model="clockConfig.color" class="color-input" />
        <span class="color-hex">{{ clockConfig.color }}</span>
      </div>
    </div>

    <div class="form-group chk-group">
      <label class="icon-toggle">
        <input type="checkbox" v-model="clockConfig.showIcon" />
        顯示 🕒 時鐘圖示
      </label>
    </div>
  </div>

  <button @click="saveClockSettings" class="save-btn" :disabled="isSavingClock">
    {{ isSavingClock ? '儲存中...' : '💾 儲存時鐘設定' }}
  </button>
</div>
