import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import { useAppStore, useUserStore } from './stores';
import App from './App.vue';

// 导入全局样式
import './style.css';

// 创建应用实例
const app = createApp(App);

// 安装插件
app.use(createPinia());
app.use(router);

// 初始化应用状态
const appStore = useAppStore();
const userStore = useUserStore();

// 恢复用户状态和应用设置
userStore.restoreFromStorage();
appStore.initializeApp();

// 挂载应用
app.mount('#app');

console.log('🚀 哈尔滨学院校园服务平台启动成功!');
