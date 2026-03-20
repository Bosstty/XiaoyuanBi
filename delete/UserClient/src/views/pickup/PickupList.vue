<template>
  <div class="pickup-list">
    <van-nav-bar title="代取订单" left-arrow @click-left="goBack" />

    <!-- 筛选栏 -->
    <van-cell-group class="filter-section">
      <van-cell @click="showTypePicker = true" is-link>
        <template #title>
          <span>类型筛选</span>
        </template>
        <template #value>
          <span>{{ typeText || '全部类型' }}</span>
        </template>
      </van-cell>
      <van-cell @click="showStatusPicker = true" is-link>
        <template #title>
          <span>状态筛选</span>
        </template>
        <template #value>
          <span>{{ statusText || '全部状态' }}</span>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 加载状态 -->
    <van-loading v-if="pickupStore.loading" class="loading-container" />

    <!-- 订单列表 -->
    <div v-else-if="filteredOrders.length > 0" class="orders-list">
      <van-card
        v-for="order in filteredOrders"
        :key="order.id"
        :title="getOrderTypeName(order.type)"
        :price="`¥${order.price}`"
        @click="goToOrderDetail(order.id)"
      >
        <template #thumb>
          <div class="order-thumb">
            <van-icon :name="getOrderTypeIcon(order.type)" />
          </div>
        </template>

        <template #tags>
          <van-tag :type="getStatusTagType(order.status)">
            {{ getStatusText(order.status) }}
          </van-tag>
        </template>

        <template #desc>
          <div class="order-info">
            <div class="order-desc">{{ order.description }}</div>
            <div class="order-location">
              <div class="location-row">
                <van-icon name="location-o" />
                <span>取件：{{ order.pickup_location }}</span>
              </div>
              <div class="location-row">
                <van-icon name="home-o" />
                <span>送达：{{ order.delivery_location }}</span>
              </div>
            </div>
          </div>
        </template>

        <template #footer>
          <div class="order-footer">
            <span class="order-time">{{ formatTime(order.created_at) }}</span>
            <van-button
              v-if="order.status === 'pending'"
              type="primary"
              size="mini"
              @click.stop="acceptOrder(order.id)"
            >
              接单
            </van-button>
          </div>
        </template>
      </van-card>
    </div>

    <!-- 空状态 -->
    <van-empty v-else description="暂无符合条件的订单">
      <template #image>
        <van-icon name="logistics" size="64" color="#dcdee0" />
      </template>
    </van-empty>

    <!-- 类型选择器 -->
    <van-popup v-model:show="showTypePicker" position="bottom">
      <van-picker
        :columns="typeOptions"
        @confirm="onTypeConfirm"
        @cancel="showTypePicker = false"
        title="选择类型"
      />
    </van-popup>

    <!-- 状态选择器 -->
    <van-popup v-model:show="showStatusPicker" position="bottom">
      <van-picker
        :columns="statusOptions"
        @confirm="onStatusConfirm"
        @cancel="showStatusPicker = false"
        title="选择状态"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePickupStore } from '@/stores/pickup'
import { showToast } from 'vant'

const router = useRouter()
const pickupStore = usePickupStore()

const selectedType = ref('')
const selectedStatus = ref('')
const showTypePicker = ref(false)
const showStatusPicker = ref(false)

const typeOptions = [
  { text: '全部类型', value: '' },
  { text: '快递代取', value: 'express' },
  { text: '外卖代取', value: 'food' },
  { text: '药品代购', value: 'medicine' },
  { text: '生活用品', value: 'daily' },
]

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '待接单', value: 'pending' },
  { text: '已接单', value: 'accepted' },
  { text: '配送中', value: 'picking' },
  { text: '已完成', value: 'completed' },
]

const typeText = computed(() => {
  const type = typeOptions.find((t) => t.value === selectedType.value)
  return type && type.value ? type.text : ''
})

const statusText = computed(() => {
  const status = statusOptions.find((s) => s.value === selectedStatus.value)
  return status && status.value ? status.text : ''
})

const filteredOrders = computed(() => {
  let orders = pickupStore.orders

  if (selectedType.value) {
    orders = orders.filter((order) => order.type === selectedType.value)
  }

  if (selectedStatus.value) {
    orders = orders.filter((order) => order.status === selectedStatus.value)
  }

  return orders
})

function goBack() {
  router.push('/pickup')
}

function onTypeConfirm({ selectedOptions }) {
  selectedType.value = selectedOptions[0].value
  showTypePicker.value = false
  handleFilterChange()
}

function onStatusConfirm({ selectedOptions }) {
  selectedStatus.value = selectedOptions[0].value
  showStatusPicker.value = false
  handleFilterChange()
}

function handleFilterChange() {
  fetchOrders()
}

async function fetchOrders() {
  const params = {}
  if (selectedType.value) params.type = selectedType.value
  if (selectedStatus.value) params.status = selectedStatus.value

  await pickupStore.fetchOrders(params)
}

function goToOrderDetail(id) {
  router.push(`/pickup/${id}`)
}

async function acceptOrder(orderId) {
  try {
    await pickupStore.acceptOrder(orderId)
    showToast('接单成功')
  } catch (error) {
    console.error('接单失败:', error)
    showToast('接单失败，请重试')
  }
}

function getOrderTypeName(type) {
  const types = {
    express: '快递代取',
    food: '外卖代取',
    medicine: '药品代购',
    daily: '生活用品代购',
  }
  return types[type] || type
}

function getOrderTypeIcon(type) {
  const icons = {
    express: 'logistics',
    food: 'shop-o',
    medicine: 'medical-o',
    daily: 'shopping-cart-o',
  }
  return icons[type] || 'logistics'
}

function getStatusText(status) {
  const statusMap = {
    pending: '待接单',
    accepted: '已接单',
    picking: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusMap[status] || status
}

function getStatusTagType(status) {
  const types = {
    pending: 'primary',
    accepted: 'success',
    picking: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'default'
}

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.pickup-list {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.filter-section {
  margin: 16px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.orders-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  background: #1989fa;
}

.order-info {
  margin-bottom: 12px;
}

.order-desc {
  color: #646566;
  margin-bottom: 12px;
  line-height: 1.4;
}

.order-location {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #646566;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.order-time {
  font-size: 12px;
  color: #969799;
}

:deep(.van-card__price) {
  color: #ee0a24;
  font-weight: 600;
}

:deep(.van-cell__title) {
  font-weight: 500;
}

:deep(.van-cell__value) {
  color: #646566;
}
</style>
