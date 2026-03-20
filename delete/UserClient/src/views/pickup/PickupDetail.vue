<template>
  <div class="pickup-detail" v-if="currentOrder">
    <van-nav-bar
      :title="`订单详情 #${currentOrder.id}`"
      left-arrow
      @click-left="goBack"
    />

    <van-cell-group class="order-status-section">
      <van-cell>
        <template #title>
          <div class="status-header">
            <span class="order-type">{{ getOrderTypeName(currentOrder.type) }}</span>
            <van-tag :type="getStatusTagType(currentOrder.status)">
              {{ getStatusText(currentOrder.status) }}
            </van-tag>
          </div>
        </template>
        <template #label>
          <div class="order-description">{{ currentOrder.description }}</div>
        </template>
        <template #value>
          <div class="order-price">¥{{ currentOrder.price }}</div>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="地址信息">
      <van-cell title="取件地址" :value="currentOrder.pickup_location">
        <template #icon>
          <van-icon name="location-o" />
        </template>
      </van-cell>
      <van-cell title="送达地址" :value="currentOrder.delivery_location">
        <template #icon>
          <van-icon name="home-o" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="联系方式">
      <van-cell :value="currentOrder.contact_info">
        <template #icon>
          <van-icon name="phone-o" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group v-if="currentOrder.deadline" title="时间要求">
      <van-cell title="期望完成时间" :value="formatTime(currentOrder.deadline)">
        <template #icon>
          <van-icon name="clock-o" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group v-if="currentOrder.notes" title="特殊要求">
      <van-cell :value="currentOrder.notes">
        <template #icon>
          <van-icon name="notes-o" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="订单信息">
      <van-cell title="发布时间" :value="formatTime(currentOrder.created_at)">
        <template #icon>
          <van-icon name="clock-o" />
        </template>
      </van-cell>
      <van-cell v-if="currentOrder.updated_at" title="更新时间" :value="formatTime(currentOrder.updated_at)">
        <template #icon>
          <van-icon name="clock-o" />
        </template>
      </van-cell>
      <van-cell v-if="currentOrder.urgency !== 'normal'" title="紧急程度">
        <template #icon>
          <van-icon name="warning-o" />
        </template>
        <template #value>
          <van-tag :type="getUrgencyTagType(currentOrder.urgency)">
            {{ getUrgencyText(currentOrder.urgency) }}
          </van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <van-button
        v-if="currentOrder.status === 'pending' && !isMyOrder"
        type="primary"
        block
        size="large"
        :loading="pickupStore.loading"
        @click="handleAccept"
      >
        接受订单
      </van-button>

      <van-button
        v-if="currentOrder.status === 'accepted' && isDeliverer"
        type="warning"
        block
        size="large"
        :loading="pickupStore.loading"
        @click="handleStatusUpdate('picking')"
      >
        开始配送
      </van-button>

      <van-button
        v-if="currentOrder.status === 'picking' && isDeliverer"
        type="success"
        block
        size="large"
        :loading="pickupStore.loading"
        @click="handleStatusUpdate('completed')"
      >
        完成订单
      </van-button>

      <van-button
        v-if="canCancel"
        type="danger"
        block
        size="large"
        :loading="pickupStore.loading"
        @click="handleCancel"
      >
        取消订单
      </van-button>
    </div>
  </div>

  <van-loading v-else-if="pickupStore.loading" class="loading-container" />

  <van-empty v-else description="订单不存在或已被删除" class="error-state">
    <template #image>
      <van-icon name="warning-o" size="64" color="#dcdee0" />
    </template>
    <template #description>
      <div class="error-desc">
        <p>订单不存在或已被删除</p>
        <van-button type="primary" @click="goToOrderList">
          返回订单列表
        </van-button>
      </div>
    </template>
  </van-empty>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePickupStore } from '@/stores/pickup'
import { useUserStore } from '@/stores/user'
import { showConfirmDialog, showToast } from 'vant'

const route = useRoute()
const router = useRouter()
const pickupStore = usePickupStore()
const userStore = useUserStore()

const currentOrder = computed(() => pickupStore.currentOrder)

const isMyOrder = computed(() => {
  return currentOrder.value?.user_id === userStore.user?.id
})

const isDeliverer = computed(() => {
  return currentOrder.value?.deliverer_id === userStore.user?.id
})

const canCancel = computed(() => {
  if (!currentOrder.value) return false

  const status = currentOrder.value.status

  if (isMyOrder.value) {
    return status === 'pending' || status === 'accepted'
  }

  if (isDeliverer.value) {
    return status === 'accepted'
  }

  return false
})

function goBack() {
  router.go(-1)
}

function goToOrderList() {
  router.push('/pickup')
}

async function handleAccept() {
  try {
    await pickupStore.acceptOrder(route.params.id)
    showToast('接单成功')
  } catch (error) {
    console.error('接单失败:', error)
    showToast('接单失败，请重试')
  }
}

async function handleStatusUpdate(status) {
  try {
    await pickupStore.updateOrderStatus(route.params.id, { status })
    showToast('状态更新成功')
  } catch (error) {
    console.error('更新状态失败:', error)
    showToast('更新失败，请重试')
  }
}

async function handleCancel() {
  try {
    await showConfirmDialog({
      title: '确认取消',
      message: '确定要取消这个订单吗？'
    })
    await pickupStore.cancelOrder(route.params.id)
    showToast('订单已取消')
    router.push('/pickup')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消订单失败:', error)
      showToast('取消失败，请重试')
    }
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

function getUrgencyText(urgency) {
  const urgencyMap = {
    normal: '普通',
    urgent: '紧急',
    very_urgent: '非常紧急',
  }
  return urgencyMap[urgency] || urgency
}

function getUrgencyTagType(urgency) {
  const types = {
    normal: 'default',
    urgent: 'warning',
    very_urgent: 'danger',
  }
  return types[urgency] || 'default'
}

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  const orderId = route.params.id
  if (orderId) {
    pickupStore.fetchOrderDetail(orderId)
  }
})
</script>

<style scoped>
.pickup-detail {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.order-status-section {
  margin: 16px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.order-type {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.order-description {
  color: #646566;
  line-height: 1.6;
  margin-top: 8px;
}

.order-price {
  font-size: 18px;
  font-weight: 600;
  color: #ee0a24;
}

.action-buttons {
  padding: 16px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #ebedf0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.error-state {
  padding: 40px 20px;
}

.error-desc {
  text-align: center;
}

.error-desc p {
  color: #646566;
  margin-bottom: 16px;
  font-size: 14px;
}

:deep(.van-cell-group) {
  margin: 16px;
}

:deep(.van-cell-group__title) {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

:deep(.van-cell__title) {
  font-weight: 500;
}

:deep(.van-cell__value) {
  color: #646566;
  word-break: break-all;
}

:deep(.van-cell__icon) {
  color: #1989fa;
  margin-right: 8px;
}

/* 为底部按钮留出空间 */
.pickup-detail {
  padding-bottom: 80px;
}
</style>
