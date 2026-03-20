<template>
  <div class="daily-pickup">
    <van-nav-bar title="生活用品代购" left-arrow @click-left="goBack">
      <template #subtitle>生活所需，一站式代购服务</template>
    </van-nav-bar>

    <!-- 商品分类选择 -->
    <van-cell-group title="选择商品类别" class="category-section">
      <van-grid :column-num="2" :border="false">
        <van-grid-item
          v-for="category in categories"
          :key="category.value"
          @click="selectCategory(category.value)"
          :class="{ 'category-active': quickOrder.category === category.value }"
        >
          <div class="category-item">
            <div class="category-icon">
              <van-icon :name="getCategoryIcon(category.value)" />
            </div>
            <div class="category-name">{{ category.name }}</div>
            <div class="category-desc">{{ category.description }}</div>
          </div>
        </van-grid-item>
      </van-grid>
    </van-cell-group>

    <!-- 发布代购需求 -->
    <van-form @submit="createQuickOrder" class="order-form">
      <van-cell-group title="代购信息" class="form-section">
        <van-field
          v-model="categoryText"
          name="category"
          label="商品类别"
          placeholder="请选择商品类别"
          readonly
          is-link
          @click="showCategoryPicker = true"
          required
          :rules="[{ required: true, message: '请选择商品类别' }]"
        />

        <van-field
          v-model="storeText"
          name="store"
          label="购买地点"
          placeholder="请选择购买地点"
          readonly
          is-link
          @click="showStorePicker = true"
        />
      </van-cell-group>

      <!-- 商品清单 -->
      <van-cell-group title="商品清单" class="form-section">
        <div class="items-list">
          <van-card v-for="(item, index) in quickOrder.items" :key="index" class="item-card">
            <template #title>
              <van-field
                v-model="item.name"
                placeholder="商品名称"
                required
                :rules="[{ required: true, message: '请输入商品名称' }]"
              />
            </template>

            <template #desc>
              <van-row :gutter="8">
                <van-col span="12">
                  <van-field
                    v-model="item.specification"
                    placeholder="规格（如：500ml）"
                    size="small"
                  />
                </van-col>
                <van-col span="6">
                  <van-field
                    v-model.number="item.quantity"
                    type="digit"
                    placeholder="数量"
                    size="small"
                    :min="1"
                    required
                  />
                </van-col>
                <van-col span="6">
                  <van-field
                    v-model.number="item.price"
                    type="digit"
                    placeholder="预估价"
                    size="small"
                  />
                </van-col>
              </van-row>
            </template>

            <template #footer>
              <van-button
                v-if="quickOrder.items.length > 1"
                size="small"
                type="danger"
                @click="removeItem(index)"
              >
                删除
              </van-button>
            </template>
          </van-card>

          <van-button type="primary" plain icon="plus" block @click="addItem" class="add-item-btn">
            添加商品
          </van-button>
        </div>
      </van-cell-group>

      <!-- 价格信息 -->
      <van-cell-group title="价格信息" class="form-section">
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
      </van-cell-group>

      <!-- 配送信息 -->
      <van-cell-group title="配送信息" class="form-section">
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

        <van-field
          v-model="timelineText"
          name="timeline"
          label="期望完成时间"
          placeholder="请选择完成时间"
          readonly
          is-link
          @click="showTimelinePicker = true"
        />

        <van-field
          v-model="quickOrder.notes"
          name="notes"
          label="特殊要求"
          type="textarea"
          placeholder="如品牌偏好、质量要求、配送时间等"
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
          立即发布
        </van-button>
      </div>
    </van-form>

    <!-- 订单列表 -->
    <van-cell-group title="生活用品代购订单" class="order-section">
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
          :title="getOrderTitle(order)"
          :price="`¥${order.price}`"
          @click="viewOrderDetail(order.id)"
        >
          <template #thumb>
            <div class="order-category" :class="order.category">
              <van-icon :name="getCategoryIcon(order.category)" />
            </div>
          </template>

          <template #tags>
            <van-tag :type="getStatusTagType(order.status)">
              {{ getStatusText(order.status) }}
            </van-tag>
            <van-tag :type="getTimelineTagType(order.timeline)">
              {{ getTimelineText(order.timeline) }}
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
                <span>地点：{{ getStoreName(order.store) }}</span>
              </div>
              <div class="info-row">
                <van-icon name="location-o" />
                <span>送达：{{ order.delivery_location }}</span>
              </div>
            </div>

            <!-- 商品预览 -->
            <div v-if="order.items && order.items.length" class="items-preview">
              <van-space>
                <van-tag
                  v-for="(item, index) in order.items.slice(0, 3)"
                  :key="index"
                  size="mini"
                  plain
                >
                  {{ item.name }}{{ item.quantity > 1 ? ` ×${item.quantity}` : '' }}
                </van-tag>
                <van-tag v-if="order.items.length > 3" size="mini" type="warning">
                  等{{ order.items.length }}件商品
                </van-tag>
              </van-space>
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
      <van-empty v-else description="暂无生活用品代购订单">
        <template #image>
          <van-icon name="shopping-cart-o" size="64" color="#dcdee0" />
        </template>
      </van-empty>
    </van-cell-group>

    <!-- 选择器弹窗 -->
    <!-- 商品类别选择器 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom">
      <van-picker
        :columns="categoryOptions"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
        title="选择商品类别"
      />
    </van-popup>

    <!-- 购买地点选择器 -->
    <van-popup v-model:show="showStorePicker" position="bottom">
      <van-picker
        :columns="storeOptions"
        @confirm="onStoreConfirm"
        @cancel="showStorePicker = false"
        title="选择购买地点"
      />
    </van-popup>

    <!-- 完成时间选择器 -->
    <van-popup v-model:show="showTimelinePicker" position="bottom">
      <van-picker
        :columns="timelineOptions"
        @confirm="onTimelineConfirm"
        @cancel="showTimelinePicker = false"
        title="选择完成时间"
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
const showCategoryPicker = ref(false)
const showStorePicker = ref(false)
const showTimelinePicker = ref(false)

const filters = [
  { label: '全部', value: 'all' },
  { label: '待接单', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '今日', value: 'today' },
]

const categories = [
  { value: 'food', name: '食品饮料', description: '零食、饮料、调料等' },
  { value: 'personal_care', name: '个人护理', description: '洗发水、牙膏、化妆品' },
  { value: 'household', name: '日用百货', description: '洗衣液、纸巾、清洁用品' },
  { value: 'stationery', name: '文具用品', description: '笔、本子、办公用品' },
  { value: 'electronics', name: '数码配件', description: '充电器、耳机、数据线' },
  { value: 'clothing', name: '服装配饰', description: '衣服、鞋子、包包' },
  { value: 'books', name: '图书资料', description: '教材、小说、杂志' },
  { value: 'other', name: '其他商品', description: '其他生活用品' },
]

const categoryOptions = categories.map((cat) => ({ text: cat.name, value: cat.value }))

const storeOptions = [
  { text: '不指定（代购员选择）', value: '' },
  { text: '超市', value: 'supermarket' },
  { text: '便利店', value: 'convenience' },
  { text: '药店', value: 'pharmacy' },
  { text: '商场', value: 'mall' },
  { text: '市场', value: 'market' },
  { text: '网购代收', value: 'online' },
]

const timelineOptions = [
  { text: '今天内', value: 'today' },
  { text: '明天内', value: 'tomorrow' },
  { text: '本周末', value: 'weekend' },
  { text: '时间灵活', value: 'flexible' },
]

const quickOrder = ref({
  type: 'daily',
  category: '',
  store: '',
  items: [{ name: '', specification: '', quantity: 1, price: '' }],
  budget: '',
  price: '',
  delivery_location: '',
  contact_info: '',
  timeline: 'flexible',
  notes: '',
})

// 计算属性
const categoryText = computed(() => {
  const category = categories.find((cat) => cat.value === quickOrder.value.category)
  return category ? category.name : ''
})

const storeText = computed(() => {
  const store = storeOptions.find((s) => s.value === quickOrder.value.store)
  return store ? store.text : ''
})

const timelineText = computed(() => {
  const timeline = timelineOptions.find((t) => t.value === quickOrder.value.timeline)
  return timeline ? timeline.text : ''
})

const filteredOrders = computed(() => {
  let orders = pickupStore.getOrdersByType('daily')

  switch (currentFilter.value) {
    case 'pending':
      orders = orders.filter((order) => order.status === 'pending')
      break
    case 'in_progress':
      orders = orders.filter((order) =>
        ['accepted', 'shopping', 'delivering'].includes(order.status),
      )
      break
    case 'today':
      orders = orders.filter((order) => order.timeline === 'today')
      break
  }

  return orders.sort((a, b) => {
    if (a.timeline === 'today' && b.timeline !== 'today') return -1
    if (b.timeline === 'today' && a.timeline !== 'today') return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })
})

// 方法
function goBack() {
  router.push('/pickup')
}

function getCategoryIcon(category) {
  const icons = {
    food: 'cake-o',
    personal_care: 'bag-o',
    household: 'brush-o',
    stationery: 'edit',
    electronics: 'mobile',
    clothing: 'bag-o',
    books: 'todo-list-o',
    other: 'gift-o',
  }
  return icons[category] || 'gift-o'
}

function selectCategory(category) {
  quickOrder.value.category = category
}

function addItem() {
  quickOrder.value.items.push({ name: '', specification: '', quantity: 1, price: '' })
}

function removeItem(index) {
  quickOrder.value.items.splice(index, 1)
}

function getCategoryName(category) {
  const cat = categories.find((c) => c.value === category)
  return cat ? cat.name : '生活用品'
}

function getStoreName(store) {
  const storeNames = {
    supermarket: '超市',
    convenience: '便利店',
    pharmacy: '药店',
    mall: '商场',
    market: '市场',
    online: '网购代收',
  }
  return storeNames[store] || '不指定'
}

function getTimelineText(timeline) {
  const timelineTexts = {
    today: '今天',
    tomorrow: '明天',
    weekend: '周末',
    flexible: '灵活',
  }
  return timelineTexts[timeline] || timeline
}

function getTimelineTagType(timeline) {
  const types = {
    today: 'danger',
    tomorrow: 'warning',
    weekend: 'primary',
    flexible: 'default',
  }
  return types[timeline] || 'default'
}

function getStatusText(status) {
  const statusTexts = {
    pending: '待接单',
    accepted: '已接单',
    shopping: '采购中',
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
    shopping: 'warning',
    delivering: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'default'
}

function getOrderTitle(order) {
  if (order.items && order.items.length > 0) {
    const firstItem = order.items[0]
    if (order.items.length === 1) {
      return firstItem.name
    }
    return `${firstItem.name} 等${order.items.length}件商品`
  }
  return order.description || '生活用品代购'
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

// 选择器确认事件
function onCategoryConfirm({ selectedOptions }) {
  quickOrder.value.category = selectedOptions[0].value
  showCategoryPicker.value = false
}

function onStoreConfirm({ selectedOptions }) {
  quickOrder.value.store = selectedOptions[0].value
  showStorePicker.value = false
}

function onTimelineConfirm({ selectedOptions }) {
  quickOrder.value.timeline = selectedOptions[0].value
  showTimelinePicker.value = false
}

async function createQuickOrder() {
  const validItems = quickOrder.value.items.filter((item) => item.name.trim())

  if (validItems.length === 0) {
    showToast('请至少添加一个商品')
    return
  }

  const orderData = {
    ...quickOrder.value,
    items: validItems,
    description: getOrderTitle({ items: validItems }),
  }

  try {
    await pickupStore.createOrder(orderData)
    showToast('代购需求发布成功')

    // 重置表单
    quickOrder.value = {
      type: 'daily',
      category: '',
      store: '',
      items: [{ name: '', specification: '', quantity: 1, price: '' }],
      budget: '',
      price: '',
      delivery_location: '',
      contact_info: '',
      timeline: 'flexible',
      notes: '',
    }

    // 刷新订单列表
    await fetchOrders()
  } catch (error) {
    console.error('创建订单失败:', error)
    showToast('发布失败，请重试')
  }
}

function viewOrderDetail(orderId) {
  router.push(`/pickup/${orderId}`)
}

async function fetchOrders() {
  try {
    await pickupStore.fetchOrders({ type: 'daily' })
  } catch (error) {
    console.error('获取订单列表失败:', error)
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.daily-pickup {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.category-section,
.form-section,
.order-section {
  margin-bottom: 16px;
}

.category-item {
  text-align: center;
  padding: 12px 8px;
}

.category-icon {
  font-size: 24px;
  color: #1989fa;
  margin-bottom: 8px;
}

.category-name {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.category-desc {
  font-size: 11px;
  color: #969799;
}

.category-active .category-item {
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

.items-list {
  padding: 16px;
}

.item-card {
  margin-bottom: 12px;
  border-radius: 8px;
}

.add-item-btn {
  margin-top: 12px;
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

.order-category {
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

.items-preview {
  margin-top: 8px;
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
