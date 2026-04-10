<template>
  <div class="home">
    <h1>历史档案馆</h1>
    
    <div class="home-container">
      <!-- 左侧筛选栏 -->
      <div class="filter-sidebar">
        <div class="filter-section">
          <h2>搜索</h2>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索历史记录"
            prefix-icon="el-icon-search"
            @input="filterHistory"
          />
        </div>
        
        <div class="filter-section">
          <h2>标签筛选</h2>
          <div class="tag-list">
            <el-tag
              v-for="tag in allTags"
              :key="tag"
              :type="activeTags.includes(tag) ? 'primary' : ''"
              :effect="activeTags.includes(tag) ? 'dark' : 'plain'"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
        
        <div class="filter-section">
          <h2>类型筛选</h2>
          <el-radio-group v-model="typeFilter" @change="filterHistory">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="prompt">提示词工坊</el-radio-button>
            <el-radio-button label="knowledge">知识库</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      
      <!-- 右侧历史记录列表 -->
      <div class="history-list">
        <!-- 空状态 -->
        <div v-if="filteredHistory.length === 0 && historyList.length === 0" class="empty-state">
          <el-empty
            description="暂无历史记录"
            :image-size="200"
          >
            <template #description>
              <span>开始你的第一次对话吧</span>
            </template>
            <el-button type="primary" @click="goToPromptLab">
              开始第一次对话
            </el-button>
          </el-empty>
        </div>
        
        <!-- 非空状态 -->
        <div v-else>
          <div class="list-header">
            <h2>最近使用</h2>
            <el-button
              type="danger"
              size="small"
              @click="clearAllHistory"
              :disabled="historyList.length === 0"
            >
              清空历史
            </el-button>
          </div>
          
          <div class="history-items">
            <el-card
              v-for="item in filteredHistory"
              :key="item.id"
              class="history-item"
              @click="openDetail(item)"
            >
              <template #header>
                <div class="card-header">
                  <span class="history-title">{{ item.title }}</span>
                  <el-tag :type="item.type === 'prompt' ? 'success' : 'info'">
                    {{ item.type === 'prompt' ? '工坊' : '知识库' }}
                  </el-tag>
                </div>
              </template>
              
              <div class="history-meta">
                <span class="history-time">{{ formatTime(item.createdAt) }}</span>
                <div class="history-tags" v-if="item.tags && item.tags.length > 0">
                  <el-tag
                    v-for="tag in item.tags"
                    :key="tag"
                    size="small"
                    effect="plain"
                  >
                    #{{ tag }}
                  </el-tag>
                </div>
              </div>
              
              <div class="history-preview">
                <p>{{ getPreview(item.messages) }}</p>
              </div>
              
              <div class="card-footer">
                <el-button
                  type="text"
                  size="small"
                  @click.stop="deleteHistory(item)"
                  style="color: #f56c6c"
                >
                  删除
                </el-button>
              </div>
            </el-card>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="对话详情"
      size="800px"
      direction="rtl"
    >
      <div class="drawer-content">
        <div class="drawer-header">
          <h3>{{ currentHistory?.title }}</h3>
          <div class="drawer-meta">
            <el-tag :type="currentHistory?.type === 'prompt' ? 'success' : 'info'">
              {{ currentHistory?.type === 'prompt' ? '提示词工坊' : '知识库' }}
            </el-tag>
            <span class="drawer-time">{{ formatTime(currentHistory?.createdAt) }}</span>
          </div>
        </div>
        
        <!-- 标签管理 -->
        <div class="tags-section">
          <h4>标签</h4>
          <el-input
            v-model="newTag"
            placeholder="输入标签并按回车"
            @keyup.enter="addTag"
            style="width: 200px"
          />
          <div class="tag-list">
            <el-tag
              v-for="tag in currentHistory?.tags || []"
              :key="tag"
              closable
              @close="removeTag(tag)"
            >
              #{{ tag }}
            </el-tag>
          </div>
        </div>
        
        <!-- 对话内容 -->
        <div class="dialog-content">
          <div
            v-for="(message, index) in currentHistory?.messages || []"
            :key="index"
            :class="['message-item', message.role]"
          >
            <div class="message-role">{{ message.role === 'user' ? '你' : 'AI' }}：</div>
            <div class="message-content" v-html="renderMarkdown(message.content)"></div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, ElEmpty } from 'element-plus'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import db from '../db'

const router = useRouter()

const historyList = ref([])
const searchKeyword = ref('')
const typeFilter = ref('all')
const activeTags = ref([])
const drawerVisible = ref(false)
const currentHistory = ref(null)
const newTag = ref('')

// 加载历史记录
const loadHistory = async () => {
  try {
    const list = await db.history.orderBy('createdAt').reverse().toArray()
    // 关键修复：深拷贝数据，确保列表数据是纯净的 JSON，不再与数据库或详情组件共享引用
    historyList.value = JSON.parse(JSON.stringify(list))
  } catch (error) {
    console.error('加载历史失败:', error)
  }
}

// 组件挂载时加载历史记录
onMounted(() => {
  loadHistory()
})

// 计算所有标签
const allTags = computed(() => {
  const tagsSet = new Set()
  historyList.value.forEach(item => {
    if (item.tags) {
      item.tags.forEach(tag => tagsSet.add(tag))
    }
  })
  return Array.from(tagsSet)
})

// 过滤历史记录
const filteredHistory = computed(() => {
  let filtered = historyList.value
  
  // 类型筛选
  if (typeFilter.value !== 'all') {
    filtered = filtered.filter(item => item.type === typeFilter.value)
  }
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(keyword) ||
      item.messages.some(msg => msg.content.toLowerCase().includes(keyword))
    )
  }
  
  // 标签筛选
  if (activeTags.value.length > 0) {
    filtered = filtered.filter(item => {
      if (!item.tags) return false
      return activeTags.value.every(tag => item.tags.includes(tag))
    })
  }
  
  return filtered
})

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取预览文本
const getPreview = (messages) => {
  if (!messages || messages.length === 0) return ''
  const firstMessage = messages[0].content
  return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '')
}

// 渲染 Markdown
const renderMarkdown = (text) => {
  if (!text) return ''
  return marked.parse(text)
}

// 切换标签
const toggleTag = (tag) => {
  const index = activeTags.value.indexOf(tag)
  if (index > -1) {
    activeTags.value.splice(index, 1)
  } else {
    activeTags.value.push(tag)
  }
  filterHistory()
}

// 过滤历史记录
const filterHistory = () => {
  // 计算属性会自动更新
}

// 打开详情抽屉
const openDetail = (row) => {
  // 关键修复：深拷贝行数据，断开引用连接
  currentHistory.value = JSON.parse(JSON.stringify(row))
  drawerVisible.value = true // 打开抽屉
}

// 删除历史记录
const deleteHistory = async (item) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除历史记录 "${item.title}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await db.history.delete(item.id)
    await loadHistory()
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除历史记录失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 清空所有历史记录
const clearAllHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有历史记录吗？此操作不可恢复。',
      '清空确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'danger'
      }
    )
    
    await db.history.clear()
    await loadHistory()
    ElMessage.success('清空成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空历史记录失败:', error)
      ElMessage.error('清空失败')
    }
  }
}

// 添加标签
const addTag = () => {
  if (!newTag.value.trim()) return
  
  if (!currentHistory.value.tags) {
    currentHistory.value.tags = []
  }
  
  if (!currentHistory.value.tags.includes(newTag.value.trim())) {
    currentHistory.value.tags.push(newTag.value.trim())
    saveHistoryTags()
  }
  
  newTag.value = ''
}

// 移除标签
const removeTag = (tag) => {
  if (currentHistory.value.tags) {
    const index = currentHistory.value.tags.indexOf(tag)
    if (index > -1) {
      currentHistory.value.tags.splice(index, 1)
      saveHistoryTags()
    }
  }
}

// 保存标签
const saveHistoryTags = async () => {
  if (!currentHistory.value) return
  
  try {
    // 1. 准备纯净的标签数据
    const newTags = JSON.parse(JSON.stringify(currentHistory.value.tags))
    
    // 2. 更新数据库（明确指定 ID）
    await db.history.update(currentHistory.value.id, { tags: newTags })
    
    ElMessage.success('标签保存成功')
    
    // 3. 关键修复：保存后必须立即重新加载列表
    // 这会重新生成 historyList，触发 allTags 计算属性更新，从而刷新左侧标签栏
    await loadHistory()
    
    // 4. 可选：关闭抽屉或保持打开状态，视用户体验而定
    // drawerVisible.value = false
    
  } catch (error) {
    console.error('保存标签失败:', error)
    ElMessage.error('保存标签失败')
  }
}

// 跳转到提示词工坊
const goToPromptLab = () => {
  router.push('/prompt')
}
</script>

<style scoped>
.home {
  padding: 20px;
}

.home-container {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.filter-sidebar {
  width: 300px;
  height: calc(100vh - 120px);
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 20px;
  overflow-y: auto;
}

.filter-section {
  margin-bottom: 30px;
}

.filter-section h2 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: bold;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.history-list {
  flex: 1;
  min-width: 0;
}

.empty-state {
  height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h2 {
  margin: 0;
  font-size: 18px;
}

.history-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.history-item {
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-title {
  font-weight: bold;
  font-size: 16px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
}

.history-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
  font-size: 14px;
  color: #606266;
}

.history-time {
  flex-shrink: 0;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.history-preview {
  margin: 10px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-footer {
  margin-top: 15px;
  text-align: right;
}

.drawer-content {
  padding: 20px;
}

.drawer-header {
  margin-bottom: 30px;
}

.drawer-header h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
}

.drawer-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #606266;
}

.tags-section {
  margin-bottom: 30px;
}

.tags-section h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 600px;
  overflow-y: auto;
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
</style>