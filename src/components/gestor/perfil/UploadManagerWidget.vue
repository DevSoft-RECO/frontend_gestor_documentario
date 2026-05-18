<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUploadStore } from '@/stores/upload'

const uploadStore = useUploadStore()
const isMinimized = ref(false)

const activeUploads = computed(() => {
  return uploadStore.uploads.filter(u => u.status === 'uploading')
})

const hasUploads = computed(() => {
  return uploadStore.uploads.length > 0
})

const totalProgress = computed(() => {
  if (activeUploads.value.length === 0) return 100
  const sum = activeUploads.value.reduce((acc, curr) => acc + curr.progress, 0)
  return Math.round(sum / activeUploads.value.length)
})

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}
</script>

<template>
  <Transition name="fade-slide">
    <div v-if="hasUploads" class="upload-widget-container" :class="{ 'is-minimized': isMinimized }">
      <!-- HEADER -->
      <div class="widget-header" @click="toggleMinimize">
        <div class="header-info">
          <div class="icon-spin-box" v-if="activeUploads.length > 0">
            <span class="spinner-blue"></span>
          </div>
          <div class="icon-success-box" v-else>
            <i>✅</i>
          </div>
          <span class="header-text">
            <template v-if="activeUploads.length > 0">
              Subiendo {{ activeUploads.length }} {{ activeUploads.length === 1 ? 'archivo' : 'archivos' }} ({{ totalProgress }}%)
            </template>
            <template v-else>
              Cargas completadas ({{ uploadStore.uploads.length }})
            </template>
          </span>
        </div>
        
        <div class="header-actions">
          <button @click.stop="toggleMinimize" class="btn-action">
            <template v-if="isMinimized">▲</template>
            <template v-else>▼</template>
          </button>
          <button @click.stop="uploadStore.clearCompleted" v-if="activeUploads.length === 0" class="btn-action close-btn">×</button>
        </div>
      </div>

      <!-- BODY LIST (ONLY SHOWN IF NOT MINIMIZED) -->
      <Transition name="expand">
        <div v-if="!isMinimized" class="widget-body">
          <div class="uploads-list">
            <div v-for="item in uploadStore.uploads" :key="item.id" class="upload-item-row">
              <div class="item-meta">
                <span class="file-name" :title="item.fileName">{{ item.fileName }}</span>
                <span class="file-status" :class="item.status">
                  <template v-if="item.status === 'uploading'">{{ item.progress }}%</template>
                  <template v-else-if="item.status === 'completed'">Completado</template>
                  <template v-else>Error</template>
                </span>
              </div>

              <!-- PROGRESS BAR -->
              <div class="progress-track">
                <div 
                  class="progress-fill" 
                  :class="item.status"
                  :style="{ width: item.progress + '%' }"
                ></div>
              </div>

              <!-- ERROR MESSAGE -->
              <p v-if="item.status === 'failed' && item.error" class="error-text">
                {{ item.error }}
              </p>

              <!-- REMOVE BUTTON (ONLY FOR NON-UPLOADING ITEMS) -->
              <button 
                v-if="item.status !== 'uploading'" 
                @click="uploadStore.removeUpload(item.id)" 
                class="btn-remove-row"
              >
                Eliminar de la lista
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.upload-widget-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 360px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.15);
  z-index: 9999;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.upload-widget-container.is-minimized {
  width: 300px;
}

.widget-header {
  padding: 1rem 1.25rem;
  background: #0f172a;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-spin-box {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-blue {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.icon-success-box {
  font-size: 0.9rem;
}

.header-text {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-action {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: 0.2s;
}

.btn-action:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.btn-action.close-btn {
  font-size: 1.2rem;
  line-height: 1;
}

.widget-body {
  max-height: 320px;
  overflow-y: auto;
  padding: 1rem;
}

.uploads-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upload-item-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.upload-item-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.file-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.file-status {
  font-size: 0.75rem;
  font-weight: 800;
}

.file-status.uploading { color: #0ea5e9; }
.file-status.completed { color: #10b981; }
.file-status.failed { color: #ef4444; }

.progress-track {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-fill.uploading { background: #0ea5e9; }
.progress-fill.completed { background: #10b981; }
.progress-fill.failed { background: #ef4444; }

.error-text {
  font-size: 0.7rem;
  color: #ef4444;
  margin: 0;
  font-weight: 500;
}

.btn-remove-row {
  align-self: flex-end;
  background: transparent;
  border: none;
  font-size: 0.7rem;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  font-weight: 600;
  text-decoration: underline;
  transition: 0.2s;
}

.btn-remove-row:hover {
  color: #0f172a;
}

/* Animations */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.expand-enter-active, .expand-leave-active {
  transition: max-height 0.3s ease-out, padding 0.3s ease-out;
  max-height: 320px;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dark Mode support */
:root.dark .upload-widget-container {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(51, 65, 85, 0.8);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

:root.dark .upload-item-row {
  border-bottom-color: #1e293b;
}

:root.dark .file-name {
  color: #f8fafc;
}

:root.dark .progress-track {
  background: #1e293b;
}

:root.dark .btn-remove-row:hover {
  color: #f8fafc;
}
</style>
