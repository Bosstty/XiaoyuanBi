<template>
  <div class="dashboard-header">
    <div class="header-content">
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-subtitle">{{ subtitle }}</p>
    </div>
    <div
      v-if="showPanel"
      class="header-filter-panel"
      :class="{ 'header-filter-panel-actions-only': !showDatePicker && !showFilterCopy }"
    >
      <div v-if="showDatePicker || showFilterCopy" class="filter-panel-main">
        <div v-if="showDatePicker || showFilterCopy" class="filter-panel-copy">
          <span class="filter-panel-label">{{ filterLabel }}</span>
          <span class="filter-panel-hint">{{ filterHint }}</span>
        </div>
        <el-date-picker
          v-if="showDatePicker"
          :model-value="modelValue"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          class="date-picker"
          @update:model-value="handleDateRangeChange"
          @change="emit('change', $event)"
        />
      </div>
      <div v-if="$slots.actions || actionLabel || secondaryActionLabel" class="header-actions">
        <el-button
          v-if="secondaryActionLabel"
          class="action-button action-button-ghost"
          @click="emit('secondary-action')"
        >
          <el-icon v-if="secondaryActionIcon"><component :is="secondaryActionIcon" /></el-icon>
          {{ secondaryActionLabel }}
        </el-button>
        <el-button
          v-if="actionLabel"
          class="action-button action-button-secondary"
          @click="emit('action')"
        >
          <el-icon v-if="actionIcon"><component :is="actionIcon" /></el-icon>
          {{ actionLabel }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  filterLabel: {
    type: String,
    default: '统计范围',
  },
  filterHint: {
    type: String,
    default: '默认展示最近30天，可按需调整',
  },
  modelValue: {
    type: Array,
    default: () => [],
  },
  showDatePicker: {
    type: Boolean,
    default: true,
  },
  showFilterCopy: {
    type: Boolean,
    default: true,
  },
  actionLabel: {
    type: String,
    default: '',
  },
  secondaryActionLabel: {
    type: String,
    default: '',
  },
  actionIcon: {
    type: [Object, Function],
    default: null,
  },
  secondaryActionIcon: {
    type: [Object, Function],
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'change', 'action', 'secondary-action'])
const slots = useSlots()
const showPanel = computed(
  () =>
    props.showDatePicker ||
    props.actionLabel ||
    props.secondaryActionLabel ||
    !!slots.actions,
)

const handleDateRangeChange = (value) => {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
  margin: 0;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 4px 0 0;
}

.header-filter-panel {
  min-width: 460px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92)),
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.08), transparent 48%);
  border-radius: 18px;
}

.header-filter-panel-actions-only {
  min-width: auto;
  justify-content: flex-end;
  padding: 10px 12px;
}

.filter-panel-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.filter-panel-copy {
  min-width: 110px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-panel-label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #475569;
}

.filter-panel-hint {
  font-size: 0.78rem;
  line-height: 1.45;
  color: #94a3b8;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.header-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.date-picker {
  width: 320px;
}

.date-picker :deep(.el-input__wrapper) {
  min-height: 44px;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.92);
}

.date-picker :deep(.el-range-separator) {
  color: #64748b;
  font-weight: 600;
}

.date-picker :deep(.el-range-input) {
  color: #0f172a;
  font-weight: 500;
}

.action-button {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 12px;
  font-weight: 600;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}

.action-button:hover {
  transform: translateY(-1px);
}

.action-button-secondary {
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.18);
  background: rgba(239, 246, 255, 0.96);
}

.action-button-secondary:hover {
  color: #1d4ed8;
  border-color: rgba(37, 99, 235, 0.26);
  background: rgba(219, 234, 254, 0.96);
}

.action-button-ghost {
  color: #475569;
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.96);
}

.action-button-ghost:hover {
  color: #0f172a;
  border-color: rgba(100, 116, 139, 0.3);
  background: rgba(248, 250, 252, 1);
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-filter-panel {
    width: 100%;
    min-width: 0;
    flex-direction: column;
    align-items: stretch;
  }

  .filter-panel-main {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filter-panel-copy {
    min-width: 0;
  }

  .header-actions {
    width: 100%;
    display: block;
  }

  .date-picker {
    width: 100%;
  }
}
</style>
