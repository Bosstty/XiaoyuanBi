<template>
  <van-card class="task-card" @click="$emit('task-click', task)">
    <template #header>
      <div class="task-header">
        <div class="task-meta">
          <van-tag :type="getCategoryTagType(task.category)" size="small">
            {{ getCategoryText(task.category) }}
          </van-tag>
          <van-tag v-if="task.urgent" type="danger" size="small">紧急</van-tag>
        </div>
        <div class="task-price">¥{{ task.price }}</div>
      </div>
    </template>

    <template #title>
      <h3 class="task-title">{{ task.title }}</h3>
    </template>

    <template #desc>
      <p class="task-description">{{ task.description }}</p>

      <div v-if="task.tags && task.tags.length" class="task-tags">
        <van-tag v-for="tag in task.tags" :key="tag" size="small" plain class="task-tag">
          {{ tag }}
        </van-tag>
      </div>
    </template>

    <template #footer>
      <div class="task-footer">
        <div class="task-info">
          <div class="info-item">
            <van-icon name="location-o" />
            <span>{{ task.location || '不限' }}</span>
          </div>
          <div class="info-item">
            <van-icon name="clock-o" />
            <span>{{ formatTime(task.created_at) }}</span>
          </div>
          <div v-if="task.deadline" class="info-item">
            <van-icon name="calendar-o" />
            <span>{{ formatDeadline(task.deadline) }}</span>
          </div>
        </div>

        <div class="task-actions" @click.stop>
          <van-button v-if="showApplyButton" type="primary" size="small" @click="handleApply">
            立即申请
          </van-button>
          <van-button v-if="showViewButton" size="small" plain @click="handleView">
            查看详情
          </van-button>
          <van-popover v-if="showMoreActions" placement="bottom-end" theme="dark">
            <template #reference>
              <van-button size="small" plain>
                更多
                <van-icon name="arrow-down" />
              </van-button>
            </template>
            <van-cell-group>
              <van-cell title="编辑" clickable @click="handleCommand('edit')" />
              <van-cell title="删除" clickable @click="handleCommand('delete')" />
            </van-cell-group>
          </van-popover>
        </div>
      </div>
    </template>

    <template #tag v-if="task.status">
      <van-tag :type="getStatusTagType(task.status)" size="small" class="task-status">
        {{ getStatusText(task.status) }}
      </van-tag>
    </template>
  </van-card>
</template>

<script setup>
defineProps({
  task: {
    type: Object,
    required: true,
  },
  showApplyButton: {
    type: Boolean,
    default: true,
  },
  showViewButton: {
    type: Boolean,
    default: false,
  },
  showMoreActions: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['task-click', 'apply', 'view', 'edit', 'delete'])

const getCategoryText = (category) => {
  const categoryMap = {
    study: '学习辅导',
    design: '设计制作',
    tech: '技术开发',
    writing: '文案写作',
    life: '生活服务',
    express: '快递代取',
    food: '外卖代取',
    medicine: '药品代购',
    daily: '生活用品',
  }
  return categoryMap[category] || category
}

const getCategoryTagType = (category) => {
  const typeMap = {
    study: 'primary',
    design: 'success',
    tech: 'warning',
    writing: 'primary',
    life: 'danger',
    express: 'primary',
    food: 'success',
    medicine: 'warning',
    daily: 'primary',
  }
  return typeMap[category] || 'primary'
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '待接单',
    accepted: '已接单',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusMap[status] || status
}

const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    accepted: 'primary',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'danger',
  }
  return typeMap[status] || 'primary'
}

const formatTime = (time) => {
  if (!time) return ''
  const now = new Date()
  const taskTime = new Date(time)
  const diff = now - taskTime
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return '刚刚发布'
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

const formatDeadline = (deadline) => {
  if (!deadline) return ''
  const date = new Date(deadline)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const handleApply = (task) => {
  emit('apply', task)
}

const handleView = (task) => {
  emit('view', task)
}

const handleCommand = (command, task) => {
  emit(command, task)
}
</script>

<style scoped>
.task-card {
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.task-card:active {
  transform: scale(0.98);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-price {
  font-size: 16px;
  font-weight: 600;
  color: #ee0a24;
}

.task-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  line-height: 1.4;
}

.task-description {
  color: #969799;
  line-height: 1.5;
  margin-bottom: 12px;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-tags {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-tag {
  margin: 0;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #c8c9cc;
}

.task-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.task-status {
  margin: 0;
}

:deep(.van-card) {
  margin: 0;
  box-shadow: 0 2px 12px rgba(100, 101, 102, 0.08);
  border-radius: 8px;
}

:deep(.van-card__content) {
  padding: 12px;
}

:deep(.van-card__header) {
  padding: 12px 12px 0;
}

:deep(.van-card__footer) {
  padding: 0 12px 12px;
}

:deep(.van-icon) {
  font-size: 12px;
}

:deep(.van-button--small) {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .task-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .task-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .task-price {
    font-size: 15px;
  }

  .task-title {
    font-size: 15px;
  }

  .task-description {
    font-size: 13px;
  }

  .info-item {
    font-size: 11px;
  }
}
</style>
