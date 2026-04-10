import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus' // 必须有这行
import 'element-plus/dist/index.css'   // 必须有这行
import * as ElementPlusIconsVue from '@element-plus/icons-vue' // 引入所有图标

const app = createApp(App)
const pinia = createPinia()

// 遍历注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus) // 必须有这行
app.mount('#app')