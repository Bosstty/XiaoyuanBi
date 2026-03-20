<template>
  <div class="my-pickup-orders">
    <van-nav-bar title="我的代取订单" left-arrow @click-left="goBack">
      <template #right>
        <van-icon name="plus" @click="createOrder" />
      </template>
    </van-nav-bar>

    <van-tabs v-model:active="activeTab" type="card" shrink class="order-tabs">
      <van-tab
        v-for="tab in tabs"
        :key="tab.value"
        :name="tab.value"
        :title="tab.label"
        :badge="getTabCount(tab.value) > 0 ? getTabCount(tab.value) : null"
      />
    </van-tabs>

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
            <div class="order-id">订单号：#{{ order.id }}</div>
            <div class="order-desc">{{ order.description }}</div>
            <div class="order-detail">
              <div class="detail-row">
                <van-icon name="location-o" />
                <span>取件：{{ order.pickup_location }}</span>
              </div>
              <div class="detail-row">
                <van-icon name="home-o" />
                <span>送达：{{ order.delivery_location }}</span>
              </div>
            </div>
          </div>
        </template>

        <template #footer>
          <div class="order-footer">
            <span class="order-time">{{ formatTime(order.created_at) }}</span>
            <div class="order-actions">
              <van-button
                v-if="order.status === 'pending'"
                @click.stop="editOrder(order.id)"
                size="mini"
                type="default"
              >
                编辑
              </van-button>
              <van-button
                v-if="canCancel(order)"
                @click.stop="cancelOrder(order.id)"
                size="mini"
                type="danger"
              >
                取消
              </van-button>
              <van-button
                v-if="order.status === 'completed'"
                @click.stop="reviewOrder(order.id)"
                size="mini"
                type="primary"
              >
                评价
              </van-button>
            </div>
          </div>
        </template>
      </van-card>
    </div>

    <!-- 空状态 -->
    <van-empty v-else :description="getEmptyMessage()">
      <template #image>
        <van-icon name="logistics" size="64" color="#dcdee0" />
      </template>
      <template #description>
        <div class="empty-desc">
          <p>{{ getEmptyDescription() }}</p>
          <van-button
            v-if="activeTab === 'all'"
            type="primary"
            @click="createOrder"
            class="empty-btn"
          >
            发布第一个订单
          </van-button>
        </div>
      </template>
    </van-empty>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePickupStore } from '@/stores/pickup'
import { showConfirmDialog } from 'vant'

const router = useRouter()
const pickupStore = usePickupStore()

const activeTab = ref('all')

const tabs = [
  { label: '全部', value: 'all' },
  { label: '待接单', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const filteredOrders = computed(() => {
  let orders = pickupStore.myOrders

  if (activeTab.value === 'all') return orders

  if (activeTab.value === 'in_progress') {
    return orders.filter((order) => order.status === 'accepted' || order.status === 'picking')
  }

  return orders.filter((order) => order.status === activeTab.value)
})

function getTabCount(tabValue) {
  if (tabValue === 'all') return pickupStore.myOrders.length

  if (tabValue === 'in_progress') {
    return pickupStore.myOrders.filter(
      (order) => order.status === 'accepted' || order.status === 'picking',
    ).length
  }

  return pickupStore.myOrders.filter((order) => order.status === tabValue).length
}

function goBack() {
  router.push('/pickup')
}

function createOrder() {
  router.push('/pickup/create')
}

function goToOrderDetail(id) {
  router.push(`/pickup/${id}`)
}

function editOrder(id) {
  router.push(`/pickup/edit/${id}`)
}

async function cancelOrder(orderId) {
  try {
    await showConfirmDialog({
      title: '确认取消',
      message: '确定要取消这个订单吗？',
    })
    await pickupStore.cancelOrder(orderId)
  } catch (error) {
    console.error('取消订单失败:', error)
  }
}

function reviewOrder(id) {
  router.push(`/pickup/${id}/review`)
}

function canCancel(order) {
  return order.status === 'pending' || order.status === 'accepted'
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

function getEmptyMessage() {
  const messages = {
    all: '暂无订单',
    pending: '暂无待接单订单',
    in_progress: '暂无进行中订单',
    completed: '暂无已完成订单',
    cancelled: '暂无已取消订单',
  }
  return messages[activeTab.value] || '暂无订单'
}

function getEmptyDescription() {
  const descriptions = {
    all: '您还没有发布过任何订单',
    pending: '当前没有等待接单的订单',
    in_progress: '当前没有正在进行的订单',
    completed: '您还没有完成的订单',
    cancelled: '您没有取消过订单',
  }
  return descriptions[activeTab.value] || ''
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
  pickupStore.fetchMyOrders()
})
</script>

<style scoped>
.my-pickup-orders {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.order-tabs {
  margin-bottom: 16px;
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

.order-id {
  font-size: 12px;
  color: #969799;
  font-family: monospace;
  margin-bottom: 8px;
}

.order-desc {
  color: #646566;
  margin-bottom: 12px;
  line-height: 1.5;
}

.order-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-row {
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

.order-actions {
  display: flex;
  gap: 8px;
}

.empty-desc {
  text-align: center;
}

.empty-desc p {
  color: #646566;
  margin-bottom: 16px;
  font-size: 14px;
}

.empty-btn {
  margin-top: 16px;
}

:deep(.van-card__price) {
  color: #ee0a24;
  font-weight: 600;
}

:deep(.van-tab) {
  font-size: 14px;
}

:deep(.van-badge) {
  background: #ee0a24;
}
</style>
