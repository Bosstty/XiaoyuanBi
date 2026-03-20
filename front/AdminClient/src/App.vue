<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()

// 全局禁用右键菜单
const disableContextMenu = (e) => {
  e.preventDefault()
}

onMounted(() => {
  document.addEventListener('contextmenu', disableContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('contextmenu', disableContextMenu)
})
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

/* CSS Variables - Design System */
:root {
  /* Primary Colors */
  --primary: #6366f1;
  --primary-light: #818cf8;
  --primary-dark: #4f46e5;
  --primary-soft: #a5b4fc;
  --primary-bg: rgba(99, 102, 241, 0.1);

  /* Element Plus Theme */
  --el-color-primary: #6366f1;
  --el-color-primary-light-3: #818cf8;
  --el-color-primary-light-5: #a5b4fc;
  --el-color-primary-light-7: #c7d2fe;
  --el-color-primary-light-8: #e0e7ff;
  --el-color-primary-light-9: #eef2ff;
  --el-color-primary-dark-2: #4f46e5;

  /* Secondary Colors */
  --secondary: #8b5cf6;
  --secondary-light: #a78bfa;

  /* Accent Colors */
  --accent: #f59e0b;
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-danger: #ef4444;
  --accent-info: #818cf8;

  /* Background Colors */
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-card: #ffffff;
  --bg-sidebar: #0f172a;

  /* Text Colors */
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --text-inverse: #ffffff;

  /* Border Colors */
  --border-color: #e2e8f0;
  --border-light: #f1f5f9;

  /* Sidebar */
  --sidebar-bg: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);

  /* Shadows */
  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: none;
  --shadow-xl: none;
  --shadow-card: none;

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;

  /* Z-Index */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    'Fira Sans',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Element Plus 组件样式覆盖 */
.el-button--primary {
  --el-button-bg-color: var(--primary);
  --el-button-border-color: var(--primary);
  --el-button-hover-bg-color: var(--primary-dark);
  --el-button-hover-border-color: var(--primary-dark);
  --el-button-active-bg-color: var(--primary-dark);
  --el-button-active-border-color: var(--primary-dark);
}

.el-menu--collapse {
  width: 64px;
}

.el-menu--collapse .el-menu-item,
.el-menu--collapse .el-sub-menu__title {
  justify-content: center;
}

/* 卡片样式 */
.el-card {
  --el-card-border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: none;
}

/* 输入框样式 */
.el-input__wrapper {
  border-radius: var(--radius-md);
  box-shadow: none;
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);
}

.el-input__wrapper:hover {
  border-color: var(--primary-light);
}

.el-input__wrapper.is-focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

/* 表格样式 */
.el-table {
  --el-table-border-color: var(--border-light);
  --el-table-header-bg-color: var(--bg-secondary);
}

.el-table th.el-table__cell {
  font-weight: 600;
  color: var(--text-primary);
}

.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell {
  background: var(--bg-secondary);
}

/* 分页样式 */
.el-pagination {
  --el-pagination-button-bg-color: var(--bg-secondary);
  --el-pagination-hover-color: var(--primary);
}

/* 标签样式 */
.el-tag {
  border-radius: var(--radius-full);
  font-weight: 500;
}

/* 面包屑样式 */
.el-breadcrumb__inner {
  color: var(--text-secondary);
  font-weight: 400;
}

.el-breadcrumb__inner.is-link:hover {
  color: var(--primary);
}

.el-breadcrumb__separator {
  color: var(--text-tertiary);
}

/* 下拉菜单样式 */
.el-dropdown-menu {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  padding: 6px;
}

.el-dropdown-menu__item {
  border-radius: var(--radius-md);
  padding: 8px 12px;
}

.el-dropdown-menu__item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 分割线样式 */
.el-divider--vertical {
  border-color: var(--border-color);
  height: 24px;
  margin: 0 8px;
}

/* 徽章样式 */
.el-badge__content {
  border: none;
}

/* 全局按钮样式 */
.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-fast);
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: white;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-fast);
  font-size: 0.9rem;
}

.btn-secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-danger {
  background: linear-gradient(135deg, var(--accent-danger) 0%, #dc2626 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-fast);
  font-size: 0.9rem;
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, var(--accent-success) 0%, #059669 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-fast);
  font-size: 0.9rem;
}

.btn-success:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* 状态标签 */
.status-badge {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-badge.pending {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.status-badge.cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.status-badge.completed {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

/* 加载状态 */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary);
}

.loading::before {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state h3 {
  margin-bottom: 10px;
  color: var(--text-primary);
}

.empty-state p {
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .btn-primary,
  .btn-secondary,
  .btn-danger,
  .btn-success {
    padding: 8px 16px;
    font-size: 0.85rem;
  }
}
</style>
