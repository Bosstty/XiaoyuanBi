<template>
  <div class="pickup-home">
    <van-nav-bar title="代取服务" left-arrow @click-left="$router.go(-1)" />

    <van-notice-bar
      left-icon="volume-o"
      text="专业的校园代取服务，让生活更便捷"
      background="#ecf5ff"
      color="#409eff"
      class="header-notice"
    />

    <van-grid :column-num="2" :gutter="16" class="quick-actions">
      <van-grid-item to="/pickup/create">
        <van-icon name="add" size="24" color="#1989fa" />
        <div class="action-text">发布代取订单</div>
      </van-grid-item>
      <van-grid-item to="/pickup/my">
        <van-icon name="orders-o" size="24" color="#1989fa" />
        <div class="action-text">我的订单</div>
      </van-grid-item>
    </van-grid>

    <van-grid :column-num="2" :gutter="16" class="service-grid">
      <van-grid-item to="/pickup/express">
        <div class="service-content">
          <van-icon name="logistics" size="32" color="#1989fa" class="service-icon" />
          <div class="service-title">快递代取</div>
          <div class="service-desc">快递包裹代收代取</div>
          <div class="service-price">¥5起</div>
        </div>
      </van-grid-item>

      <van-grid-item to="/pickup/food">
        <div class="service-content">
          <van-icon name="shop-o" size="32" color="#1989fa" class="service-icon" />
          <div class="service-title">外卖代取</div>
          <div class="service-desc">各类外卖代取服务</div>
          <div class="service-price">¥3起</div>
        </div>
      </van-grid-item>

      <van-grid-item to="/pickup/medicine">
        <div class="service-content">
          <van-icon name="medical-o" size="32" color="#1989fa" class="service-icon" />
          <div class="service-title">药品代购</div>
          <div class="service-desc">校医院药品代购</div>
          <div class="service-price">¥8起</div>
        </div>
      </van-grid-item>

      <van-grid-item to="/pickup/daily">
        <div class="service-content">
          <van-icon name="shopping-cart-o" size="32" color="#1989fa" class="service-icon" />
          <div class="service-title">生活用品代购</div>
          <div class="service-desc">日用品采购服务</div>
          <div class="service-price">¥10起</div>
        </div>
      </van-grid-item>
    </van-grid>

    <van-cell-group title="最新订单" class="recent-orders-section">
      <template #right-icon>
        <router-link to="/pickup" class="view-all">
          <van-icon name="arrow" />
        </router-link>
      </template>

      <!-- 加载状态 -->
      <van-loading v-if="pickupStore.loading" class="loading-container" />

      <!-- 订单列表 -->
      <div v-else-if="recentOrders.length > 0">
        <van-cell
          v-for="order in recentOrders"
          :key="order.id"
          @click="goToOrderDetail(order.id)"
          is-link
          class="order-cell"
        >
          <template #icon>
            <div class="order-type-icon">
              <van-icon :name="getOrderTypeIcon(order.type)" />
            </div>
          </template>

          <template #title>
            <div class="order-header">
              <span class="order-type">{{ getOrderTypeName(order.type) }}</span>
              <span class="order-price">¥{{ order.price }}</span>
            </div>
          </template>

          <template #label>
            <div class="order-details">
              <div class="order-desc">{{ order.description }}</div>
              <div class="order-meta">
                <span class="order-time">{{ formatTime(order.created_at) }}</span>
                <span class="order-location">{{ order.pickup_location }}</span>
              </div>
            </div>
          </template>

          <template #right-icon>
            <van-tag :type="getStatusTagType(order.status)" size="small">
              {{ getStatusText(order.status) }}
            </van-tag>
          </template>
        </van-cell>
      </div>

      <!-- 空状态 -->
      <van-empty v-else description="暂无代取订单" class="empty-orders">
        <template #image>
          <van-icon name="logistics" size="64" color="#dcdee0" />
        </template>
        <template #description>
          <div class="empty-desc">
            <p>暂无代取订单</p>
            <van-button type="primary" @click="createOrder">
              发布第一个订单
            </van-button>
          </div>
        </template>
      </van-empty>
    </van-cell-group>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePickupStore } from '@/stores/pickup'

const router = useRouter()
const pickupStore = usePickupStore()

const recentOrders = computed(() => {
  return pickupStore.orders.slice(0, 5)
})

function createOrder() {
  router.push('/pickup/create')
}

function goToOrderDetail(id) {
  router.push(`/pickup/${id}`)
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

// 组件挂载时获取最新订单
onMounted(() => {
  pickupStore.fetchOrders({ limit: 10 })
})
</script>

<style scoped>
.pickup-home {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.header-notice {
  margin: 16px;
}

.quick-actions {
  margin: 16px;
  background: white;
  border-radius: 8px;
  padding: 16px 0;
}

.action-text {
  font-size: 14px;
  color: #323233;
  margin-top: 8px;
  font-weight: 500;
}

.service-grid {
  margin: 16px;
  background: white;
  border-radius: 8px;
  padding: 16px 0;
}

.service-content {
  text-align: center;
  padding: 16px 8px;
}

.service-icon {
  margin-bottom: 8px;
}

.service-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.service-desc {
  font-size: 12px;
  color: #969799;
  margin-bottom: 8px;
}

.service-price {
  color: #ee0a24;
  font-weight: 600;
  font-size: 14px;
}

.recent-orders-section {
  margin: 16px;
}

.view-all {
  color: #1989fa;
  text-decoration: none;
  font-size: 14px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 120px;
}

.order-cell {
  padding: 12px 16px;
}

.order-type-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f9ff;
  color: #1989fa;
  margin-right: 12px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.order-type {
  font-weight: 500;
  color: #323233;
  font-size: 14px;
}

.order-price {
  font-weight: 600;
  color: #ee0a24;
  font-size: 14px;
}

.order-details {
  margin-top: 4px;
}

.order-desc {
  color: #646566;
  font-size: 12px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #969799;
}

.empty-orders {
  padding: 40px 20px;
}

.empty-desc {
  text-align: center;
}

.empty-desc p {
  color: #646566;
  margin-bottom: 16px;
  font-size: 14px;
}

:deep(.van-grid-item__content) {
  padding: 16px;
  background: white;
}

:deep(.van-cell-group__title) {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

:deep(.van-cell__label) {
  margin-top: 4px;
}
</style>
