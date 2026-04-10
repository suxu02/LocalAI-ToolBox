<template>
  <div class="knowledge">
    <h1>本地知识库</h1>
    
    <div class="knowledge-container">
      <!-- 左侧文档列表 -->
      <div class="document-list">
        <div class="list-header">
          <h2>已上传文档</h2>
          <el-upload
            class="upload-btn"
            :show-file-list="false"
            :auto-upload="false"
            :on-change="handleFileChange"
            accept=".pdf,.docx"
            drag
          >
            <el-icon class="el-icon--upload"><Plus /></el-icon>
            <div class="el-upload__text">拖拽文件到此处，或 <em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">
                仅支持 PDF 和 Word 文档
              </div>
            </template>
          </el-upload>
        </div>
        
        <el-empty v-if="documents.length === 0" description="暂无文档" />
        
        <el-tree
          v-else
          :data="documents"
          node-key="id"
          default-expand-all
          @node-click="selectDocument"
          :highlight-current="true"
        >
          <template #default="{ node, data }">
            <div class="document-item">
              <div class="document-info">
                <div class="document-title">
                  <span>{{ data.title }}</span>
                  <el-tag
                    size="small"
                    :type="data.mode === 'chunk' ? 'primary' : 'info'"
                    style="margin-left: 8px"
                  >
                    {{ data.mode === 'chunk' ? '智能模式' : '全文模式' }}
                  </el-tag>
                </div>
                <div class="document-meta">
                  {{ data.wordCount || data.content?.length || 0 }} 字
                </div>
              </div>
              <div class="document-actions">
                <el-button
                  type="text"
                  size="small"
                  @click.stop="deleteDocument(data)"
                  style="color: #f56c6c"
                >
                  删除
                </el-button>
              </div>
            </div>
          </template>
        </el-tree>
      </div>
      
      <!-- 右侧对话区 -->
      <div class="chat-area">
        <el-card class="chat-card">
          <template #header>
            <div class="card-header">
              <span>知识问答</span>
              <span v-if="selectedDocument" class="selected-document">
                当前文档：{{ selectedDocument.title }}
              </span>
            </div>
          </template>
          
          <div class="chat-content">
            <div v-if="messages.length === 0" class="empty-chat">
              <el-empty description="选择文档后开始提问" />
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
          </div>
          
          <div class="chat-input">
            <el-input
              v-model="query"
              type="textarea"
              :rows="3"
              placeholder="输入问题..."
              :disabled="!selectedDocument || loading"
            />
            <div class="input-actions">
              <el-button
                type="primary"
                @click="sendQuery"
                :loading="loading"
                :disabled="!selectedDocument || !query.trim() || loading"
              >
                发送
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 预览编辑弹窗 -->
    <PreviewDialog
      v-model:visible="previewVisible"
      :document="previewDocument"
      @confirm="importDocument"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { marked } from 'marked'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
import db from '../db'
import { useAI } from '../composables/useAI'
import { useBM25 } from '../composables/useBM25'
import { splitTextIntoChunks } from '../utils/chunkUtils'
import PreviewDialog from '../components/knowledge/PreviewDialog.vue'

const { sendMessage, abort } = useAI()
const { openDetail } = inject('detailPanel')

const documents = ref([])
const selectedDocument = ref(null)
const previewVisible = ref(false)
const previewDocument = ref({})
const loading = ref(false)
const messages = ref([])
const query = ref('')

// 加载文档列表
const loadDocuments = async () => {
  try {
    const docList = await db.knowledge.toArray()
    documents.value = docList.map(doc => ({
      ...doc,
      label: doc.title,
      children: []
    }))
  } catch (error) {
    console.error('加载文档失败:', error)
    ElMessage.error('加载文档失败')
  }
}

// 组件挂载时加载文档
onMounted(() => {
  loadDocuments()
})

// 处理文件上传
const handleFileChange = async (file) => {
  const fileName = file.name
  const extension = fileName.split('.').pop().toLowerCase()

  // 简单校验
  if (!['pdf', 'docx'].includes(extension)) {
    ElMessage.error('仅支持 PDF 和 DOCX 格式')
    return
  }

  try {
    let text = ''
    
    if (extension === 'pdf') {
      // --- 解析 PDF ---
      // 注意：这里直接使用顶部已配置好的 pdfjsLib，不要再动态 import
      const reader = new FileReader()
      reader.readAsArrayBuffer(file.raw)
      
      await new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result
            // 使用顶部导入的 pdfjsLib
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
            const pdf = await loadingTask.promise
            
            let content = ''
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              content += textContent.items.map(item => item.str).join(' ') + '\n'
            }
            
            text = content
            resolve()
          } catch (error) {
            console.error('PDF解析错误:', error)
            reject(error)
          }
        }
        reader.onerror = reject
      })
    } else if (extension === 'docx') {
      // --- 解析 Word ---
      const mammoth = await import('mammoth')
      
      // 关键修复：将文件对象转换为 ArrayBuffer
      const arrayBuffer = await file.raw.arrayBuffer()
      
      // 传入 arrayBuffer 进行解析
      const result = await mammoth.extractRawText({ arrayBuffer })
      text = result.value
    }

    // 校验解析结果
    if (!text || !text.trim()) {
      ElMessage.warning('文档内容为空，可能是扫描版或图片文档')
      return
    }

    // 添加调试日志
    console.log(`文档解析完成 - 字数: ${text.length}, 判定模式: ${text.length > 5000 ? '智能模式' : '全文模式'}`)

    // 模式自动识别
    let mode = 'full'
    let chunks = null
    
    if (text.length > 5000) {
      // 文档较长，启用智能分块
      mode = 'chunk'
      chunks = splitTextIntoChunks(text)
      ElMessage.info('文档较长，已自动启用智能分块检索')
    }

    // 打开预览弹窗
    previewDocument.value = {
      title: fileName,
      content: text,
      mode: mode,
      chunks: chunks
    }
    previewVisible.value = true

  } catch (error) {
    console.error('解析过程崩溃:', error)
    ElMessage.error(`解析失败: ${error.message}`)
  }
}

// 确认入库
const importDocument = async (documentData) => {
  try {
    // 1. 深拷贝，剥离 Vue Proxy
    const cleanData = JSON.parse(JSON.stringify(documentData))
    
    // 2. 组装最终数据
    const finalData = {
      title: cleanData.title,
      content: cleanData.content,
      mode: cleanData.mode || 'full',
      chunks: cleanData.chunks || null, // 确保是纯净对象
      wordCount: cleanData.content.length,
      createdAt: Date.now()
    }
    
    await db.knowledge.add(finalData)
    
    await loadDocuments()
    ElMessage.success('文档入库成功')
  } catch (error) {
    console.error('入库失败:', error)
    ElMessage.error('入库失败')
  }
}

// 选择文档
const selectDocument = (document) => {
  selectedDocument.value = document
  messages.value = []
}

// 删除文档
const deleteDocument = async (document) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文档 "${document.title}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await db.knowledge.delete(document.id)
    await loadDocuments()
    
    if (selectedDocument.value?.id === document.id) {
      selectedDocument.value = null
      messages.value = []
    }
    
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除文档失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 发送查询
const sendQuery = async () => {
  if (!selectedDocument || !query.value.trim()) {
    return
  }

  const userQuery = query.value.trim()
  const documentContent = selectedDocument.value.content
  const documentMode = selectedDocument.value.mode || 'full'
  const documentChunks = selectedDocument.value.chunks
  
  loading.value = true
  
  // 1. 先添加用户消息
  messages.value.push({
    role: 'user',
    content: userQuery
  })
  
  // 2. 准备 AI 消息占位
  let assistantMessage = {
    role: 'assistant',
    content: ''
  }
  messages.value.push(assistantMessage) // 先推入一个空的，方便后续更新

  query.value = '' // 清空输入框

  try {
    let prompt
    
    if (documentMode === 'chunk' && documentChunks) {
      // 智能分块模式：使用 BM25 算法检索
      const { search } = useBM25()
      
      // 调用 BM25 搜索
      const relevantChunks = search(userQuery, documentChunks)
      
      // --- 新增日志 ---
      console.log('--- BM25 检索结果 ---')
      console.log('用户问题:', userQuery)
      console.log('检索到的分块数量:', relevantChunks.length)
      console.log('相关片段预览:', relevantChunks.map(c => c.text.substring(0, 50) + '...'))
      // ------------------
      
      // 如果 BM25 没找到相关内容，降级提示
      if (!relevantChunks || relevantChunks.length === 0) {
        messages.value[messages.value.length - 1].content = "抱歉，我在文档中没有找到与您问题相关的内容。"
        loading.value = false
        return
      }
      
      // 拼接相关分块内容
      const relevantContent = relevantChunks.map(chunk => chunk.text).join('\n\n')
      
      prompt = `你是一个专业的文档分析助手。请仔细阅读以下【文档内容】，并回答用户的问题。
要求：回答要准确、条理清晰。如果文档中没有相关信息，请明确告知。

【文档内容】：
${relevantContent}

【用户问题】：
${userQuery}`
    } else {
      // 全文模式
      // 长度校验
      if (documentContent.length > 20000) {
        try {
          await ElMessageBox.confirm(
            '文档过长，可能消耗较多 Token，是否继续？',
            '长度警告',
            {
              confirmButtonText: '继续',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
        } catch (error) {
          if (error !== 'cancel') {
            console.error('确认失败:', error)
          }
          loading.value = false
          messages.value.pop() // 移除占位消息
          messages.value.pop() // 移除用户消息
          return
        }
      }
      
      prompt = `你是一个专业的文档分析助手。请仔细阅读以下【文档内容】，并回答用户的问题。
要求：回答要准确、条理清晰。如果文档中没有相关信息，请明确告知。

【文档内容】：
${documentContent}

【用户问题】：
${userQuery}`
    }

    await sendMessage([{ role: 'user', content: prompt }], {
      temperature: 0.7,
      onChunk: (chunk, accumulated) => {
        // 3. 实时更新最后一条消息
        messages.value[messages.value.length - 1].content = accumulated
      },
      onComplete: async (content) => {
        loading.value = false
        
        // --- 强制保存逻辑开始 ---
        try {
          // 1. 生成标题 (取用户提问的前10个字)
          const title = userQuery.substring(0, 10)
          
          // 2. 准备数据
          const historyData = {
            title: title,
            type: 'knowledge',
            messages: JSON.parse(JSON.stringify(messages.value)), // 深拷贝防止引用问题
            relatedId: selectedDocument.value.id, // 关联当前文档
            createdAt: Date.now()
          }
          
          // 3. 写入数据库
          await db.history.add(historyData)
          
          console.log('✅ 历史记录保存成功！', historyData)
        } catch (error) {
          console.error('❌ 保存历史记录失败:', error)
        }
        // --- 强制保存逻辑结束 ---
      },
      onError: (error) => {
        messages.value[messages.value.length - 1].content = `生成失败: ${error.message}`
        loading.value = false
      }
    })
  } catch (error) {
    messages.value[messages.value.length - 1].content = `发生错误: ${error.message}`
    loading.value = false
  }
}

// 保存历史记录
const saveHistory = async () => {
  if (messages.value.length < 2) return
  
  try {
    const title = messages.value[0].content.substring(0, 10) + (messages.value[0].content.length > 10 ? '...' : '')
    
    await db.history.add({
      title,
      type: 'knowledge',
      messages: messages.value,
      relatedId: selectedDocument.value.id,
      createdAt: Date.now()
    })
    
    console.log('历史记录保存成功')
  } catch (error) {
    console.error('保存历史记录失败:', error)
  }
}

// 渲染 Markdown
const renderMarkdown = (text) => {
  if (!text) return ''
  return marked.parse(text)
}
</script>

<style scoped>
.knowledge {
  padding: 20px;
}

.knowledge-container {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.document-list {
  width: 300px;
  height: calc(100vh - 120px);
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f7fa;
  flex-shrink: 0;
}

.list-header h2 {
  margin: 0;
  font-size: 16px;
}

.upload-btn {
  flex-shrink: 0;
}

.document-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 10px;
  cursor: pointer;
  margin-bottom: 4px;
}

.document-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.document-title {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.document-title span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-meta {
  font-size: 12px;
  color: #909399;
}

.document-item:hover {
  background-color: #f5f7fa;
}

.document-actions {
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.document-item:hover .document-actions {
  opacity: 1;
}

.chat-area {
  flex: 1;
  min-width: 0;
}

.chat-card {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-document {
  font-size: 14px;
  color: #606266;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  margin-bottom: 20px;
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

.chat-input {
  flex-shrink: 0;
  margin-top: auto;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
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