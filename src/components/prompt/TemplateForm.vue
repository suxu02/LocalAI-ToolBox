<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑模板' : '新建模板'"
    width="600px"
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="模板标题" required>
        <el-input v-model="form.title" placeholder="请输入模板标题" />
      </el-form-item>
      
      <el-form-item label="模板内容" required>
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="8"
          placeholder="请输入模板内容，支持 {{变量名}} 格式"
        />
      </el-form-item>
      
      <el-form-item label="变量预览">
        <div class="variables-preview">
          <el-tag v-for="(variable, index) in variables" :key="index" size="small">
            {{ variable }}
          </el-tag>
          <span v-if="variables.length === 0" class="no-variables">
            未检测到变量
          </span>
        </div>
      </el-form-item>
      
      <el-form-item label="创造性">
        <el-slider
          v-model="form.params.temperature"
          :min="0"
          :max="1"
          :step="0.1"
          show-input
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  template: {
    type: Object,
    default: () => ({})
  },
  isEdit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'save'])

const dialogVisible = ref(props.visible)
const form = ref({
  id: '',
  title: '',
  content: '',
  params: {
    temperature: 0.7
  }
})

// 监听 visible 属性变化
watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal
})

// 监听 dialogVisible 变化，通知父组件
watch(dialogVisible, (newVal) => {
  emit('update:visible', newVal)
})

// 监听 template 属性变化，更新表单
watch(() => props.template, (newVal) => {
  if (newVal) {
    form.value = {
      id: newVal.id || '',
      title: newVal.title || '',
      content: newVal.content || '',
      params: {
        temperature: newVal.params?.temperature || 0.7
      }
    }
  }
}, { deep: true, immediate: true })

// 解析变量
const variables = computed(() => {
  const content = form.value.content
  if (!content) return []
  
  const regex = /\{\{([^}]+)\}\}/g
  const matches = []
  let match
  
  while ((match = regex.exec(content)) !== null) {
    const variable = match[1].trim()
    if (variable && !matches.includes(variable)) {
      matches.push(variable)
    }
  }
  
  return matches
})

// 保存模板
const saveTemplate = () => {
  if (!form.value.title) {
    ElMessage.error('模板标题不能为空')
    return
  }
  
  if (!form.value.content) {
    ElMessage.error('模板内容不能为空')
    return
  }
  
  const templateData = {
    ...form.value,
    variables: variables.value
  }
  
  emit('save', templateData)
  dialogVisible.value = false
}
</script>

<style scoped>
.variables-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  min-height: 32px;
  align-items: center;
}

.no-variables {
  color: #909399;
  font-size: 12px;
}

.dialog-footer {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>