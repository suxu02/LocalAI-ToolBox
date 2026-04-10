<template>
  <el-card class="chat-box">
    <template #header>
      <div class="card-header">
        <span>AI 回答</span>
        <el-button
          v-if="loading"
          type="text"
          @click="stopGeneration"
          size="small"
        >
          停止生成
        </el-button>
      </div>
    </template>
    
    <div class="chat-content">
      <div v-if="messages.length === 0" class="empty-chat">
        <el-empty description="生成的内容将显示在这里" />
      </div>
      
      <div v-else class="message-list">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message-item', message.role]"
        >
          <div class="message-role">{{ message.role === 'user' ? '你' : 'AI' }}：</div>
          <div class="message-content" v-html="renderMarkdown(message.content)"></div>
        </div>
      </div>
      
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>AI 正在生成...</span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { marked } from 'marked'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['stop'])

// 渲染 Markdown
const renderMarkdown = (text) => {
  if (!text) return ''
  return marked.parse(text)
}

const stopGeneration = () => {
  emit('stop')
}
</script>

<style scoped>
.chat-box {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-content {
  min-height: 200px;
  max-height: 500px;
  overflow-y: auto;
  padding: 10px 0;
}

.empty-chat {
  padding: 40px 0;
  text-align: center;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message-item {
  display: flex;
  gap: 10px;
  max-width: 100%;
}

.message-item.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-item.assistant {
  align-self: flex-start;
}

.message-item.user .message-role {
  text-align: right;
}

.message-item.user .message-content {
  background-color: #ecf5ff;
  padding: 10px 15px;
  border-radius: 12px 12px 0 12px;
  text-align: left;
}

.message-item.assistant .message-content {
  background-color: #f5f7fa;
  padding: 10px 15px;
  border-radius: 12px 12px 12px 0;
}

.message-role {
  font-weight: bold;
  min-width: 30px;
  padding: 10px 0;
}

.message-content {
  flex: 1;
  line-height: 1.6;
  max-width: 80%;
}

/* Markdown 样式 */
.message-content :deep(h1) {
  font-size: 24px;
  font-weight: bold;
  margin: 16px 0 8px 0;
}

.message-content :deep(h2) {
  font-size: 20px;
  font-weight: bold;
  margin: 14px 0 6px 0;
}

.message-content :deep(h3) {
  font-size: 18px;
  font-weight: bold;
  margin: 12px 0 4px 0;
}

.message-content :deep(h4),
.message-content :deep(h5),
.message-content :deep(h6) {
  font-size: 16px;
  font-weight: bold;
  margin: 10px 0 4px 0;
}

.message-content :deep(p) {
  margin: 8px 0;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-content :deep(li) {
  margin: 4px 0;
}

.message-content :deep(code) {
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}

.message-content :deep(pre) {
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 10px 0;
}

.message-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.message-content :deep(blockquote) {
  border-left: 4px solid #409eff;
  padding-left: 10px;
  margin: 10px 0;
  color: #606266;
}

.loading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  color: #409eff;
}
</style>