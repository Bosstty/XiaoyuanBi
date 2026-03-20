<template>
  <div class="user-orders">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>我的订单</h2>
      <div class="header-stats">
        <van-grid :column-num="4" :border="false">
          <van-grid-item>
            <div class="stat-item">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">总订单数</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-item">
              <div class="stat-value">{{ stats.pending }}</div>
              <div class="stat-label">进行中</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-item">
              <div class="stat-value">{{ stats.completed }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-item">
              <div class="stat-value">¥{{ stats.totalAmount }}</div>
              <div class="stat-label">总金额</div>
            </div>
          </van-grid-item>
        </van-grid>
      </div>
    </div>

    <!-- 订单列表 -->
    <div class="orders-section">
      <div class="list-header">
        <h3>订单列表</h3>
        <van-button type="primary" size="small" @click="showFilter = true">
          <van-icon name="filter-o" />
          筛选
        </van-button>
      </div>

      <div v-if="loading" class="loading-container">
        <van-loading size="40px" />
        <p>加载中...</p>
      </div>

      <div v-else-if="orders.length === 0" class="empty-state">
        <van-empty description="暂无订单数据">
          <template #image>
            <van-icon name="orders-o" size="64" color="#ddd" />
          </template>
        </van-empty>
      </div>

      <div v-else class="order-items">
        <van-card
          v-for="order in orders"
          :key="order.id"
          :title="order.title"
          :desc="order.description"
          :thumb="require('@/assets/images/order-default.png')"
          @click="viewOrderDetail(order.id)"
        >
          <template #top-right>
            <van-tag :type="getStatusType(order.status)" size="large">
              {{ getStatusText(order.status) }}
            </van-tag>
          </template>

          <template #bottom>
            <div class="order-meta">
              <div class="meta-row">
                <van-icon name="location-o" />
                <span>{{ order.pickup_location }} → {{ order.delivery_location }}</span>
              </div>
              <div class="meta-row">
                <van-icon name="contact" />
                <span>{{ order.contact_name }}</span>
              </div>
              <div class="meta-row">
                <van-icon name="phone-o" />
                <span>{{ order.contact_phone }}</span>
              </div>
              <div class="meta-row time">
                <span>{{ formatTime(order.created_at) }}</span>
              </div>
            </div>
          </template>

          <template #price>
            <span class="price">¥{{ order.price }}</span>
          </template>

          <template #footer>
            <div class="order-actions">
              <van-button
                v-if="order.status === 'pending'"
                type="danger"
                size="small"
                @click.stop="cancelOrder(order.id)"
              >
                取消订单
              </van-button>
              <van-button
                v-if="order.status === 'completed'"
                type="primary"
                size="small"
                @click.stop="rateOrder(order.id)"
              >
                评价
              </van-button>
              <van-button size="small" @click.stop="viewOrderDetail(order.id)">
                查看详情
              </van-button>
            </div>
          </template>
        </van-card>
      </div>

      <!-- 分页 -->
      <div v-if="orders.length > 0" class="pagination">
        <van-pagination
          v-model="pagination.page"
          :total-items="pagination.total"
          :items-per-page="pagination.size"
          :show-page-size="3"
          @change="handlePageChange"
        />
      </div>
    </div>

    <!-- 筛选弹窗 -->
    <van-popup v-model:show="showFilter" position="bottom" :style="{ height: '60%' }">
      <div class="filter-container">
        <div class="filter-header">
          <van-button type="primary" text @click="showFilter = false">取消</van-button>
          <span class="filter-title">筛选条件</span>
          <van-button type="primary" text @click="applyFilters">确定</van-button>
        </div>

        <div class="filter-content">
          <van-form label-width="80px">
            <van-field
              name="status"
              label="订单状态"
              placeholder="请选择订单状态"
              :model-value="getStatusText(filters.status)"
              is-link
              readonly
              @click="showStatusPicker = true"
            />

            <van-field
              name="type"
              label="订单类型"
              placeholder="请选择订单类型"
              :model-value="getTypeText(filters.type)"
              is-link
              readonly
              @click="showTypePicker = true"
            />

            <van-field
              name="dateRange"
              label="日期范围"
              placeholder="请选择日期范围"
              :model-value="getDateRangeText()"
              is-link
              readonly
              @click="showCalendar = true"
            />
          </van-form>
        </div>
      </div>
    </van-popup>

    <!-- 状态选择器 -->
    <van-popup v-model:show="showStatusPicker" position="bottom">
      <van-picker
        :columns="statusOptions"
        @confirm="onStatusConfirm"
        @cancel="showStatusPicker = false"
        title="选择订单状态"
      />
    </van-popup>

    <!-- 类型选择器 -->
    <van-popup v-model:show="showTypePicker" position="bottom">
      <van-picker
        :columns="typeOptions"
        @confirm="onTypeConfirm"
        @cancel="showTypePicker = false"
        title="选择订单类型"
      />
    </van-popup>

    <!-- 日历选择器 -->
    <van-calendar
      v-model:show="showCalendar"
      type="range"
      @confirm="onDateConfirm"
      title="选择日期范围"
    />

    <!-- 评价弹窗 -->
    <van-popup
      v-model:show="showRateDialog"
      position="center"
      :style="{ width: '90%', maxWidth: '400px' }"
    >
      <div class="rate-container">
        <div class="rate-header">
          <h3>订单评价</h3>
          <van-icon name="cross" @click="showRateDialog = false" />
        </div>

        <div class="rate-content">
          <van-form label-width="80px">
            <van-field name="rating" label="评分">
              <template #input>
                <van-rate v-model="rateForm.rating" :size="20" />
              </template>
            </van-field>

            <van-field
              v-model="rateForm.comment"
              name="comment"
              label="评价内容"
              type="textarea"
              placeholder="请输入评价内容"
              maxlength="200"
              show-word-limit
              :autosize="{ minHeight: '60px' }"
            />
          </van-form>
        </div>

        <div class="rate-footer">
          <van-button @click="showRateDialog = false">取消</van-button>
          <van-button type="primary" @click="submitRating" :loading="rateLoading">
            提交评价
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { pickupAPI } from '@/utils/api'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const rateLoading = ref(false)
const showRateDialog = ref(false)
const showFilter = ref(false)
const showStatusPicker = ref(false)
const showTypePicker = ref(false)
const showCalendar = ref(false)
const orders = ref([])
const stats = ref({
  total: 0,
  pending: 0,
  completed: 0,
  totalAmount: 0,
})

const filters = reactive({
  status: '',
  type: '',
  dateRange: [],
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 0,
})

const rateForm = reactive({
  orderId: null,
  rating: 5,
  comment: '',
})

// 选择器选项
const statusOptions = [
  { text: '全部', value: '' },
  { text: '待接取', value: 'pending' },
  { text: '进行中', value: 'accepted' },
  { text: '已完成', value: 'completed' },
  { text: '已取消', value: 'cancelled' },
]

const typeOptions = [
  { text: '全部', value: '' },
  { text: '快递代取', value: 'express' },
  { text: '外卖代取', value: 'food' },
  { text: '药品代购', value: 'medicine' },
  { text: '生活用品', value: 'daily' },
]

// 生命周期
onMounted(() => {
  loadOrders()
  loadStats()
})

// 方法
const loadOrders = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...filters,
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }

    const response = await pickupAPI.getMyOrders(params)
    orders.value = response.data.orders
    pagination.total = response.data.total
  } catch (error) {
    showToast('加载订单失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await pickupAPI.getOrderStats()
    stats.value = response.data
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    accepted: 'primary',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'default'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待接取',
    accepted: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    '': '全部',
  }
  return texts[status] || status
}

const getTypeText = (type) => {
  const texts = {
    express: '快递代取',
    food: '外卖代取',
    medicine: '药品代购',
    daily: '生活用品',
    '': '全部',
  }
  return texts[type] || type
}

const getDateRangeText = () => {
  if (filters.dateRange && filters.dateRange.length === 2) {
    return `${filters.dateRange[0]} - ${filters.dateRange[1]}`
  }
  return '请选择日期范围'
}

const formatTime = (time) => {
  return new Date(time).toLocaleString('zh-CN')
}

const cancelOrder = async (orderId) => {
  try {
    await showConfirmDialog({
      title: '确认取消',
      message: '确定要取消这个订单吗？',
    })
    await pickupAPI.cancelOrder(orderId)
    showToast('订单已取消')
    loadOrders()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      showToast('取消订单失败')
    }
  }
}

const rateOrder = (orderId) => {
  rateForm.orderId = orderId
  rateForm.rating = 5
  rateForm.comment = ''
  showRateDialog.value = true
}

const submitRating = async () => {
  try {
    rateLoading.value = true
    await pickupAPI.rateOrder(rateForm.orderId, {
      rating: rateForm.rating,
      comment: rateForm.comment,
    })
    showToast('评价提交成功')
    showRateDialog.value = false
    loadOrders()
  } catch (error) {
    showToast('评价提交失败')
  } finally {
    rateLoading.value = false
  }
}

const viewOrderDetail = (orderId) => {
  router.push(`/pickup/${orderId}`)
}

const handlePageChange = (page) => {
  pagination.page = page
  loadOrders()
}

const onStatusConfirm = ({ selectedOptions }) => {
  filters.status = selectedOptions[0].value
  showStatusPicker.value = false
}

const onTypeConfirm = ({ selectedOptions }) => {
  filters.type = selectedOptions[0].value
  showTypePicker.value = false
}

const onDateConfirm = (values) => {
  filters.dateRange = [
    new Date(values[0]).toISOString().split('T')[0],
    new Date(values[1]).toISOString().split('T')[0],
  ]
  showCalendar.value = false
}

const applyFilters = () => {
  pagination.page = 1
  loadOrders()
  showFilter.value = false
}
</script>

<style scoped>
.user-orders {
  padding: 16px;
  background: #f7f8fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0 0 16px 0;
  color: #323233;
  font-size: 18px;
  font-weight: 600;
}

.header-stats {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #969799;
}

.orders-section {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-bottom: 1px solid #ebedf0;
}

.list-header h3 {
  margin: 0;
  color: #323233;
  font-size: 16px;
  font-weight: 600;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #969799;
}

.empty-state {
  padding: 40px 0;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #f7f8fa;
}

.order-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #969799;
}

.meta-row.time {
  margin-top: 4px;
}

.price {
  font-size: 18px;
  font-weight: 600;
  color: #ee0a24;
}

.order-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.pagination {
  padding: 16px;
  display: flex;
  justify-content: center;
  background: white;
}

.filter-container {
  background: white;
  border-radius: 16px 16px 0 0;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
}

.filter-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.filter-content {
  padding: 16px;
}

.rate-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.rate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.rate-header h3 {
  margin: 0;
  color: #323233;
  font-size: 16px;
  font-weight: 600;
}

.rate-footer {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.rate-footer .van-button {
  flex: 1;
}
</style>
