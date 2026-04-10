<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Layout from './components/Layout.vue'
import WelcomeModal from './components/WelcomeModal.vue'
import { useSettingsStore } from './store/modules/settings'
import db from './db'

const settingsStore = useSettingsStore()
const router = useRouter()
const showWelcome = ref(false)

// 检查是否需要显示欢迎弹窗
const checkWelcome = async () => {
  try {
    // 检查设置表是否为空，或者 API Key 是否为空
    const settingsCount = await db.settings.count()
    if (settingsCount === 0 || !settingsStore.apiKey) {
      showWelcome.value = true
    }
  } catch (error) {
    console.error('检查欢迎状态失败:', error)
  }
}

// 初始化默认数据
const initDefaultData = async () => {
  try {
    // 检查模板表是否为空
    const templateCount = await db.templates.count()
    if (templateCount === 0) {
      // 写入预置模板
      await db.templates.add({
        title: '公文生成器',
        content: '你是一个专业的行政助理。请根据以下信息，撰写一份正式的公文通知。\n要求：\n1. 语气严谨、规范。\n2. 格式标准，包含标题、正文、落款日期。\n3. 核心信息如下：\n   - 通知主题：{{通知主题}}\n   - 发布单位：{{发布单位}}\n   - 核心内容：{{核心内容}}',
        variables: ['通知主题', '发布单位', '核心内容'],
        params: { temperature: 0.3 },
        category: '行政公文',
        createdAt: Date.now()
      })
      console.log('✅ 预置模板注入成功')
    }

    // 检查知识库表是否为空
    const knowledgeCount = await db.knowledge.count()
    if (knowledgeCount === 0) {
      // 写入预置文档
      await db.knowledge.add({
        title: 'LocalAI-ToolBox 快速上手指南.md',
        content: '# LocalAI-ToolBox 快速上手指南\n\n欢迎使用 LocalAI-ToolBox！这是一个本地运行的 AI 个人效率工具箱，帮你提升工作效率。\n\n## 快速上手三步\n\n### 1. 配置 API Key\n- 点击左侧导航栏的「设置」\n- 输入 DeepSeek API Key\n- 点击「保存并测试」验证连接\n\n### 2. 使用提示词工坊\n- 点击左侧导航栏的「提示词工坊」\n- 选择「公文生成器」模板\n- 填写模板变量，点击「生成」\n\n### 3. 上传知识库文档\n- 点击左侧导航栏的「本地知识库」\n- 上传 PDF 或 Word 文档\n- 解析完成后，即可基于文档内容提问\n\n## 注意事项\n- 数据仅存储在本地浏览器中\n- 定期使用「设置」页面的「导出数据包」功能备份数据\n- 支持的文档格式：PDF（文字版）、Word（.docx）',
        wordCount: 200,
        mode: 'full',
        createdAt: Date.now()
      })
      console.log('✅ 预置文档注入成功')
    }
  } catch (error) {
    console.error('❌ 预置数据注入失败:', error)
  }
}

// 处理开始按钮点击
const handleStart = async () => {
  // 关闭弹窗
  showWelcome.value = false
  
  // 跳转到提示词工坊
  router.push('/prompt')
}

// 应用挂载时加载设置和初始化默认数据
onMounted(async () => {
  await settingsStore.loadSettings()
  await initDefaultData()
  await checkWelcome()
})
</script>

<template>
  <Layout />
  <WelcomeModal
    v-model:visible="showWelcome"
    @start="handleStart"
  />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #303133;
  background-color: #ffffff;
}
</style>
