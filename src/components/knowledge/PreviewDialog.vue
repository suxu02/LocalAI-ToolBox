<template>
  <el-dialog
    v-model="dialogVisible"
    title="文档预览与编辑"
    width="800px"
    :close-on-click-modal="false"
  >
    <div class="preview-dialog">
      <el-form :model="form" label-width="80px">
        <el-form-item label="文档名称">
          <el-input v-model="form.title" placeholder="请输入文档名称" />
        </el-form-item>
        
        <el-form-item label="文档内容">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="20"
            placeholder="解析后的文档内容"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
    </div>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport">确认入库</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus' // 修复点：引入 ElMessage

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  document: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

const dialogVisible = ref(props.visible)
const form = ref({
  title: '',
  content: ''
})

watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal
})

watch(dialogVisible, (newVal) => {
  emit('update:visible', newVal)
})

watch(() => props.document, (newVal) => {
  if (newVal) {
    form.value = {
      title: newVal.title || '',
      content: newVal.content || ''
    }
  }
}, { deep: true, immediate: true })

const confirmImport = () => {
  if (!form.value.title) {
    ElMessage.error('文档名称不能为空')
    return
  }
  
  if (!form.value.content) {
    ElMessage.error('文档内容不能为空')
    return
  }
  
  emit('confirm', { ...form.value })
  dialogVisible.value = false
}
</script>

<style scoped>
.preview-dialog {
  max-height: 600px;
  overflow-y: auto;
}
</style>