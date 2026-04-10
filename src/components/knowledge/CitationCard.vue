<template>
  <el-card class="citation-card" @click="handleClick">
    <template #header>
      <div class="card-header">
        <span>引用来源</span>
      </div>
    </template>
    
    <div class="citation-content">
      <div class="citation-source">
        <el-icon><Document /></el-icon>
        <span>{{ source }}</span>
      </div>
      <div class="citation-snippet">
        {{ snippet }}
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { Document } from '@element-plus/icons-vue'

const props = defineProps({
  source: {
    type: String,
    default: ''
  },
  snippet: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.citation-card {
  margin-top: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.citation-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.citation-content {
  padding: 10px 0;
}

.citation-source {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: bold;
  color: #409eff;
}

.citation-snippet {
  font-size: 14px;
  line-height: 1.5;
  color: #606266;
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>