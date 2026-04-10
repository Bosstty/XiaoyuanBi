<template>
  <div class="finance-page">
    <div class="page-header">
      <div>
        <h2>财务中心</h2>
        <p>统一查看系统账户余额、平台抽成流水和配送员欠款台账。</p>
      </div>
      <el-button type="primary" @click="loadAll">刷新数据</el-button>
    </div>

    <el-row :gutter="16" class="summary-grid">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">系统账户余额</div>
          <div class="summary-value">¥{{ formatMoney(systemOverview.account.balance) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">累计收入</div>
          <div class="summary-value">¥{{ formatMoney(systemOverview.account.total_income) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">累计支出</div>
          <div class="summary-value">¥{{ formatMoney(systemOverview.account.total_expense) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">待回收欠款</div>
          <div class="summary-value">¥{{ formatMoney(systemOverview.debt_summary.active_amount) }}</div>
          <div class="summary-foot">{{ systemOverview.debt_summary.active_count }} 条进行中</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :xl="14">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-head">
              <span>配送员欠款台账</span>
              <el-tag type="danger" effect="dark">
                活跃欠款 {{ activeDebtSummaryText }}
              </el-tag>
            </div>
          </template>

          <div class="toolbar">
            <el-input
              v-model="debtFilters.keyword"
              placeholder="搜索姓名、手机号、订单号"
              clearable
              style="width: 240px"
              @keyup.enter="loadDebts"
            />
            <el-select v-model="debtFilters.status" clearable placeholder="欠款状态" style="width: 140px">
              <el-option label="全部" value="" />
              <el-option label="进行中" value="active" />
              <el-option label="部分偿还" value="partial" />
              <el-option label="已结清" value="cleared" />
            </el-select>
            <el-button @click="loadDebts">查询</el-button>
          </div>

          <el-table :data="debts" stripe v-loading="loading.debts">
            <el-table-column prop="id" label="ID" width="72" />
            <el-table-column label="配送员" min-width="180">
              <template #default="{ row }">
                <div class="person-cell">
                  <strong>{{ row.user?.real_name || row.user?.username || '--' }}</strong>
                  <span>{{ row.user?.phone || '--' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="关联订单" min-width="180">
              <template #default="{ row }">
                <div class="order-cell">
                  <strong>{{ row.order?.order_no || '--' }}</strong>
                  <span>{{ row.order?.title || '--' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="本金" width="110">
              <template #default="{ row }">¥{{ formatMoney(row.principal_amount) }}</template>
            </el-table-column>
            <el-table-column label="剩余待还" width="120">
              <template #default="{ row }">¥{{ formatMoney(row.remaining_amount) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="debtStatusType(row.status)">{{ debtStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.createdAt || row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="96" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDebtDetail(row.id)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="debtFilters.page"
              :page-size="debtFilters.limit"
              :total="debtPagination.total"
              @current-change="handleDebtPageChange"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :xl="10">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-head">
              <span>系统账户流水</span>
              <span class="panel-sub">最近 {{ transactionPagination.total }} 条中的分页结果</span>
            </div>
          </template>

          <div class="toolbar">
            <el-select
              v-model="transactionFilters.direction"
              clearable
              placeholder="方向"
              style="width: 120px"
            >
              <el-option label="全部" value="" />
              <el-option label="收入" value="in" />
              <el-option label="支出" value="out" />
            </el-select>
            <el-input
              v-model="transactionFilters.keyword"
              placeholder="搜索流水号/备注"
              clearable
              style="width: 200px"
              @keyup.enter="loadTransactions"
            />
            <el-button @click="loadTransactions">查询</el-button>
          </div>

          <el-table :data="transactions" stripe v-loading="loading.transactions">
            <el-table-column prop="transaction_no" label="流水号" min-width="170" />
            <el-table-column prop="description" label="描述" min-width="150" />
            <el-table-column label="金额" width="110">
              <template #default="{ row }">
                <span :class="row.direction === 'in' ? 'amount-in' : 'amount-out'">
                  {{ row.direction === 'in' ? '+' : '-' }}¥{{ formatMoney(row.amount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="120" />
            <el-table-column label="时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.completed_at || row.completedAt || row.createdAt || row.created_at) }}</template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="transactionFilters.page"
              :page-size="transactionFilters.limit"
              :total="transactionPagination.total"
              @current-change="handleTransactionPageChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="debtDetailVisible" title="欠款详情" width="820px">
      <template v-if="debtDetail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="配送员">
            {{ debtDetail.debt.user?.real_name || debtDetail.debt.user?.username || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ debtDetail.debt.user?.phone || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="关联订单">
            {{ debtDetail.debt.order?.order_no || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="订单标题">
            {{ debtDetail.debt.order?.title || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="欠款本金">
            ¥{{ formatMoney(debtDetail.debt.principal_amount) }}
          </el-descriptions-item>
          <el-descriptions-item label="剩余待还">
            ¥{{ formatMoney(debtDetail.debt.remaining_amount) }}
          </el-descriptions-item>
          <el-descriptions-item label="赔付原因" :span="2">
            {{ debtDetail.debt.claim?.reason || debtDetail.debt.remark || '--' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-block">
          <div class="detail-title">抵扣记录</div>
          <el-table :data="debtDetail.repayment_records" stripe>
            <el-table-column label="抵扣金额" width="120">
              <template #default="{ row }">¥{{ formatMoney(row.deduct_amount) }}</template>
            </el-table-column>
            <el-table-column label="抵扣前余额" width="120">
              <template #default="{ row }">¥{{ formatMoney(row.balance_before) }}</template>
            </el-table-column>
            <el-table-column label="抵扣后余额" width="120">
              <template #default="{ row }">¥{{ formatMoney(row.balance_after) }}</template>
            </el-table-column>
            <el-table-column label="触发流水" min-width="180">
              <template #default="{ row }">
                {{ row.sourceTransaction?.transaction_no || '--' }}
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="220" prop="remark" />
            <el-table-column label="时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.createdAt || row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { financeManagementApi } from '@/api'

const loading = reactive({
  overview: false,
  debts: false,
  transactions: false,
  debtDetail: false,
})

const systemOverview = reactive({
  account: { balance: 0, total_income: 0, total_expense: 0 },
  debt_summary: { active_count: 0, active_amount: 0 },
})

const debtFilters = reactive({
  page: 1,
  limit: 10,
  status: '',
  keyword: '',
})

const transactionFilters = reactive({
  page: 1,
  limit: 10,
  direction: '',
  keyword: '',
})

const debts = ref([])
const transactions = ref([])
const debtPagination = reactive({ total: 0 })
const transactionPagination = reactive({ total: 0 })
const debtSummary = ref([])
const debtDetailVisible = ref(false)
const debtDetail = ref(null)

const activeDebtSummaryText = computed(() => {
  const active = debtSummary.value.find((item) => ['active', 'partial'].includes(item.status))
  return active ? `¥${formatMoney(active.remaining_amount)}` : '¥0.00'
})

const formatMoney = (value) => (Number(value || 0) || 0).toFixed(2)

const formatDateTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const debtStatusText = (status) => {
  if (status === 'active') return '进行中'
  if (status === 'partial') return '部分偿还'
  if (status === 'cleared') return '已结清'
  return status || '--'
}

const debtStatusType = (status) => {
  if (status === 'active') return 'danger'
  if (status === 'partial') return 'warning'
  if (status === 'cleared') return 'success'
  return 'info'
}

const loadOverview = async () => {
  loading.overview = true
  try {
    const response = await financeManagementApi.getSystemAccountOverview()
    Object.assign(systemOverview, response.data || {})
  } catch (error) {
    ElMessage.error(error.message || '获取系统账户概览失败')
  } finally {
    loading.overview = false
  }
}

const loadDebts = async () => {
  loading.debts = true
  try {
    const response = await financeManagementApi.getDelivererDebts(debtFilters)
    debts.value = response.data?.debts || []
    debtSummary.value = response.data?.summary || []
    Object.assign(debtPagination, response.data?.pagination || { total: 0 })
  } catch (error) {
    ElMessage.error(error.message || '获取欠款台账失败')
  } finally {
    loading.debts = false
  }
}

const loadTransactions = async () => {
  loading.transactions = true
  try {
    const response = await financeManagementApi.getSystemAccountTransactions(transactionFilters)
    transactions.value = response.data?.transactions || []
    Object.assign(transactionPagination, response.data?.pagination || { total: 0 })
  } catch (error) {
    ElMessage.error(error.message || '获取系统账户流水失败')
  } finally {
    loading.transactions = false
  }
}

const loadAll = async () => {
  await Promise.all([loadOverview(), loadDebts(), loadTransactions()])
}

const handleDebtPageChange = (page) => {
  debtFilters.page = page
  loadDebts()
}

const handleTransactionPageChange = (page) => {
  transactionFilters.page = page
  loadTransactions()
}

const openDebtDetail = async (id) => {
  loading.debtDetail = true
  debtDetailVisible.value = true
  try {
    const response = await financeManagementApi.getDelivererDebtDetail(id)
    debtDetail.value = response.data || null
  } catch (error) {
    debtDetailVisible.value = false
    ElMessage.error(error.message || '获取欠款详情失败')
  } finally {
    loading.debtDetail = false
  }
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
.finance-page {
  display: grid;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.summary-grid {
  margin-bottom: 4px;
}

.summary-card {
  border-radius: 18px;
}

.summary-label {
  color: #6b7280;
  font-size: 13px;
}

.summary-value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.summary-foot {
  margin-top: 8px;
  color: #ef4444;
  font-size: 12px;
}

.panel-card {
  border-radius: 20px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-sub {
  color: #6b7280;
  font-size: 12px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.person-cell,
.order-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.person-cell span,
.order-cell span {
  color: #6b7280;
  font-size: 12px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.amount-in {
  color: #059669;
  font-weight: 700;
}

.amount-out {
  color: #dc2626;
  font-weight: 700;
}

.detail-block {
  margin-top: 20px;
}

.detail-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
}
</style>
