import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './styles/global.css'

// Element Plus 相关导入
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 创建应用实例
const app = createApp(App)

// 创建Pinia实例
const pinia = createPinia()

// 注册 Element Plus
app.use(ElementPlus, {
  locale: zhCn,
})

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)

// 应用挂载
app.mount('#app')
