<template>
  <div class="express-pickup">
    <van-nav-bar title="快递代取服务" left-arrow @click-left="goBack">
      <template #subtitle>专业、快速、安全的快递代取服务</template>
    </van-nav-bar>

    <!-- 服务特点 -->
    <van-cell-group title="服务特点" class="features-section">
      <van-grid :column-num="3" :border="false">
        <van-grid-item>
          <div class="feature-item">
            <div class="feature-icon">
              <van-icon name="logistics" />
            </div>
            <div class="feature-name">快速配送</div>
            <div class="feature-desc">30分钟响应</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="feature-item">
            <div class="feature-icon">
              <van-icon name="shield-o" />
            </div>
            <div class="feature-name">安全可靠</div>
            <div class="feature-desc">实名认证</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="feature-item">
            <div class="feature-icon">
              <van-icon name="gold-coin-o" />
            </div>
            <div class="feature-name">价格透明</div>
            <div class="feature-desc">明码标价</div>
          </div>
        </van-grid-item>
      </van-grid>
    </van-cell-group>

    <!-- 快速下单 -->
    <van-form @submit="handleQuickOrder" class="order-form">
      <van-cell-group title="快速下单" class="form-section">
        <van-field
          v-model="companyText"
          name="company"
          label="快递公司"
          placeholder="请选择快递公司"
          readonly
          is-link
          @click="showCompanyPicker = true"
          required
          :rules="[{ required: true, message: '请选择快递公司' }]"
        />

        <van-field
          v-model="quickForm.pickupCode"
          name="pickupCode"
          label="取件码/手机号"
          placeholder="请输入取件码或手机号"
          required
          :rules="[{ required: true, message: '请输入取件码或手机号' }]"
        />

        <van-field
          v-model="locationText"
          name="location"
          label="取件地点"
          placeholder="请选择取件地点"
          readonly
          is-link
          @click="showLocationPicker = true"
          required
          :rules="[{ required: true, message: '请选择取件地点' }]"
        />

        <van-field
          v-model="quickForm.deliveryAddress"
          name="deliveryAddress"
          label="送达地址"
          placeholder="请输入宿舍楼栋和房间号"
          required
          :rules="[{ required: true, message: '请输入送达地址' }]"
        />

        <van-field
          v-model="quickForm.contact"
          name="contact"
          label="联系方式"
          placeholder="请输入手机号或微信号"
          required
          :rules="[{ required: true, message: '请输入联系方式' }]"
        />

        <van-field
          v-model="quickForm.price"
          name="price"
          label="配送费"
          type="digit"
          placeholder="3.00"
          required
          :rules="[{ required: true, message: '请输入配送费' }]"
        >
          <template #left-icon>
            <span class="price-symbol">¥</span>
          </template>
        </van-field>

        <van-field
          v-model="quickForm.notes"
          name="notes"
          label="备注信息"
          type="textarea"
          placeholder="如包裹较重、易碎等特殊要求请说明"
          rows="3"
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
          立即发布订单
        </van-button>
      </div>
    </van-form>

    <!-- 价格参考 -->
    <van-cell-group title="价格参考" class="pricing-section">
      <van-grid :column-num="2" :border="false">
        <van-grid-item>
          <div class="pricing-item">
            <div class="pricing-title">校内配送</div>
            <div class="pricing-value">¥2-3</div>
            <div class="pricing-desc">同楼栋或相邻楼栋</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="pricing-item">
            <div class="pricing-title">跨区配送</div>
            <div class="pricing-value">¥3-5</div>
            <div class="pricing-desc">不同校区或较远距离</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="pricing-item">
            <div class="pricing-title">大件包裹</div>
            <div class="pricing-value">¥5-8</div>
            <div class="pricing-desc">重量超过5kg或体积较大</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="pricing-item">
            <div class="pricing-title">紧急配送</div>
            <div class="pricing-value">¥8-12</div>
            <div class="pricing-desc">30分钟内完成配送</div>
          </div>
        </van-grid-item>
      </van-grid>
    </van-cell-group>

    <!-- 最近订单 -->
    <van-cell-group v-if="recentExpressOrders.length > 0" title="最近的快递代取订单" class="orders-section">
      <div class="orders-list">
        <van-card
          v-for="order in recentExpressOrders"
          :key="order.id"
          :title="order.description"
          :price="`¥${order.price}`"
          @click="goToOrderDetail(order.id)"
        >
          <template #thumb>
            <div class="order-icon">
              <van-icon name="logistics" />
            </div>
          </template>

          <template #tags>
            <van-tag :type="getStatusTagType(order.status)">
              {{ getStatusText(order.status) }}
            </van-tag>
          </template>

          <template #desc>
            <div class="order-info">
              <div class="info-row">
                <van-icon name="location-o" />
                <span>{{ order.pickup_location }}</span>
              </div>
              <div class="info-row">
                <van-icon name="home-o" />
                <span>{{ order.delivery_location }}</span>
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
    </van-cell-group>

    <!-- 常见问题 -->
    <van-collapse v-model="activeNames" accordion class="faq-section">
      <van-collapse-item title="如何确保包裹安全？" name="1">
        <div>所有配送员都经过实名认证，取件时需要验证取件码，全程可追踪配送状态。</div>
      </van-collapse-item>
      <van-collapse-item title="配送费用如何计算？" name="2">
        <div>根据配送距离、包裹大小、紧急程度等因素综合计算，价格透明无隐形收费。</div>
      </van-collapse-item>
      <van-collapse-item title="如果包裹丢失怎么办？" name="3">
        <div>平台提供包裹保险，如因配送员原因造成丢失，将全额赔偿。</div>
      </van-collapse-item>
    </van-collapse>

    <!-- 选择器弹窗 -->
    <!-- 快递公司选择器 -->
    <van-popup v-model:show="showCompanyPicker" position="bottom">
      <van-picker
        :columns="companyOptions"
        @confirm="onCompanyConfirm"
        @cancel="showCompanyPicker = false"
        title="选择快递公司"
      />
    </van-popup>

    <!-- 取件地点选择器 -->
    <van-popup v-model:show="showLocationPicker" position="bottom">
      <van-picker
        :columns="locationOptions"
        @confirm="onLocationConfirm"
        @cancel="showLocationPicker = false"
        title="选择取件地点"
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

const showCompanyPicker = ref(false)
const showLocationPicker = ref(false)
const activeNames = ref([])

const quickForm = ref({
  company: '',
  pickupCode: '',
  location: '',
  deliveryAddress: '',
  contact: '',
  price: 3,
  notes: '',
})

const companyOptions = [
  { text: '申通快递', value: 'shentong' },
  { text: '圆通快递', value: 'yuantong' },
  { text: '中通快递', value: 'zhongtong' },
  { text: '韵达快递', value: 'yunda' },
  { text: 'EMS', value: 'ems' },
  { text: '顺丰速运', value: 'sf' },
  { text: '京东快递', value: 'jd' },
  { text: '其他', value: 'other' },
]

const locationOptions = [
  { text: '菜鸟驿站(东门)', value: 'cainiao_east' },
  { text: '菜鸟驿站(西门)', value: 'cainiao_west' },
  { text: '菜鸟驿站(南门)', value: 'cainiao_south' },
  { text: '顺丰快递点', value: 'sf_express' },
  { text: '京东快递点', value: 'jd_express' },
  { text: '邮政快递点', value: 'ems_office' },
  { text: '其他地点', value: 'other' },
]

const companyText = computed(() => {
  const company = companyOptions.find(c => c.value === quickForm.value.company)
  return company ? company.text : ''
})

const locationText = computed(() => {
  const location = locationOptions.find(l => l.value === quickForm.value.location)
  return location ? location.text : ''
})

const recentExpressOrders = computed(() => {
  return pickupStore.myOrders.filter((order) => order.type === 'express').slice(0, 6)
})

function goBack() {
  router.push('/pickup')
}

function onCompanyConfirm({ selectedOptions }) {
  quickForm.value.company = selectedOptions[0].value
  showCompanyPicker.value = false
}

function onLocationConfirm({ selectedOptions }) {
  quickForm.value.location = selectedOptions[0].value
  showLocationPicker.value = false
}

async function handleQuickOrder() {
  const orderData = {
    type: 'express',
    description: `快递代取 - ${companyText.value} (取件码: ${quickForm.value.pickupCode})`,
    pickup_location: locationText.value,
    delivery_location: quickForm.value.deliveryAddress,
    contact_info: quickForm.value.contact,
    price: quickForm.value.price,
    notes: quickForm.value.notes,
    urgency: 'normal',
  }

  try {
    await pickupStore.createOrder(orderData)
    showToast('快递代取订单创建成功')
    router.push('/pickup/my')
  } catch (error) {
    console.error('创建快递代取订单失败:', error)
    showToast('创建订单失败，请重试')
  }
}

function goToOrderDetail(id) {
  router.push(`/pickup/${id}`)
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
  const date = new Date(time)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
  return date.toLocaleDateString()
}

onMounted(() => {
  pickupStore.fetchMyOrders()
})
</script>

<style scoped>
.express-pickup {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.features-section,
.form-section,
.pricing-section,
.orders-section {
  margin-bottom: 16px;
}

.feature-item {
  text-align: center;
  padding: 12px 8px;
}

.feature-icon {
  font-size: 24px;
  color: #1989fa;
  margin-bottom: 8px;
}

.feature-name {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.feature-desc {
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

.pricing-item {
  text-align: center;
  padding: 16px 8px;
}

.pricing-title {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 8px;
}

.pricing-value {
  font-size: 18px;
  font-weight: 600;
  color: #ee0a24;
  margin-bottom: 4px;
}

.pricing-desc {
  font-size: 11px;
  color: #969799;
}

.orders-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-icon {
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

.faq-section {
  margin: 16px;
}
</style>
