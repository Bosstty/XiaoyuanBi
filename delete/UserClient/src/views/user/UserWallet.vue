<template>
  <div class="user-wallet">
    <van-nav-bar title="我的钱包" left-arrow @click-left="goBack" />

    <!-- 余额概览 -->
    <div class="balance-overview">
      <div class="balance-card">
        <div class="balance-info">
          <div class="balance-label">总余额</div>
          <div class="balance-amount">¥{{ userWallet.balance || '0.00' }}</div>
        </div>
        <div class="balance-actions">
          <van-button type="primary" size="small" @click="showRechargeDialog = true">
            <van-icon name="credit-card" />
            充值
          </van-button>
          <van-button size="small" @click="showWithdrawDialog = true">
            <van-icon name="balance-o" />
            提现
          </van-button>
        </div>
      </div>

      <van-grid :column-num="3" :border="false" class="balance-stats">
        <van-grid-item>
          <div class="stat-item income">
            <div class="stat-label">本月收入</div>
            <div class="stat-value">+¥{{ monthlyStats.income || '0.00' }}</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="stat-item expense">
            <div class="stat-label">本月支出</div>
            <div class="stat-value">-¥{{ monthlyStats.expense || '0.00' }}</div>
          </div>
        </van-grid-item>
        <van-grid-item>
          <div class="stat-item frozen">
            <div class="stat-label">冻结金额</div>
            <div class="stat-value">¥{{ userWallet.frozen_amount || '0.00' }}</div>
          </div>
        </van-grid-item>
      </van-grid>
    </div>

    <!-- 交易记录 -->
    <div class="transaction-section">
      <div class="section-header">
        <h3>交易记录</h3>
        <van-button type="primary" size="small" @click="showFilter = true">
          <van-icon name="filter-o" />
          筛选
        </van-button>
      </div>

      <div v-if="loading" class="loading-container">
        <van-loading size="40px" />
        <p>加载中...</p>
      </div>

      <div v-else-if="filteredTransactions.length === 0" class="empty-state">
        <van-empty description="暂无交易记录">
          <template #image>
            <van-icon name="balance-list-o" size="64" color="#ddd" />
          </template>
        </van-empty>
      </div>

      <div v-else class="transactions-list">
        <van-cell-group>
          <van-cell
            v-for="transaction in filteredTransactions"
            :key="transaction.id"
            :title="getTransactionTitle(transaction)"
            :label="transaction.description"
            :value="`${getAmountPrefix(transaction.type)}¥${transaction.amount}`"
            :value-class="getAmountClass(transaction.type)"
          >
            <template #icon>
              <div class="transaction-icon" :class="getTransactionIconClass(transaction.type)">
                <van-icon :name="getTransactionIcon(transaction.type)" />
              </div>
            </template>
            <template #right-icon>
              <div class="transaction-time">{{ formatTime(transaction.created_at) }}</div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 分页 -->
      <van-pagination
        v-if="transactions.length > 0"
        v-model="currentPage"
        :total-items="totalTransactions"
        :items-per-page="pageSize"
        :show-page-size="3"
        @change="handleCurrentChange"
        class="pagination"
      />
    </div>

    <!-- 筛选弹窗 -->
    <van-popup v-model:show="showFilter" position="bottom" :style="{ height: '50%' }">
      <div class="filter-container">
        <div class="filter-header">
          <van-button type="primary" text @click="showFilter = false">取消</van-button>
          <span class="filter-title">筛选条件</span>
          <van-button type="primary" text @click="applyFilters">确定</van-button>
        </div>

        <div class="filter-content">
          <van-form label-width="80px">
            <van-field
              name="type"
              label="交易类型"
              placeholder="请选择交易类型"
              :model-value="getTypeText(filterType)"
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

    <!-- 类型选择器 -->
    <van-popup v-model:show="showTypePicker" position="bottom">
      <van-picker
        :columns="typeOptions"
        @confirm="onTypeConfirm"
        @cancel="showTypePicker = false"
        title="选择交易类型"
      />
    </van-popup>

    <!-- 日历选择器 -->
    <van-calendar
      v-model:show="showCalendar"
      type="range"
      @confirm="onDateConfirm"
      title="选择日期范围"
    />

    <!-- 充值弹窗 -->
    <van-popup
      v-model:show="showRechargeDialog"
      position="center"
      :style="{ width: '90%', maxWidth: '400px' }"
    >
      <div class="dialog-container">
        <div class="dialog-header">
          <h3>账户充值</h3>
          <van-icon name="cross" @click="showRechargeDialog = false" />
        </div>

        <div class="dialog-content">
          <van-form label-width="80px">
            <van-field
              v-model="rechargeForm.amount"
              name="amount"
              label="充值金额"
              type="number"
              placeholder="请输入充值金额"
              :min="0.01"
              :step="0.01"
            >
              <template #left-icon>
                <span style="color: #969799">¥</span>
              </template>
            </van-field>

            <van-field name="payment_method" label="支付方式">
              <template #input>
                <van-radio-group v-model="rechargeForm.payment_method" direction="horizontal">
                  <van-radio name="alipay">支付宝</van-radio>
                  <van-radio name="wechat">微信支付</van-radio>
                  <van-radio name="card">银行卡</van-radio>
                </van-radio-group>
              </template>
            </van-field>
          </van-form>
        </div>

        <div class="dialog-footer">
          <van-button @click="showRechargeDialog = false">取消</van-button>
          <van-button type="primary" @click="handleRecharge" :loading="recharging">
            确认充值
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 提现弹窗 -->
    <van-popup
      v-model:show="showWithdrawDialog"
      position="center"
      :style="{ width: '90%', maxWidth: '400px' }"
    >
      <div class="dialog-container">
        <div class="dialog-header">
          <h3>申请提现</h3>
          <van-icon name="cross" @click="showWithdrawDialog = false" />
        </div>

        <div class="dialog-content">
          <van-form label-width="80px">
            <van-field
              v-model="withdrawForm.amount"
              name="amount"
              label="提现金额"
              type="number"
              placeholder="请输入提现金额"
              :max="userWallet.balance"
              :min="0.01"
              :step="0.01"
            >
              <template #left-icon>
                <span style="color: #969799">¥</span>
              </template>
            </van-field>
            <div class="form-tip">可提现余额：¥{{ userWallet.balance }}</div>

            <van-field name="withdraw_method" label="提现方式">
              <template #input>
                <van-radio-group v-model="withdrawForm.withdraw_method" direction="horizontal">
                  <van-radio name="alipay">支付宝</van-radio>
                  <van-radio name="wechat">微信</van-radio>
                  <van-radio name="bank">银行卡</van-radio>
                </van-radio-group>
              </template>
            </van-field>

            <van-field
              v-model="withdrawForm.account_info"
              name="account_info"
              label="账户信息"
              placeholder="请输入收款账户信息"
            />
          </van-form>
        </div>

        <div class="dialog-footer">
          <van-button @click="showWithdrawDialog = false">取消</van-button>
          <van-button type="primary" @click="handleWithdraw" :loading="withdrawing">
            申请提现
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'

const router = useRouter()

// 模拟数据
const userWallet = ref({
  balance: 1234.56,
  frozen_amount: 50.0,
})

const monthlyStats = ref({
  income: 456.78,
  expense: 123.45,
})

const transactions = ref([
  {
    id: 1,
    type: 'income',
    amount: 50.0,
    description: '任务完成收入',
    title: '设计LOGO',
    created_at: '2024-01-15 14:30:00',
  },
  {
    id: 2,
    type: 'expense',
    amount: 25.0,
    description: '代取服务支出',
    title: '快递代取',
    created_at: '2024-01-14 10:20:00',
  },
  {
    id: 3,
    type: 'recharge',
    amount: 100.0,
    description: '支付宝充值',
    title: '账户充值',
    created_at: '2024-01-13 16:45:00',
  },
])

const loading = ref(false)
const showRechargeDialog = ref(false)
const showWithdrawDialog = ref(false)
const showFilter = ref(false)
const showTypePicker = ref(false)
const showCalendar = ref(false)
const recharging = ref(false)
const withdrawing = ref(false)

const filterType = ref('')
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

const rechargeForm = ref({
  amount: '',
  payment_method: 'alipay',
})

const withdrawForm = ref({
  amount: '',
  withdraw_method: 'alipay',
  account_info: '',
})

// 选择器选项
const typeOptions = [
  { text: '全部', value: '' },
  { text: '充值', value: 'recharge' },
  { text: '提现', value: 'withdraw' },
  { text: '收入', value: 'income' },
  { text: '支出', value: 'expense' },
]

const filteredTransactions = computed(() => {
  let filtered = transactions.value

  if (filterType.value) {
    filtered = filtered.filter((t) => t.type === filterType.value)
  }

  if (dateRange.value && dateRange.value.length === 2) {
    const [startDate, endDate] = dateRange.value
    filtered = filtered.filter((t) => {
      const transactionDate = t.created_at.split(' ')[0]
      return transactionDate >= startDate && transactionDate <= endDate
    })
  }

  return filtered
})

const totalTransactions = computed(() => filteredTransactions.value.length)

function goBack() {
  router.go(-1)
}

function getTransactionIcon(type) {
  const icons = {
    income: 'arrow-down',
    expense: 'arrow-up',
    recharge: 'plus',
    withdraw: 'minus',
  }
  return icons[type] || 'arrow-up'
}

function getTransactionIconClass(type) {
  const classes = {
    income: 'income-icon',
    expense: 'expense-icon',
    recharge: 'recharge-icon',
    withdraw: 'withdraw-icon',
  }
  return classes[type] || ''
}

function getTransactionTitle(transaction) {
  return transaction.title || getDefaultTitle(transaction.type)
}

function getDefaultTitle(type) {
  const titles = {
    income: '收入',
    expense: '支出',
    recharge: '充值',
    withdraw: '提现',
  }
  return titles[type] || '交易'
}

function getAmountClass(type) {
  return type === 'income' || type === 'recharge' ? 'amount-positive' : 'amount-negative'
}

function getAmountPrefix(type) {
  return type === 'income' || type === 'recharge' ? '+' : '-'
}

function getTypeText(type) {
  const texts = {
    recharge: '充值',
    withdraw: '提现',
    income: '收入',
    expense: '支出',
    '': '全部',
  }
  return texts[type] || type
}

function getDateRangeText() {
  if (dateRange.value && dateRange.value.length === 2) {
    return `${dateRange.value[0]} - ${dateRange.value[1]}`
  }
  return '请选择日期范围'
}

function formatTime(time) {
  return new Date(time).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleCurrentChange(newPage) {
  currentPage.value = newPage
}

function onTypeConfirm({ selectedOptions }) {
  filterType.value = selectedOptions[0].value
  showTypePicker.value = false
}

function onDateConfirm(values) {
  dateRange.value = [
    new Date(values[0]).toISOString().split('T')[0],
    new Date(values[1]).toISOString().split('T')[0],
  ]
  showCalendar.value = false
}

function applyFilters() {
  currentPage.value = 1
  showFilter.value = false
}

async function handleRecharge() {
  if (!rechargeForm.value.amount || rechargeForm.value.amount <= 0) {
    showToast('请输入正确的充值金额')
    return
  }

  recharging.value = true
  try {
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    userWallet.value.balance += parseFloat(rechargeForm.value.amount)
    transactions.value.unshift({
      id: Date.now(),
      type: 'recharge',
      amount: parseFloat(rechargeForm.value.amount),
      description: `${rechargeForm.value.payment_method === 'alipay' ? '支付宝' : rechargeForm.value.payment_method === 'wechat' ? '微信' : '银行卡'}充值`,
      title: '账户充值',
      created_at: new Date().toISOString().replace('T', ' ').split('.')[0],
    })

    showToast('充值成功')
    showRechargeDialog.value = false
    rechargeForm.value.amount = ''
  } catch (error) {
    showToast('充值失败，请重试')
  } finally {
    recharging.value = false
  }
}

async function handleWithdraw() {
  if (!withdrawForm.value.amount || withdrawForm.value.amount <= 0) {
    showToast('请输入正确的提现金额')
    return
  }

  if (parseFloat(withdrawForm.value.amount) > userWallet.value.balance) {
    showToast('提现金额不能超过可用余额')
    return
  }

  if (!withdrawForm.value.account_info) {
    showToast('请输入收款账户信息')
    return
  }

  withdrawing.value = true
  try {
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    userWallet.value.balance -= parseFloat(withdrawForm.value.amount)
    transactions.value.unshift({
      id: Date.now(),
      type: 'withdraw',
      amount: parseFloat(withdrawForm.value.amount),
      description: `提现至${withdrawForm.value.withdraw_method === 'alipay' ? '支付宝' : withdrawForm.value.withdraw_method === 'wechat' ? '微信' : '银行卡'}`,
      title: '申请提现',
      created_at: new Date().toISOString().replace('T', ' ').split('.')[0],
    })

    showToast('提现申请已提交，预计1-3个工作日到账')
    showWithdrawDialog.value = false
    withdrawForm.value = {
      amount: '',
      withdraw_method: 'alipay',
      account_info: '',
    }
  } catch (error) {
    showToast('提现申请失败，请重试')
  } finally {
    withdrawing.value = false
  }
}

onMounted(() => {
  // 初始化数据加载
})
</script>

<style scoped>
.user-wallet {
  background: #f7f8fa;
  min-height: 100vh;
}

.balance-overview {
  padding: 16px;
}

.balance-card {
  background: #1989fa;
  color: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.balance-info .balance-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.balance-info .balance-amount {
  font-size: 28px;
  font-weight: 600;
}

.balance-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.balance-stats {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.stat-item {
  text-align: center;
  padding: 16px 0;
}

.stat-label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
}

.stat-item.income .stat-value {
  color: #07c160;
}

.stat-item.expense .stat-value {
  color: #ee0a24;
}

.stat-item.frozen .stat-value {
  color: #ff976a;
}

.transaction-section {
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
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

.transactions-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.transaction-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-right: 12px;
}

.transaction-icon.income-icon {
  background: #f0f9ff;
  color: #07c160;
}

.transaction-icon.expense-icon {
  background: #fef0f0;
  color: #ee0a24;
}

.transaction-icon.recharge-icon {
  background: #f0f9ff;
  color: #1989fa;
}

.transaction-icon.withdraw-icon {
  background: #fdf6ec;
  color: #ff976a;
}

.transaction-time {
  font-size: 12px;
  color: #c8c9cc;
}

.amount-positive {
  color: #07c160;
  font-weight: 600;
}

.amount-negative {
  color: #ee0a24;
  font-weight: 600;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
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

.dialog-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.dialog-header h3 {
  margin: 0;
  color: #323233;
  font-size: 16px;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.dialog-footer .van-button {
  flex: 1;
}

.form-tip {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
  padding-left: 80px;
}
</style>
