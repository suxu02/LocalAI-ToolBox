<template>
  <div class="layout-container">
    <!-- 左侧 Sidebar -->
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <h2>LocalAI-ToolBox</h2>
      </div>
      <el-menu
        :default-active="activeRoute"
        class="sidebar-menu"
        router
      >
        <el-menu-item index="/home">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/prompt">
          <el-icon><EditPen /></el-icon>
          <span>工坊</span>
        </el-menu-item>
        <el-menu-item index="/knowledge">
          <el-icon><Document /></el-icon>
          <span>知识库</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-tooltip
            v-if="showSettingsBadge"
            content="点我配置 API Key 开始使用"
            placement="right"
            effect="light"
          >
            <div class="menu-item-with-badge">
              <el-icon><Setting /></el-icon>
              <span>设置</span>
              <span class="badge-dot" v-if="showSettingsBadge"></span>
            </div>
          </el-tooltip>
          <div v-else class="menu-item-with-badge">
            <el-icon><Setting /></el-icon>
            <span>设置</span>
          </div>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <!-- 中间 Main 内容区 -->
    <el-main class="main-content">
      <router-view />
    </el-main>
    
    <!-- 右侧 DetailPanel (默认隐藏) -->
    <el-aside width="300px" class="detail-panel" v-if="showDetail">
      <div class="detail-header">
        <h3>{{ detailTitle }}</h3>
        <el-button type="text" @click="closeDetail">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div class="detail-content">
        {{ detailContent }}
      </div>
    </el-aside>
  </div>
</template>

<script setup>
import { ref, computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import { HomeFilled, EditPen, Document, Setting, Close } from '@element-plus/icons-vue'
import { useSettingsStore } from '../store/modules/settings'

const route = useRoute()
const settingsStore = useSettingsStore()
const showDetail = ref(false)
const detailTitle = ref('详情')
const detailContent = ref('')

// 计算当前激活的路由
const activeRoute = computed(() => {
  return route.path
})

// 计算是否需要显示设置红点
const showSettingsBadge = computed(() => {
  return !settingsStore.apiKey
})

// 打开详情面板
const openDetail = (title, content) => {
  detailTitle.value = title
  detailContent.value = content
  showDetail.value = true
}

// 关闭详情面板
const closeDetail = () => {
  showDetail.value = false
}

// 提供给子组件使用
provide('detailPanel', {
  showDetail,
  detailTitle,
  detailContent,
  openDetail,
  closeDetail
})
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.logo {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.logo h2 {
  margin: 0;
  font-size: 18px;
  color: #409eff;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  
  .menu-item-with-badge {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }
  
  .badge-dot {
    position: absolute;
    top: 0;
    right: 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #F56C6C;
  }
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #ffffff;
}

.detail-panel {
  background-color: #f5f7fa;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.detail-header {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-header h3 {
  margin: 0;
  font-size: 16px;
}

.detail-content {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.6;
}
</style>