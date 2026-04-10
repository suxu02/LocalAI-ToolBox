<template>
  <div class="dynamic-form">
    <el-card class="form-card">
      <template #header>
        <div class="card-header">
          <span>{{ template?.title || '请选择模板' }}</span>
        </div>
      </template>
      
      <el-form v-if="template && template.variables.length > 0" :model="formData" label-width="80px">
        <el-form-item
          v-for="(variable, index) in template.variables"
          :key="index"
          :label="variable"
          required
        >
          <el-input
            v-model="formData[variable]"
            :placeholder="`请输入${variable}`"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="创造性">
          <el-slider
            v-model="temperature"
            :min="0"
            :max="1"
            :step="0.1"
            show-input
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            @click="generate"
            :loading="loading"
            :disabled="!isFormValid"
          >
            生成
          </el-button>
          <el-button @click="resetForm" :disabled="loading">
            重置
          </el-button>
        </el-form-item>
      </el-form>
      
      <div v-else class="no-template">
        <el-empty description="请从左侧选择一个模板" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  template: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['generate'])

const loading = ref(false)
const temperature = ref(0.7)
const formData = ref({})

// 监听模板变化，重置表单
watch(() => props.template, (newVal) => {
  if (newVal) {
    // 重置表单数据
    const newFormData = {}
    newVal.variables.forEach(variable => {
      newFormData[variable] = ''
    })
    formData.value = newFormData
    
    // 重置温度值
    temperature.value = newVal.params?.temperature || 0.7
  }
}, { immediate: true })

// 表单验证
const isFormValid = computed(() => {
  if (!props.template || !props.template.variables) {
    return false
  }
  
  return props.template.variables.every(variable => {
    return formData.value[variable]?.trim()
  })
})

// 生成
const generate = () => {
  if (!isFormValid.value) {
    return
  }
  
  loading.value = true
  
  // 替换模板中的变量
  let prompt = props.template.content
  props.template.variables.forEach(variable => {
    prompt = prompt.replace(new RegExp(`\{\{\s*${variable}\s*\}\}`), formData.value[variable])
  })
  
  emit('generate', {
    prompt,
    temperature: temperature.value
  })
}

// 重置表单
const resetForm = () => {
  if (props.template) {
    const newFormData = {}
    props.template.variables.forEach(variable => {
      newFormData[variable] = ''
    })
    formData.value = newFormData
  }
}
</script>

<style scoped>
.dynamic-form {
  margin-bottom: 20px;
}

.form-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.no-template {
  padding: 40px 0;
  text-align: center;
}
</style>