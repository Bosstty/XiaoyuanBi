<template>
  <div class="food-pickup">
    <van-nav-bar title="外卖代取服务" left-arrow @click-left="goBack">
      <template #subtitle>让你的美食准时到达</template>
    </van-nav-bar>

    <!-- 服务介绍 -->
    <van-cell-group title="服务特色" class="intro-section">
      <van-grid :column-num="3" :border="false">
        <van-grid-item>
          <div class="intro-item">
            <div class="intro-icon">
              <van-icon name="logistics" />
            </div>
            <div class="intro-name">快速配送</div>
            <div class="intro-desc">热乎送达</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="intro-item">
            <div class="intro-icon">
              <van-icon name="gold-coin-o" />
            </div>
            <div class="intro-name">价格透明</div>
            <div class="intro-desc">明码标价</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="intro-item">
            <div class="intro-icon">
              <van-icon name="shield-o" />
            </div>
            <div class="intro-name">安全保障</div>
            <div class="intro-desc">实名认证</div>
          </div>
        </van-grid-item>
      </van-grid>
    </van-cell-group>

    <!-- 快速下单 -->
    <van-form @submit="createQuickOrder" class="order-form">
      <van-cell-group title="快速下单" class="form-section">
        <van-field
          v-model="platformText"
          name="platform"
          label="外卖平台"
          placeholder="请选择外卖平台"
          readonly
          is-link
          @click="showPlatformPicker = true"
          required
          :rules="[{ required: true, message: '请选择外卖平台' }]"
        />

        <van-field
          v-model="quickOrder.restaurant"
          name="restaurant"
          label="商家名称"
          placeholder="请输入商家名称"
          required
          :rules="[{ required: true, message: '请输入商家名称' }]"
        />

        <van-field
          v-model="quickOrder.orderNumber"
          name="orderNumber"
          label="订单号"
          placeholder="请输入外卖订单号"
        />

        <van-field
          v-model="quickOrder.pickup_location"
          name="pickup_location"
          label="取餐地址"
          placeholder="请输入商家地址或详细位置"
          required
          :rules="[{ required: true, message: '请输入取餐地址' }]"
        />

        <van-field
          v-model="quickOrder.delivery_location"
          name="delivery_location"
          label="送达地址"
          placeholder="请输入收餐地址"
          required
          :rules="[{ required: true, message: '请输入送达地址' }]"
        />

        <van-field
          v-model="quickOrder.contact_info"
          name="contact_info"
          label="联系方式"
          placeholder="请输入手机号或微信号"
          required
          :rules="[{ required: true, message: '请输入联系方式' }]"
        />

        <van-field
          v-model="quickOrder.price"
          name="price"
          label="配送费"
          type="digit"
          placeholder="0.00"
          required
          :rules="[{ required: true, message: '请输入配送费' }]"
        >
          <template #left-icon>
            <span class="price-symbol">¥</span>
          </template>
        </van-field>

        <van-field
          v-model="quickOrder.notes"
          name="notes"
          label="特殊要求"
          type="textarea"
          placeholder="如需要餐具、特殊配送要求等"
          rows="2"
          maxlength="200"
          show-word-limit
        />
      </van-cell-group>

      <!-- 错误信息 -->
      <van-notice-bar
        v-if="pickupStore.error"
        type="danger"
        :text="pickupStore.error"
        background="#fef0f0"
        color="#f56c6c"
      />

      <!-- 提交按钮 -->
      <div class="form-actions">
        <van-button
          type="primary"
          block
          size="large"
          native-type="submit"
          :loading="pickupStore.loading"
          loading-text="发布中..."
        >
          立即发布
        </van-button>
      </div>
    </van-form>

    <!-- 订单列表 -->
    <van-cell-group title="热门外卖代取订单" class="order-section">
      <template #right-icon>
        <van-tabs v-model:active="currentFilter" type="card" shrink>
          <van-tab
            v-for="filter in filters"
            :key="filter.value"
            :name="filter.value"
            :title="filter.label"
          />
        </van-tabs>
      </template>

      <!-- 加载状态 -->
      <van-loading v-if="pickupStore.loading" class="loading-container" />

      <!-- 订单列表 -->
      <div v-else-if="filteredOrders.length" class="orders-list">
        <van-card
          v-for="order in filteredOrders"
          :key="order.id"
          :title="order.restaurant || order.description"
          :price="`¥${order.price}`"
          @click="viewOrderDetail(order.id)"
        >
          <template #thumb>
            <div class="platform-thumb" :class="order.platform">
              <van-icon name="shop-o" />
            </div>
          </template>

          <template #tags>
            <van-tag :type="getPlatformTagType(order.platform)">
              {{ getPlatformName(order.platform) }}
            </van-tag>
            <van-tag :type="getStatusTagType(order.status)">
              {{ getStatusText(order.status) }}
            </van-tag>
          </template>

          <template #desc>
            <div class="order-info">
              <div class="info-row">
                <van-icon name="shop-o" />
                <span>取餐：{{ order.pickup_location }}</span>
              </div>
              <div class="info-row">
                <van-icon name="home-o" />
                <span>送达：{{ order.delivery_location }}</span>
              </div>
              <div v-if="order.orderNumber" class="info-row">
                <van-icon name="orders-o" />
                <span>订单号：{{ order.orderNumber }}</span>
              </div>
            </div>
          </template>

          <template #footer>
            <div class="order-footer">
              <span class="order-time">{{ formatTime(order.created_at) }}</span>
            </div>
          </template>
        </van-card>
      </div>

      <!-- 空状态 -->
      <van-empty v-else description="暂无外卖代取订单">
        <template #image>
          <van-icon name="shop-o" size="64" color="#dcdee0" />
        </template>
      </van-empty>
    </van-cell-group>

    <!-- 选择器弹窗 -->
    <!-- 外卖平台选择器 -->
    <van-popup v-model:show="showPlatformPicker" position="bottom">
      <van-picker
        :columns="platformOptions"
        @confirm="onPlatformConfirm"
        @cancel="showPlatformPicker = false"
        title="选择外卖平台"
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

const currentFilter = ref('all')
const showPlatformPicker = ref(false)

const filters = [
  { label: '全部', value: 'all' },
  { label: '待接单', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '高价订单', value: 'high_price' },
]

const quickOrder = ref({
  type: 'food',
  platform: '',
  restaurant: '',
  orderNumber: '',
  pickup_location: '',
  delivery_location: '',
  contact_info: '',
  price: '',
  notes: '',
})

const platformOptions = [
  { text: '美团外卖', value: 'meituan' },
  { text: '饿了么', value: 'eleme' },
  { text: '百度外卖', value: 'baidu' },
  { text: '其他平台', value: 'other' },
]

const platformText = computed(() => {
  const platform = platformOptions.find((p) => p.value === quickOrder.value.platform)
  return platform ? platform.text : ''
})

const filteredOrders = computed(() => {
  let orders = pickupStore.getOrdersByType('food')

  switch (currentFilter.value) {
    case 'pending':
      orders = orders.filter((order) => order.status === 'pending')
      break
    case 'in_progress':
      orders = orders.filter((order) =>
        ['accepted', 'picking_up', 'delivering'].includes(order.status),
      )
      break
    case 'high_price':
      orders = orders.filter((order) => order.price >= 10)
      break
  }

  return orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

function goBack() {
  router.push('/pickup')
}

function onPlatformConfirm({ selectedOptions }) {
  quickOrder.value.platform = selectedOptions[0].value
  showPlatformPicker.value = false
}

function getPlatformName(platform) {
  const platformNames = {
    meituan: '美团',
    eleme: '饿了么',
    baidu: '百度',
    other: '其他',
  }
  return platformNames[platform] || '外卖'
}

function getPlatformTagType(platform) {
  const types = {
    meituan: 'warning',
    eleme: 'primary',
    baidu: 'danger',
    other: 'default',
  }
  return types[platform] || 'default'
}

function getStatusText(status) {
  const statusTexts = {
    pending: '待接单',
    accepted: '已接单',
    picking_up: '取餐中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusTexts[status] || status
}

function getStatusTagType(status) {
  const types = {
    pending: 'primary',
    accepted: 'success',
    picking_up: 'warning',
    delivering: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'default'
}

function formatTime(timeString) {
  const date = new Date(timeString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
  return date.toLocaleDateString()
}

async function createQuickOrder() {
  const orderData = {
    ...quickOrder.value,
    description: `${quickOrder.value.platform ? getPlatformName(quickOrder.value.platform) + ' - ' : ''}${quickOrder.value.restaurant}${quickOrder.value.orderNumber ? ' (订单号: ' + quickOrder.value.orderNumber + ')' : ''}`,
  }

  try {
    await pickupStore.createOrder(orderData)
    showToast('外卖代取订单创建成功')

    // 重置表单
    quickOrder.value = {
      type: 'food',
      platform: '',
      restaurant: '',
      orderNumber: '',
      pickup_location: '',
      delivery_location: '',
      contact_info: '',
      price: '',
      notes: '',
    }

    // 刷新订单列表
    await fetchOrders()
  } catch (error) {
    console.error('创建订单失败:', error)
    showToast('创建订单失败，请重试')
  }
}

function viewOrderDetail(orderId) {
  router.push(`/pickup/${orderId}`)
}

async function fetchOrders() {
  try {
    await pickupStore.fetchOrders({ type: 'food' })
  } catch (error) {
    console.error('获取订单列表失败:', error)
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.food-pickup {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.intro-section,
.form-section,
.order-section {
  margin-bottom: 16px;
}

.intro-item {
  text-align: center;
  padding: 12px 8px;
}

.intro-icon {
  font-size: 24px;
  color: #1989fa;
  margin-bottom: 8px;
}

.intro-name {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.intro-desc {
  font-size: 11px;
  color: #969799;
}

.order-form {
  background: #f7f8fa;
}

.price-symbol {
  font-weight: 600;
  color: #1989fa;
}

.form-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px;
  border-top: 1px solid #ebedf0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

/* 为底部按钮留出空间 */
.order-form {
  padding-bottom: 80px;
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

.platform-thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.platform-thumb.meituan {
  background: #ffd100;
  color: #333;
}

.platform-thumb.eleme {
  background: #0066ff;
}

.platform-thumb.baidu {
  background: #ff4757;
}

.platform-thumb.other {
  background: #999;
}

.order-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
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
</style>
