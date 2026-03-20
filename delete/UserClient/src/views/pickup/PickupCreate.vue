<template>
  <div class="pickup-create">
    <van-nav-bar title="发布代取订单" left-arrow @click-left="goBack">
      <template #subtitle>填写详细信息，让配送员更好地为您服务</template>
    </van-nav-bar>

    <van-form @submit="handleSubmit" class="create-form">
      <!-- 基本信息 -->
      <van-cell-group title="基本信息">
        <van-field
          v-model="typeText"
          name="type"
          label="服务类型"
          placeholder="请选择服务类型"
          readonly
          is-link
          @click="showTypePicker = true"
          required
          :rules="[{ required: true, message: '请选择服务类型' }]"
        />

        <van-field
          v-model="orderForm.description"
          name="description"
          label="详细描述"
          type="textarea"
          placeholder="请详细描述需要代取的物品、注意事项等"
          rows="4"
          maxlength="500"
          show-word-limit
          required
          :rules="[{ required: true, message: '请输入详细描述' }]"
        />
      </van-cell-group>

      <!-- 地址信息 -->
      <van-cell-group title="地址信息">
        <van-field
          v-model="orderForm.pickup_location"
          name="pickup_location"
          label="取件地址"
          placeholder="请输入取件地址"
          required
          :rules="[{ required: true, message: '请输入取件地址' }]"
        >
          <template #left-icon>
            <van-icon name="location-o" />
          </template>
        </van-field>

        <van-field
          v-model="orderForm.delivery_location"
          name="delivery_location"
          label="送达地址"
          placeholder="请输入送达地址"
          required
          :rules="[{ required: true, message: '请输入送达地址' }]"
        >
          <template #left-icon>
            <van-icon name="home-o" />
          </template>
        </van-field>

        <van-field
          v-model="orderForm.contact_info"
          name="contact_info"
          label="联系方式"
          placeholder="请输入手机号或微信号"
          required
          :rules="[{ required: true, message: '请输入联系方式' }]"
        >
          <template #left-icon>
            <van-icon name="phone-o" />
          </template>
        </van-field>
      </van-cell-group>

      <!-- 价格与时间 -->
      <van-cell-group title="价格与时间">
        <van-field
          v-model="orderForm.price"
          name="price"
          label="报酬金额"
          type="digit"
          placeholder="0.00"
          required
          :rules="[{ required: true, message: '请输入报酬金额' }]"
        >
          <template #left-icon>
            <span class="price-symbol">¥</span>
          </template>
        </van-field>

        <van-field
          v-model="urgencyText"
          name="urgency"
          label="紧急程度"
          placeholder="请选择紧急程度"
          readonly
          is-link
          @click="showUrgencyPicker = true"
        >
          <template #left-icon>
            <van-icon name="warning-o" />
          </template>
        </van-field>

        <van-field
          v-model="orderForm.deadline"
          name="deadline"
          label="期望完成时间"
          readonly
          is-link
          @click="showDateTimePicker = true"
          placeholder="请选择期望完成时间"
        >
          <template #left-icon>
            <van-icon name="clock-o" />
          </template>
        </van-field>
      </van-cell-group>

      <!-- 备注信息 -->
      <van-cell-group title="备注信息">
        <van-field
          v-model="orderForm.notes"
          name="notes"
          label="特殊要求"
          type="textarea"
          placeholder="如有特殊要求或注意事项，请在此说明"
          rows="3"
          maxlength="200"
          show-word-limit
        >
          <template #left-icon>
            <van-icon name="notes-o" />
          </template>
        </van-field>
      </van-cell-group>

      <!-- 错误信息 -->
      <van-notice-bar
        v-if="pickupStore.error"
        type="danger"
        :text="pickupStore.error"
        background="#fef0f0"
        color="#f56c6c"
        class="error-notice"
      />

      <!-- 提交按钮 -->
      <div class="form-actions">
        <van-button
          type="default"
          size="large"
          @click="goBack"
          class="cancel-btn"
        >
          取消
        </van-button>
        <van-button
          type="primary"
          size="large"
          native-type="submit"
          :loading="pickupStore.loading"
          loading-text="发布中..."
          :disabled="!isFormValid"
          class="submit-btn"
        >
          发布订单
        </van-button>
      </div>
    </van-form>

    <!-- 类型选择器 -->
    <van-popup v-model:show="showTypePicker" position="bottom">
      <van-picker
        :columns="typeOptions"
        @confirm="onTypeConfirm"
        @cancel="showTypePicker = false"
        title="选择服务类型"
      />
    </van-popup>

    <!-- 紧急程度选择器 -->
    <van-popup v-model:show="showUrgencyPicker" position="bottom">
      <van-picker
        :columns="urgencyOptions"
        @confirm="onUrgencyConfirm"
        @cancel="showUrgencyPicker = false"
        title="选择紧急程度"
      />
    </van-popup>

    <!-- 时间选择器 -->
    <van-popup v-model:show="showDateTimePicker" position="bottom">
      <van-datetime-picker
        v-model="currentDate"
        type="datetime"
        title="选择时间"
        :min-date="minDate"
        @confirm="onDateTimeConfirm"
        @cancel="showDateTimePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePickupStore } from '@/stores/pickup'
import { showToast } from 'vant'

const router = useRouter()
const pickupStore = usePickupStore()

const showTypePicker = ref(false)
const showUrgencyPicker = ref(false)
const showDateTimePicker = ref(false)
const currentDate = ref(new Date())
const minDate = ref(new Date())

const orderForm = ref({
  type: '',
  description: '',
  pickup_location: '',
  delivery_location: '',
  contact_info: '',
  price: '',
  urgency: 'normal',
  deadline: '',
  notes: '',
})

const typeOptions = [
  { text: '快递代取', value: 'express' },
  { text: '外卖代取', value: 'food' },
  { text: '药品代购', value: 'medicine' },
  { text: '生活用品代购', value: 'daily' }
]

const urgencyOptions = [
  { text: '普通', value: 'normal' },
  { text: '紧急', value: 'urgent' },
  { text: '非常紧急', value: 'very_urgent' }
]

const typeText = computed(() => {
  const type = typeOptions.find(t => t.value === orderForm.value.type)
  return type ? type.text : ''
})

const urgencyText = computed(() => {
  const urgency = urgencyOptions.find(u => u.value === orderForm.value.urgency)
  return urgency ? urgency.text : ''
})

const isFormValid = computed(() => {
  return (
    orderForm.value.type &&
    orderForm.value.description &&
    orderForm.value.pickup_location &&
    orderForm.value.delivery_location &&
    orderForm.value.contact_info &&
    orderForm.value.price > 0
  )
})

function goBack() {
  router.go(-1)
}

function onTypeConfirm({ selectedOptions }) {
  orderForm.value.type = selectedOptions[0].value
  showTypePicker.value = false
}

function onUrgencyConfirm({ selectedOptions }) {
  orderForm.value.urgency = selectedOptions[0].value
  showUrgencyPicker.value = false
}

function onDateTimeConfirm(value) {
  orderForm.value.deadline = value.toISOString().slice(0, 16)
  showDateTimePicker.value = false
}

async function handleSubmit() {
  if (!isFormValid.value) return

  try {
    await pickupStore.createOrder(orderForm.value)
    showToast('订单创建成功')
    router.push('/pickup/my')
  } catch (error) {
    console.error('创建订单失败:', error)
    showToast('创建订单失败，请重试')
  }
}
</script>

<style scoped>
.pickup-create {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.create-form {
  padding-bottom: 80px;
}

.price-symbol {
  font-weight: 600;
  color: #1989fa;
}

.error-notice {
  margin: 16px;
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
  display: flex;
  gap: 12px;
}

.cancel-btn {
  flex: 1;
}

.submit-btn {
  flex: 2;
}

:deep(.van-cell-group) {
  margin: 16px;
}

:deep(.van-cell-group__title) {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

:deep(.van-field__label) {
  font-weight: 500;
  color: #323233;
}

:deep(.van-field__left-icon) {
  color: #1989fa;
  margin-right: 8px;
}

:deep(.van-nav-bar__subtitle) {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}
</style>
