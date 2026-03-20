<template>
  <div class="data-table">
    <!-- 搜索和过滤 -->
    <div v-if="showSearch || showFilters" class="table-header">
      <div class="search-section">
        <van-search
          v-if="showSearch"
          v-model="searchQuery"
          :placeholder="searchPlaceholder"
          @search="handleSearch"
          @input="handleSearch"
          show-action
        >
          <template #action>
            <van-button type="primary" size="small" @click="handleSearch(searchQuery)"
              >搜索</van-button
            >
          </template>
        </van-search>
      </div>

      <div v-if="showFilters" class="filter-section">
        <slot name="filters" :filters="filters" :updateFilter="updateFilter" />
      </div>

      <div v-if="showActions" class="action-section">
        <slot name="actions" />
      </div>
    </div>

    <!-- 数据列表 -->
    <van-list
      :loading="listLoading"
      :finished="listFinished"
      finished-text="没有更多了"
      @load="onLoad"
      class="data-table__list"
    >
      <!-- 多选头部 -->
      <van-cell v-if="selectable && paginatedData.length > 0" class="selection-header">
        <template #title>
          <van-checkbox
            :model-value="isAllSelected"
            :indeterminate="isIndeterminate"
            @update:model-value="toggleAllSelection"
          >
            全选
          </van-checkbox>
        </template>
        <template #value>
          <span class="selection-count">{{ selectedRows.length }}/{{ paginatedData.length }}</span>
        </template>
      </van-cell>

      <!-- 数据项 -->
      <template v-if="paginatedData.length > 0">
        <van-cell
          v-for="(item, index) in paginatedData"
          :key="getRowKey(item, index)"
          :class="getRowClass(item, index)"
          @click="handleRowClick(item, index)"
        >
          <template #icon v-if="selectable">
            <van-checkbox
              :model-value="isRowSelected(item)"
              @update:model-value="(checked) => toggleRowSelection(item, checked)"
              @click.stop
            />
          </template>

          <template #title>
            <div class="row-content">
              <template v-for="column in visibleColumns" :key="column.prop || column.label">
                <div v-if="column.slot" class="cell-item">
                  <span class="cell-label">{{ column.label }}:</span>
                  <div class="cell-value">
                    <slot
                      :name="column.slot"
                      :row="item"
                      :column="column"
                      :index="index"
                      :value="item[column.prop]"
                    />
                  </div>
                </div>

                <div v-else-if="column.formatter" class="cell-item">
                  <span class="cell-label">{{ column.label }}:</span>
                  <span class="cell-value">{{
                    column.formatter(item, column, item[column.prop], index)
                  }}</span>
                </div>

                <div v-else-if="column.type === 'tag'" class="cell-item">
                  <span class="cell-label">{{ column.label }}:</span>
                  <van-tag
                    :type="getTagType(item[column.prop], column.tagTypes)"
                    :size="column.tagSize || 'small'"
                    class="cell-value"
                  >
                    {{ getTagText(item[column.prop], column.tagTexts) }}
                  </van-tag>
                </div>

                <div v-else-if="column.type === 'image'" class="cell-item">
                  <span class="cell-label">{{ column.label }}:</span>
                  <van-image
                    :src="item[column.prop]"
                    :width="column.imageWidth || '40px'"
                    :height="column.imageHeight || '40px'"
                    fit="cover"
                    @click="previewImage(item[column.prop])"
                    class="cell-value"
                  />
                </div>

                <div v-else-if="column.type === 'link'" class="cell-item">
                  <span class="cell-label">{{ column.label }}:</span>
                  <van-button
                    type="primary"
                    size="mini"
                    plain
                    @click.stop="handleLinkClick(item, column)"
                    class="cell-value"
                  >
                    {{ item[column.prop] }}
                  </van-button>
                </div>

                <div v-else-if="column.type === 'actions'" class="cell-item">
                  <span class="cell-label">操作:</span>
                  <div class="cell-actions">
                    <template v-for="action in getActions(item, column.actions)" :key="action.key">
                      <van-button
                        v-if="action.type === 'button'"
                        :type="action.buttonType || 'primary'"
                        :size="action.size || 'mini'"
                        :disabled="action.disabled"
                        :plain="action.plain !== false"
                        @click.stop="handleActionClick(action, item, index)"
                      >
                        {{ action.label }}
                      </van-button>

                      <van-popover
                        v-else-if="action.type === 'dropdown'"
                        placement="bottom"
                        theme="dark"
                      >
                        <template #reference>
                          <van-button
                            :type="action.buttonType || 'primary'"
                            :size="action.size || 'mini'"
                            plain
                          >
                            {{ action.label }}
                            <van-icon name="arrow-down" />
                          </van-button>
                        </template>
                        <van-cell-group>
                          <van-cell
                            v-for="dropItem in action.items"
                            :key="dropItem.key"
                            :title="dropItem.label"
                            clickable
                            @click="handleDropdownCommand(dropItem.key, item, index)"
                          />
                        </van-cell-group>
                      </van-popover>
                    </template>
                  </div>
                </div>

                <div
                  v-else-if="item[column.prop] !== undefined && item[column.prop] !== null"
                  class="cell-item"
                >
                  <span class="cell-label">{{ column.label }}:</span>
                  <span class="cell-value">{{ item[column.prop] }}</span>
                </div>
              </template>
            </div>
          </template>

          <template #value v-if="showIndex">
            <span class="row-index">{{ getIndex(index) }}</span>
          </template>
        </van-cell>
      </template>

      <!-- 空状态 -->
      <van-empty v-else :description="emptyText" />
    </van-list>

    <!-- 分页 -->
    <div v-if="showPagination && total > pageSize" class="table-pagination">
      <van-pagination
        v-model="currentPage"
        :total-items="total"
        :items-per-page="pageSize"
        :show-page-size="false"
        mode="simple"
        @change="handleCurrentPageChange"
      />

      <van-cell-group class="page-size-selector">
        <van-cell title="每页显示">
          <template #value>
            <van-picker
              v-model="selectedPageSize"
              :columns="pageSizeOptions"
              @confirm="handleSizeChange"
            >
              <template #default>
                <van-button size="small" type="primary" plain> {{ pageSize }}条/页 </van-button>
              </template>
            </van-picker>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { debounce } from '@/utils'
import { ImagePreview } from 'vant'

const props = defineProps({
  // 数据相关
  data: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadingText: {
    type: String,
    default: '加载中...',
  },
  emptyText: {
    type: String,
    default: '暂无数据',
  },

  // 表格配置
  height: [String, Number],
  maxHeight: [String, Number],
  stripe: {
    type: Boolean,
    default: true,
  },
  border: {
    type: Boolean,
    default: true,
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
  highlightCurrentRow: Boolean,
  rowKey: String,
  rowClassName: [String, Function],

  // 选择配置
  selectable: Boolean,
  reserveSelection: Boolean,
  showIndex: Boolean,

  // 搜索配置
  showSearch: Boolean,
  searchPlaceholder: {
    type: String,
    default: '请输入搜索关键词',
  },
  searchFields: {
    type: Array,
    default: () => [],
  },

  // 过滤配置
  showFilters: Boolean,
  filters: {
    type: Object,
    default: () => ({}),
  },

  // 操作配置
  showActions: Boolean,

  // 分页配置
  showPagination: {
    type: Boolean,
    default: true,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  total: {
    type: Number,
    default: 0,
  },
  pageSizes: {
    type: Array,
    default: () => [10, 20, 50, 100],
  },
  paginationLayout: {
    type: String,
    default: 'total, sizes, prev, pager, next, jumper',
  },
  paginationBackground: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits([
  'update:pageSize',
  'update:currentPage',
  'search',
  'filter',
  'selection-change',
  'current-change',
  'row-click',
  'row-dblclick',
  'sort-change',
  'action-click',
  'link-click',
])

const searchQuery = ref('')
const currentPage = ref(1)
const internalPageSize = ref(props.pageSize)
const selectedRows = ref([])
const listLoading = ref(false)
const listFinished = ref(true)
const selectedPageSize = ref([props.pageSize])

// 计算属性
const visibleColumns = computed(() => {
  return props.columns.filter((col) => col.type !== 'selection' && col.type !== 'index')
})

const pageSizeOptions = computed(() => {
  return props.pageSizes.map((size) => ({ text: `${size}条/页`, value: size }))
})

const isAllSelected = computed(() => {
  return paginatedData.value.length > 0 && selectedRows.value.length === paginatedData.value.length
})

const isIndeterminate = computed(() => {
  return selectedRows.value.length > 0 && selectedRows.value.length < paginatedData.value.length
})

// 搜索处理
const handleSearch = debounce((query) => {
  currentPage.value = 1
  emit('search', query)
}, 300)

// 过滤数据
const filteredData = computed(() => {
  let result = [...props.data]

  // 本地搜索
  if (searchQuery.value && props.searchFields.length > 0) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((item) => {
      return props.searchFields.some((field) => {
        const value = item[field]
        return value && value.toString().toLowerCase().includes(query)
      })
    })
  }

  return result
})

// 分页数据
const paginatedData = computed(() => {
  if (!props.showPagination) return filteredData.value

  const start = (currentPage.value - 1) * internalPageSize.value
  const end = start + internalPageSize.value
  return filteredData.value.slice(start, end)
})

// 列表事件处理
const onLoad = () => {
  // 移动端下拉刷新逻辑
  listLoading.value = false
}

// 选择相关方法
const isRowSelected = (row) => {
  const key = getRowKey(row)
  return selectedRows.value.some((item) => getRowKey(item) === key)
}

const toggleRowSelection = (row, selected) => {
  const key = getRowKey(row)
  const index = selectedRows.value.findIndex((item) => getRowKey(item) === key)

  if (selected && index === -1) {
    selectedRows.value.push(row)
  } else if (!selected && index > -1) {
    selectedRows.value.splice(index, 1)
  }

  emit('selection-change', selectedRows.value)
}

const toggleAllSelection = (checked) => {
  if (checked) {
    selectedRows.value = [...paginatedData.value]
  } else {
    selectedRows.value = []
  }
  emit('selection-change', selectedRows.value)
}

// 表格事件处理
const handleRowClick = (row, index) => {
  emit('row-click', row, null, null)
}

const handleCurrentChange = (current, old) => {
  emit('current-change', current, old)
}

// 分页事件处理
const handleSizeChange = (values) => {
  const size = values[0]
  internalPageSize.value = size
  currentPage.value = 1
  emit('update:pageSize', size)
}

const handleCurrentPageChange = (page) => {
  currentPage.value = page
  emit('update:currentPage', page)
}

// 操作事件处理
const handleActionClick = (action, row, index) => {
  emit('action-click', { action: action.key, row, index })
}

const handleDropdownCommand = (command, row, index) => {
  emit('action-click', { action: command, row, index })
}

const handleLinkClick = (row, column) => {
  emit('link-click', { row, column })
}

// 工具函数
const updateFilter = (key, value) => {
  emit('filter', { key, value })
}

const getIndex = (index) => {
  return (currentPage.value - 1) * internalPageSize.value + index + 1
}

const getRowKey = (row, index = 0) => {
  if (props.rowKey && row[props.rowKey]) {
    return row[props.rowKey]
  }
  return index
}

const getRowClass = (row, index) => {
  if (typeof props.rowClassName === 'function') {
    return props.rowClassName({ row, rowIndex: index })
  }
  return props.rowClassName || ''
}

const getTagType = (value, tagTypes) => {
  const typeMap = {
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'primary',
    primary: 'primary',
  }
  const originalType = tagTypes ? tagTypes[value] : 'primary'
  return typeMap[originalType] || 'primary'
}

const getTagText = (value, tagTexts) => {
  return tagTexts ? tagTexts[value] || value : value
}

const getActions = (row, actions) => {
  if (typeof actions === 'function') {
    return actions(row)
  }
  return actions || []
}

const previewImage = (src) => {
  ImagePreview([src])
}

// 监听 pageSize 变化
watch(
  () => props.pageSize,
  (newVal) => {
    internalPageSize.value = newVal
    selectedPageSize.value = [newVal]
  },
)

// 公开方法
const clearSelection = () => {
  selectedRows.value = []
  emit('selection-change', [])
}

const setCurrentRow = (row) => {
  // 移动端不需要当前行高亮逻辑
}

defineExpose({
  clearSelection,
  toggleRowSelection,
  toggleAllSelection,
  setCurrentRow,
})
</script>

<style scoped>
.data-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  padding: 16px;
  background: #f7f8fa;
  border-bottom: 1px solid #ebedf0;
}

.search-section {
  margin-bottom: 12px;
}

.filter-section {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.action-section {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.data-table__list {
  background: white;
}

.selection-header {
  background: #f7f8fa;
  border-bottom: 1px solid #ebedf0;
}

.selection-count {
  font-size: 12px;
  color: #969799;
}

.row-content {
  padding: 4px 0;
}

.cell-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 8px;
}

.cell-item:last-child {
  margin-bottom: 0;
}

.cell-label {
  min-width: 80px;
  font-size: 12px;
  color: #969799;
  flex-shrink: 0;
}

.cell-value {
  flex: 1;
  font-size: 14px;
  color: #323233;
  word-break: break-all;
}

.cell-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.row-index {
  font-size: 12px;
  color: #969799;
  background: #f7f8fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.table-pagination {
  padding: 16px;
  background: #f7f8fa;
  border-top: 1px solid #ebedf0;
}

.page-size-selector {
  margin-top: 12px;
}

:deep(.van-search) {
  padding: 0;
}

:deep(.van-cell) {
  padding: 12px 16px;
}

:deep(.van-cell__value) {
  flex: none;
}

:deep(.van-checkbox) {
  margin-right: 8px;
}

:deep(.van-tag) {
  margin: 0;
}

:deep(.van-image) {
  border-radius: 4px;
}

:deep(.van-empty) {
  padding: 40px 20px;
}

:deep(.van-pagination) {
  justify-content: center;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .table-header {
    padding: 12px;
  }

  .cell-label {
    min-width: 60px;
    font-size: 11px;
  }

  .cell-value {
    font-size: 13px;
  }

  .cell-actions {
    gap: 6px;
  }

  .cell-actions :deep(.van-button) {
    font-size: 11px;
    padding: 4px 8px;
  }
}
</style>
