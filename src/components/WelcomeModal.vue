<template>
  <el-dialog
    v-model="dialogVisible"
    title=""
    :width="'480px'"
    :close-on-click-modal="false"
    :show-close="false"
    class="welcome-modal"
  >
    <div class="welcome-content">
      <!-- Logo -->
      <div class="logo">
        <el-icon class="logo-icon"><ChatLineSquare /></el-icon>
      </div>
      
      <!-- 标题 -->
      <h2 class="welcome-title">欢迎使用 LocalAI-ToolBox</h2>
      
      <!-- 步骤指引 -->
      <div class="steps">
        <div class="step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <div class="step-title">配置 API Key</div>
            <div class="step-desc">在设置页面输入 DeepSeek API Key</div>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <div class="step-title">选择模板</div>
            <div class="step-desc">从提示词工坊中选择合适的模板</div>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <div class="step-title">开始生成</div>
            <div class="step-desc">填写变量，点击生成按钮</div>
          </div>
        </div>
      </div>
      
      <!-- 按钮 -->
      <div class="action">
        <el-button type="primary" size="large" @click="handleStart" style="width: 200px">
          立即开始
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, defineProps, defineEmits } from 'vue'
import { ChatLineSquare } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'start'])

// 新增计算属性，作为 v-model 的绑定对象
const dialogVisible = computed({
  get() {
    return props.visible
  },
  set(val) {
    emit('update:visible', val)
  }
})

const handleStart = () => {
  emit('update:visible', false)
  emit('start')
}
</script>

<style scoped>
.welcome-modal {
  .el-dialog__header {
    padding: 0;
    border-bottom: none;
  }
  
  .el-dialog__body {
    padding: 40px 20px;
  }
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.logo {
  margin-bottom: 24px;
  
  .logo-icon {
    font-size: 80px;
    color: #409EFF;
  }
}

.welcome-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 32px;
  color: #303133;
}

.steps {
  width: 100%;
  margin-bottom: 40px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #ECF5FF;
  color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 16px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  text-align: left;
}

.step-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: #303133;
}

.step-desc {
  font-size: 14px;
  color: #606266;
}

.action {
  margin-top: 16px;
}
</style>