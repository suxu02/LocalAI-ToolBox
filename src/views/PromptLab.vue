<template>
  <div class="prompt-lab">
    <h1>提示词工坊</h1>
    
    <div class="prompt-lab-container">
      <!-- 左侧模板列表 -->
      <div class="template-list">
        <div class="list-header">
          <h2>模板列表</h2>
          <el-button type="primary" size="small" @click="openCreateDialog">
            新建模板
          </el-button>
        </div>
        
        <el-empty v-if="templates.length === 0" description="暂无模板" />
        
        <el-tree
          v-else
          :data="templates"
          node-key="id"
          default-expand-all
          @node-click="selectTemplate"
        >
          <template #default="{ node, data }">
            <div class="template-item">
              <span>{{ data.title }}</span>
              <div class="template-actions">
                <el-button
                  type="text"
                  size="small"
                  @click.stop="editTemplate(data)"
                >
                  编辑
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  @click.stop="deleteTemplate(data)"
                  style="color: #f56c6c"
                >
                  删除
                </el-button>
              </div>
            </div>
          </template>
        </el-tree>
      </div>
      
      <!-- 右侧内容区 -->
      <div class="template-content">
        <!-- 动态表单 -->
        <DynamicForm
          :template="selectedTemplate"
          @generate="handleGenerate"
        />
        
        <!-- 聊天框 -->
        <ChatBox
          :messages="messages"
          :loading="loading"
          @stop="stopGeneration"
        />
      </div>
    </div>
    
    <!-- 新建/编辑模板弹窗 -->
    <TemplateForm
      v-model:visible="dialogVisible"
      :template="currentTemplate"
      :is-edit="isEdit"
      @save="saveTemplate"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import db from '../db'
import { useAI } from '../composables/useAI'
import TemplateForm from '../components/prompt/TemplateForm.vue'
import DynamicForm from '../components/prompt/DynamicForm.vue'
import ChatBox from '../components/common/ChatBox.vue'

const route = useRoute()
const { sendMessage, abort } = useAI()

const templates = ref([])
const selectedTemplate = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentTemplate = ref({})
const loading = ref(false)
const messages = ref([])

// 加载模板列表
const loadTemplates = async () => {
  try {
    const templateList = await db.templates.toArray()
    templates.value = templateList.map(template => ({
      ...template,
      label: template.title,
      children: []
    }))
    
    // 检查是否需要自动选中模板
    checkAutoSelectTemplate()
  } catch (error) {
    console.error('加载模板失败:', error)
    ElMessage.error('加载模板失败')
  }
}

// 检查是否需要自动选中模板
const checkAutoSelectTemplate = () => {
  // 查找公文生成器模板
  const officialTemplate = templates.value.find(template => template.title === '公文生成器')
  if (officialTemplate) {
    selectedTemplate.value = officialTemplate
  }
}

// 组件挂载时加载模板
onMounted(() => {
  loadTemplates()
})

// 打开新建模板弹窗
const openCreateDialog = () => {
  isEdit.value = false
  currentTemplate.value = {
    title: '',
    content: '',
    params: {
      temperature: 0.7
    }
  }
  dialogVisible.value = true
}

// 编辑模板
const editTemplate = (template) => {
  isEdit.value = true
  currentTemplate.value = { ...template }
  dialogVisible.value = true
}

// 删除模板
const deleteTemplate = async (template) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板 "${template.title}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await db.templates.delete(template.id)
    await loadTemplates()
    
    if (selectedTemplate.value?.id === template.id) {
      selectedTemplate.value = null
      messages.value = []
    }
    
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除模板失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 保存模板
const saveTemplate = async (templateData) => {
  try {
    // --- 关键修复：净化数据，剥离 Vue Proxy ---
    const cleanData = JSON.parse(JSON.stringify(templateData))
    
    if (isEdit.value) {
      // 更新模板
      await db.templates.put({
        ...cleanData,
        updatedAt: Date.now()
      })
      ElMessage.success('更新成功')
    } else {
      // 新建模板
      await db.templates.add({
        ...cleanData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      ElMessage.success('创建成功')
    }
    
    await loadTemplates()
  } catch (error) {
    console.error('保存模板失败:', error)
    ElMessage.error('保存失败')
  }
}

// 选择模板
const selectTemplate = (template) => {
  selectedTemplate.value = template
  messages.value = []
}

// 处理生成
const handleGenerate = async ({ prompt, temperature }) => {
  loading.value = true
  messages.value = [
    {
      role: 'user',
      content: prompt
    }
  ]
  
  try {
    let assistantMessage = {
      role: 'assistant',
      content: ''
    }
    
    await sendMessage([
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature,
      onChunk: (chunk, accumulated) => {
        assistantMessage.content = accumulated
        messages.value = [
          messages.value[0],
          assistantMessage
        ]
      },
      onComplete: async () => {
        loading.value = false
        
        // --- 强制保存逻辑开始 ---
        try {
          // 1. 生成标题 (取用户填写的第一个变量值，或者取用户消息的前10个字)
          // 注意：messages.value[0] 是用户发送的完整 Prompt
          const firstUserMsg = messages.value.find(m => m.role === 'user')
          const title = firstUserMsg ? firstUserMsg.content.substring(0, 10) : '新对话'
          
          // 2. 准备数据 (深拷贝，剥离 Proxy，防止 DataCloneError)
          const historyData = {
            title: title,
            type: 'prompt', // 类型标记为工坊
            messages: JSON.parse(JSON.stringify(messages.value)),
            createdAt: Date.now()
          }
          
          // 3. 写入数据库
          await db.history.add(historyData)
          
          console.log('✅ 工坊历史记录保存成功！', historyData)
        } catch (error) {
          console.error('❌ 保存工坊历史失败:', error)
        }
        // --- 强制保存逻辑结束 ---
      },
      onError: (error) => {
        loading.value = false
        ElMessage.error(`生成失败: ${error.message}`)
      }
    })
  } catch (error) {
    loading.value = false
    ElMessage.error(`生成失败: ${error.message}`)
  }
}

// 保存历史记录
const saveHistory = async () => {
  if (messages.value.length < 2) return
  
  try {
    const title = messages.value[0].content.substring(0, 10) + (messages.value[0].content.length > 10 ? '...' : '')
    
    await db.history.add({
      title,
      type: 'prompt',
      messages: messages.value,
      relatedId: null,
      createdAt: Date.now()
    })
    
    console.log('历史记录保存成功')
  } catch (error) {
    console.error('保存历史记录失败:', error)
  }
}

// 停止生成
const stopGeneration = () => {
  abort()
  loading.value = false
}
</script>

<style scoped>
.prompt-lab {
  padding: 20px;
}

.prompt-lab-container {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.template-list {
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
}

.list-header h2 {
  margin: 0;
  font-size: 16px;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  cursor: pointer;
}

.template-item:hover {
  background-color: #f5f7fa;
}

.template-actions {
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.template-item:hover .template-actions {
  opacity: 1;
}

.template-content {
  flex: 1;
  min-width: 0;
}
</style>