<template>
  <div class="medicine-pickup">
    <van-nav-bar title="药品代购服务" left-arrow @click-left="goBack">
      <template #subtitle>健康无小事，专业药品代购</template>
    </van-nav-bar>

    <!-- 安全提醒 -->
    <van-notice-bar
      type="warning"
      text="安全提醒：仅提供OTC非处方药品代购服务，处方药请本人凭处方到药店购买"
      background="#fff3cd"
      color="#856404"
      class="safety-notice"
    />

    <!-- 药品类型选择 -->
    <van-cell-group title="选择药品类型" class="types-section">
      <van-grid :column-num="2" :border="false">
        <van-grid-item
          v-for="type in medicineTypes"
          :key="type.value"
          @click="selectMedicineType(type.value)"
          :class="{ 'type-active': quickOrder.medicineType === type.value }"
        >
          <div class="type-item">
            <div class="type-icon">
              <van-icon :name="getMedicineTypeIcon(type.value)" />
            </div>
            <div class="type-name">{{ type.name }}</div>
            <div class="type-desc">{{ type.description }}</div>
          </div>
        </van-grid-item>
      </van-grid>
    </van-cell-group>

    <!-- 发布代购需求 -->
    <van-form @submit="createQuickOrder" class="order-form">
      <van-cell-group title="代购信息" class="form-section">
        <van-field
          v-model="medicineTypeText"
          name="medicineType"
          label="药品类型"
          placeholder="请选择药品类型"
          readonly
          is-link
          @click="showMedicineTypePicker = true"
          required
          :rules="[{ required: true, message: '请选择药品类型' }]"
        />

        <van-field
          v-model="quickOrder.description"
          name="description"
          label="药品名称/症状描述"
          type="textarea"
          placeholder="请详细描述需要的药品名称或症状，如：感冒灵颗粒、治疗头痛的药品等"
          rows="3"
          maxlength="200"
          show-word-limit
          required
          :rules="[{ required: true, message: '请输入药品描述' }]"
        />

        <van-field
          v-model="pharmacyText"
          name="pharmacy"
          label="购买药店"
          placeholder="请选择药店"
          readonly
          is-link
          @click="showPharmacyPicker = true"
        />

        <van-field
          v-model="quickOrder.budget"
          name="budget"
          label="预算金额"
          type="digit"
          placeholder="0.00"
          required
          :rules="[{ required: true, message: '请输入预算金额' }]"
        >
          <template #left-icon>
            <span class="price-symbol">¥</span>
          </template>
        </van-field>

        <van-field
          v-model="quickOrder.price"
          name="price"
          label="代购费"
          type="digit"
          placeholder="0.00"
          required
          :rules="[{ required: true, message: '请输入代购费' }]"
        >
          <template #left-icon>
            <span class="price-symbol">¥</span>
          </template>
        </van-field>

        <van-field
          v-model="quickOrder.delivery_location"
          name="delivery_location"
          label="送达地址"
          placeholder="请输入详细的收货地址"
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

        <van-field name="urgency" label="紧急程度">
          <template #input>
            <van-radio-group v-model="quickOrder.urgency" direction="horizontal">
              <van-radio
                v-for="urgency in urgencyOptions"
                :key="urgency.value"
                :name="urgency.value"
              >
                <div class="urgency-option">
                  <div class="urgency-label">{{ urgency.label }}</div>
                  <div class="urgency-desc">{{ urgency.description }}</div>
                </div>
              </van-radio>
            </van-radio-group>
          </template>
        </van-field>

        <van-field
          v-model="quickOrder.notes"
          name="notes"
          label="特殊要求"
          type="textarea"
          placeholder="如对药品品牌、规格有特殊要求等"
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
    <van-cell-group title="药品代购订单" class="order-section">
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
          :title="order.description"
          :price="`¥${order.price}`"
          @click="viewOrderDetail(order.id)"
        >
          <template #thumb>
            <div class="medicine-thumb">
              <van-icon name="medical-o" />
            </div>
          </template>

          <template #tags>
            <van-tag :type="getMedicineTypeTagType(order.medicineType)">
              {{ getMedicineTypeName(order.medicineType) }}
            </van-tag>
            <van-tag :type="getUrgencyTagType(order.urgency)">
              {{ getUrgencyText(order.urgency) }}
            </van-tag>
            <van-tag :type="getStatusTagType(order.status)">
              {{ getStatusText(order.status) }}
            </van-tag>
          </template>

          <template #desc>
            <div class="order-info">
              <div class="info-row">
                <van-icon name="gold-coin-o" />
                <span>预算：¥{{ order.budget }}</span>
              </div>
              <div class="info-row">
                <van-icon name="shop-o" />
                <span>药店：{{ getPharmacyName(order.pharmacy) }}</span>
              </div>
              <div class="info-row">
                <van-icon name="home-o" />
                <span>送达：{{ order.delivery_location }}</span>
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
      <van-empty v-else description="暂无药品代购订单">
        <template #image>
          <van-icon name="medical-o" size="64" color="#dcdee0" />
        </template>
      </van-empty>
    </van-cell-group>

    <!-- 选择器弹窗 -->
    <!-- 药品类型选择器 -->
    <van-popup v-model:show="showMedicineTypePicker" position="bottom">
      <van-picker
        :columns="medicineTypeOptions"
        @confirm="onMedicineTypeConfirm"
        @cancel="showMedicineTypePicker = false"
        title="选择药品类型"
      />
    </van-popup>

    <!-- 药店选择器 -->
    <van-popup v-model:show="showPharmacyPicker" position="bottom">
      <van-picker
        :columns="pharmacyOptions"
        @confirm="onPharmacyConfirm"
        @cancel="showPharmacyPicker = false"
        title="选择药店"
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
const showMedicineTypePicker = ref(false)
const showPharmacyPicker = ref(false)

const filters = [
  { label: '全部', value: 'all' },
  { label: '待接单', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '紧急', value: 'urgent' },
]

const medicineTypes = [
  { value: 'cold_flu', name: '感冒发烧', description: '感冒药、退烧药等' },
  { value: 'pain_relief', name: '疼痛缓解', description: '止痛药、消炎药等' },
  { value: 'digestive', name: '肠胃用药', description: '胃药、止泻药等' },
  { value: 'skin_care', name: '皮肤护理', description: '皮肤药膏、护理用品' },
  { value: 'vitamins', name: '保健品', description: '维生素、营养补充剂' },
  { value: 'other', name: '其他药品', description: '其他OTC药品' },
]

const urgencyOptions = [
  { value: 'normal', label: '普通', description: '1-2天内' },
  { value: 'urgent', label: '紧急', description: '当天送达' },
  { value: 'very_urgent', label: '非常紧急', description: '2小时内' },
]

const medicineTypeOptions = medicineTypes.map((type) => ({ text: type.name, value: type.value }))

const pharmacyOptions = [
  { text: '不指定（代购员选择）', value: '' },
  { text: '益丰大药房', value: 'yifeng' },
  { text: '大参林', value: 'dashenlin' },
  { text: '老百姓大药房', value: 'laobaixing' },
  { text: '同济堂', value: 'tongjitang' },
  { text: '其他药店', value: 'other' },
]

const quickOrder = ref({
  type: 'medicine',
  medicineType: '',
  description: '',
  pharmacy: '',
  budget: '',
  price: '',
  delivery_location: '',
  contact_info: '',
  urgency: 'normal',
  notes: '',
})

const medicineTypeText = computed(() => {
  const type = medicineTypes.find((t) => t.value === quickOrder.value.medicineType)
  return type ? type.name : ''
})

const pharmacyText = computed(() => {
  const pharmacy = pharmacyOptions.find((p) => p.value === quickOrder.value.pharmacy)
  return pharmacy ? pharmacy.text : ''
})

const filteredOrders = computed(() => {
  let orders = pickupStore.getOrdersByType('medicine')

  switch (currentFilter.value) {
    case 'pending':
      orders = orders.filter((order) => order.status === 'pending')
      break
    case 'in_progress':
      orders = orders.filter((order) =>
        ['accepted', 'purchasing', 'delivering'].includes(order.status),
      )
      break
    case 'urgent':
      orders = orders.filter((order) => ['urgent', 'very_urgent'].includes(order.urgency))
      break
  }

  return orders.sort((a, b) => {
    // 优先显示紧急订单
    if (a.urgency === 'very_urgent' && b.urgency !== 'very_urgent') return -1
    if (b.urgency === 'very_urgent' && a.urgency !== 'very_urgent') return 1
    if (a.urgency === 'urgent' && b.urgency === 'normal') return -1
    if (b.urgency === 'urgent' && a.urgency === 'normal') return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })
})

function goBack() {
  router.push('/pickup')
}

function selectMedicineType(type) {
  quickOrder.value.medicineType = type
}

function onMedicineTypeConfirm({ selectedOptions }) {
  quickOrder.value.medicineType = selectedOptions[0].value
  showMedicineTypePicker.value = false
}

function onPharmacyConfirm({ selectedOptions }) {
  quickOrder.value.pharmacy = selectedOptions[0].value
  showPharmacyPicker.value = false
}

function getMedicineTypeIcon(type) {
  const icons = {
    cold_flu: 'medical-o',
    pain_relief: 'medical-o',
    digestive: 'medical-o',
    skin_care: 'medical-o',
    vitamins: 'medical-o',
    other: 'medical-o',
  }
  return icons[type] || 'medical-o'
}

function getMedicineTypeName(type) {
  const medicineType = medicineTypes.find((t) => t.value === type)
  return medicineType ? medicineType.name : '药品代购'
}

function getMedicineTypeTagType(type) {
  const types = {
    cold_flu: 'primary',
    pain_relief: 'warning',
    digestive: 'success',
    skin_care: 'default',
    vitamins: 'primary',
    other: 'default',
  }
  return types[type] || 'default'
}

function getPharmacyName(pharmacy) {
  const pharmacyNames = {
    yifeng: '益丰大药房',
    dashenlin: '大参林',
    laobaixing: '老百姓大药房',
    tongjitang: '同济堂',
    other: '其他药店',
  }
  return pharmacyNames[pharmacy] || '不指定'
}

function getUrgencyText(urgency) {
  const urgencyTexts = {
    normal: '普通',
    urgent: '紧急',
    very_urgent: '非常紧急',
  }
  return urgencyTexts[urgency] || urgency
}

function getUrgencyTagType(urgency) {
  const types = {
    normal: 'default',
    urgent: 'warning',
    very_urgent: 'danger',
  }
  return types[urgency] || 'default'
}

function getStatusText(status) {
  const statusTexts = {
    pending: '待接单',
    accepted: '已接单',
    purchasing: '采购中',
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
    purchasing: 'warning',
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
    description: `${getMedicineTypeName(quickOrder.value.medicineType)} - ${quickOrder.value.description}`,
  }

  try {
    await pickupStore.createOrder(orderData)
    showToast('药品代购订单创建成功')

    // 重置表单
    quickOrder.value = {
      type: 'medicine',
      medicineType: '',
      description: '',
      pharmacy: '',
      budget: '',
      price: '',
      delivery_location: '',
      contact_info: '',
      urgency: 'normal',
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
    await pickupStore.fetchOrders({ type: 'medicine' })
  } catch (error) {
    console.error('获取订单列表失败:', error)
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.medicine-pickup {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.safety-notice {
  margin: 16px;
}

.types-section,
.form-section,
.order-section {
  margin-bottom: 16px;
}

.type-item {
  text-align: center;
  padding: 12px 8px;
}

.type-icon {
  font-size: 24px;
  color: #4caf50;
  margin-bottom: 8px;
}

.type-name {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.type-desc {
  font-size: 11px;
  color: #969799;
}

.type-active .type-item {
  background: #f0f9ff;
  border-radius: 8px;
}

.order-form {
  background: #f7f8fa;
}

.price-symbol {
  font-weight: 600;
  color: #1989fa;
}

.urgency-option {
  text-align: center;
}

.urgency-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.urgency-desc {
  font-size: 12px;
  color: #969799;
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

.medicine-thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  background: #4caf50;
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
