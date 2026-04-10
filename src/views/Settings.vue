<template>
  <div class="settings">
    <h1>设置中心</h1>
    
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>API 配置</span>
        </div>
      </template>
      
      <el-form :model="form" label-width="120px">
        <el-form-item label="API Key">
          <el-input
            v-model="form.apiKey"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="请输入 DeepSeek API Key"
            style="width: 400px"
          >
            <template #append>
              <el-button @click="showApiKey = !showApiKey">
                <el-icon v-if="showApiKey"><Hide /></el-icon>
                <el-icon v-else><View /></el-icon>
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="Base URL">
          <el-input
            v-model="form.baseUrl"
            placeholder="请输入 API 基础地址"
            style="width: 400px"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="loading">
            保存并测试
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据管理卡片 -->
    <el-card class="settings-card" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>数据管理</span>
        </div>
      </template>
      
      <div class="data-management">
        <el-button type="primary" @click="exportData" style="margin-right: 10px">
          导出数据包
        </el-button>
        <el-button @click="importData">
          导入数据包
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSettingsStore } from '../store'
import { View } from '@element-plus/icons-vue'
import db from '../db'

const settingsStore = useSettingsStore()
const showApiKey = ref(false)
const loading = ref(false)
const form = ref({
  apiKey: '',
  baseUrl: 'https://api.deepseek.com'
})

// 组件挂载时加载设置
onMounted(async () => {
  await settingsStore.loadSettings()
  form.value.apiKey = settingsStore.apiKey
  form.value.baseUrl = settingsStore.baseUrl
})

// 保存设置并测试
const saveSettings = async () => {
  loading.value = true
  
  try {
    // 更新 store 状态
    settingsStore.apiKey = form.value.apiKey
    settingsStore.baseUrl = form.value.baseUrl
    
    // 保存到数据库
    const saveSuccess = await settingsStore.saveSettings()
    if (!saveSuccess) {
      ElMessage.error('保存设置失败')
      return
    }
    
    // 测试连接
    await settingsStore.testConnection()
    ElMessage.success('配置成功，API 连接正常')
  } catch (error) {
    ElMessage.error(`配置失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 导出数据包
const exportData = async () => {
  try {
    // 导出所有数据
    const templates = await db.templates.toArray()
    const knowledge = await db.knowledge.toArray()
    const history = await db.history.toArray()
    
    // 构建导出数据结构
    const exportData = {
      version: '1.1',
      exportTime: new Date().toISOString(),
      data: {
        templates,
        knowledge,
        history
      }
    }
    
    // 创建下载链接
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `LocalAI-ToolBox-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 导入数据包
const importData = async () => {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      // 读取文件内容
      const text = await file.text()
      const importData = JSON.parse(text)
      
      // 验证数据格式
      if (!importData.data) {
        ElMessage.error('数据格式错误')
        return
      }
      
      // 确认导入
      await ElMessageBox.confirm(
        '导入将覆盖现有数据，确定继续？',
        '导入确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      // 清空现有数据
      await db.templates.clear()
      await db.knowledge.clear()
      await db.history.clear()
      
      // 导入数据
      if (importData.data.templates) {
        for (const template of importData.data.templates) {
          await db.templates.add(template)
        }
      }
      
      if (importData.data.knowledge) {
        for (const doc of importData.data.knowledge) {
          // 兼容 V1.0 数据，添加 mode 字段
          if (!doc.mode) {
            doc.mode = 'full'
          }
          await db.knowledge.add(doc)
        }
      }
      
      if (importData.data.history) {
        for (const history of importData.data.history) {
          await db.history.add(history)
        }
      }
      
      ElMessage.success('导入成功')
    }
    
    input.click()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('导入失败:', error)
      ElMessage.error('导入失败')
    }
  }
}
</script>

<style scoped>
.settings {
  padding: 20px;
}

.settings-card {
  max-width: 600px;
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>