import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Vant 样式
import 'vant/lib/index.css'

// 创建应用实例
const app = createApp(App)

// 创建Pinia实例
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 初始化用户状态
import { useUserStore } from '@/stores/user'

// 应用挂载后初始化用户状态
app.mount('#app')

// 初始化用户认证状态
const userStore = useUserStore()
userStore.initializeUser()
