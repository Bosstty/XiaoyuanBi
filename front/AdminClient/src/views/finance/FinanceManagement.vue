<template>
  <div class="finance-page finance-management">
    <section class="finance-hero">
      <div class="hero-main">
        <div class="hero-topline">Finance Command</div>
        <div class="hero-title-row">
          <div>
            <h2 class="page-title">财务中心</h2>
            <p class="page-subtitle">平台收入、支出、风险与台账总览</p>
          </div>
          <el-button class="hero-refresh" type="primary" @click="loadAll">刷新数据</el-button>
        </div>

        <div class="hero-command-grid" v-loading="loading.overview">
          <article class="hero-income-card">
            <div class="income-copy">
              <span class="income-kicker">平台净收益</span>
              <div class="income-amount">¥{{ formatMoney(netIncome) }}</div>
              <div class="income-meta">
                <span>累计 {{ overviewTransactionCount }} 笔成功流水</span>
                <span>最近更新 {{ lastTransactionLabel }}</span>
              </div>
            </div>
            <div class="income-side">
              <div class="income-side-item">
                <span>累计收入</span>
                <strong>¥{{ formatMoney(platformIncome) }}</strong>
              </div>
              <div class="income-side-item">
                <span>累计支出</span>
                <strong>¥{{ formatMoney(platformExpense) }}</strong>
              </div>
              <div class="income-side-item">
                <span>收入占比</span>
                <strong>{{ incomeShare }}%</strong>
              </div>
            </div>
          </article>

          <div class="hero-command-rail">
            <article class="aside-card balance-spotlight-card">
              <div class="aside-head">
                <span class="aside-label">现金余量</span>
                <span class="status-pill">Platform</span>
              </div>
              <strong>¥{{ formatMoney(systemOverview.account.balance) }}</strong>
              <small>系统账户余额</small>
            </article>

            <article class="aside-card risk-spotlight-card">
              <div class="aside-head">
                <span class="aside-label">风险回收</span>
                <span class="aside-note">{{ debtRecoveryRate }}%</span>
              </div>
              <div class="risk-summary-row">
                <div>
                  <span>在途欠款</span>
                  <strong>¥{{ formatMoney(systemOverview.debt_summary.active_amount) }}</strong>
                </div>
                <div>
                  <span>活跃笔数</span>
                  <strong>{{ systemOverview.debt_summary.active_count }}</strong>
                </div>
              </div>
              <small>配送员欠款回收进度</small>
            </article>
          </div>
        </div>

      </div>
    </section>

    <section class="insight-grid" v-loading="loading.revenueBrief">
      <article class="insight-card primary insight-card-wide">
        <span class="insight-eyebrow">平台账户入账</span>
        <div class="insight-value">¥{{ formatMoney(platformIncome) }}</div>
        <p>平台累计入账</p>
      </article>
      <article class="insight-card warning">
        <span class="insight-eyebrow">平台净收益</span>
        <div class="insight-value" :class="netIncome >= 0 ? 'positive' : 'negative'">
          {{ netIncome >= 0 ? '+' : '-' }}¥{{ formatMoney(Math.abs(netIncome)) }}
        </div>
        <p>累计收入减累计支出</p>
      </article>
      <article class="insight-card">
        <span class="insight-eyebrow">待回收风险</span>
        <div class="insight-value">
          ¥{{ formatMoney(systemOverview.debt_summary.active_amount) }}
        </div>
        <p>{{ systemOverview.debt_summary.active_count }} 条活跃欠款</p>
      </article>
      <article class="insight-card">
        <span class="insight-eyebrow">{{ analysisRangeLabel }}抽成收入</span>
        <div class="insight-value">¥{{ formatMoney(revenueBrief.totalCommission) }}</div>
        <p>{{ revenueBrief.completedOrders }} 笔已完成订单贡献</p>
      </article>
      <article class="insight-card soft">
        <span class="insight-eyebrow">平均佣金费率</span>
        <div class="insight-value">{{ formatRate(revenueBrief.avgCommissionRate) }}</div>
        <p>抽成收入占运营总收入 {{ commissionRevenueRatio }}%</p>
      </article>
      <article class="insight-card soft">
        <span class="insight-eyebrow">最近流水</span>
        <div class="insight-value">{{ recentTransactionCount }}</div>
        <p>最近动态记录</p>
      </article>
    </section>

    <section class="analysis-stage">
      <el-card shadow="never" class="panel-card analysis-panel">
        <template #header>
          <div class="panel-head">
            <div class="panel-title-group">
              <span class="panel-title">财务趋势</span>
              <span class="panel-desc">按时间查看账户收支、净收益与收益率的变化趋势</span>
            </div>
            <el-radio-group v-model="analysisRange" size="small" @change="loadRangeSummary">
              <el-radio-button :value="7">近7天</el-radio-button>
              <el-radio-button :value="30">近30天</el-radio-button>
              <el-radio-button :value="90">近90天</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <v-chart
          v-loading="loading.analysis"
          :option="analysisChartOption"
          class="analysis-chart"
          autoresize
        />
      </el-card>
    </section>

    <section class="analysis-summary-grid">
      <el-card shadow="never" class="panel-card analysis-summary-panel">
        <template #header>
          <div class="panel-head">
            <div class="panel-title-group">
              <span class="panel-title">区间收益表现</span>
              <span class="panel-desc">最近 {{ analysisData.range_days }} 天的财务结果与运营收入摘要</span>
            </div>
          </div>
        </template>

        <div class="metric-list">
          <div class="metric-row">
            <span>累计收入</span>
            <strong>¥{{ formatMoney(analysisData.summary.total_income) }}</strong>
          </div>
          <div class="metric-row">
            <span>累计支出</span>
            <strong>¥{{ formatMoney(analysisData.summary.total_expense) }}</strong>
          </div>
          <div class="metric-row">
            <span>净收益</span>
            <strong :class="analysisData.summary.net_income >= 0 ? 'positive' : 'negative'">
              {{ analysisData.summary.net_income >= 0 ? '+' : '-' }}¥{{
                formatMoney(Math.abs(analysisData.summary.net_income || 0))
              }}
            </strong>
          </div>
          <div class="metric-row">
            <span>平台收益率</span>
            <strong>{{ formatPercent(analysisData.summary.profit_margin) }}</strong>
          </div>
          <div class="metric-row">
            <span>日均收入</span>
            <strong>¥{{ formatMoney(analysisData.summary.avg_daily_income) }}</strong>
          </div>
          <div class="metric-row">
            <span>日均支出</span>
            <strong>¥{{ formatMoney(analysisData.summary.avg_daily_expense) }}</strong>
          </div>
          <div class="metric-row">
            <span>{{ analysisRangeLabel }}抽成收入</span>
            <strong>¥{{ formatMoney(revenueBrief.totalCommission) }}</strong>
          </div>
          <div class="metric-row">
            <span>平均佣金费率</span>
            <strong>{{ formatRate(revenueBrief.avgCommissionRate) }}</strong>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="panel-card analysis-summary-panel">
        <template #header>
          <div class="panel-head">
            <div class="panel-title-group">
              <span class="panel-title">区间支出结构</span>
              <span class="panel-desc">平台补偿、积分抵扣、平台垫付</span>
            </div>
          </div>
        </template>

        <div class="insight-list">
          <div class="insight-row">
            <span>最高收入日</span>
            <strong>{{ analysisData.summary.best_income_day?.period || '--' }}</strong>
          </div>
          <div class="insight-row">
            <span>最高收益率日</span>
            <strong>{{ analysisData.summary.highest_margin_day?.period || '--' }}</strong>
          </div>
          <div class="insight-row">
            <span>区间流水数</span>
            <strong>{{ analysisData.summary.total_transactions || 0 }} 笔</strong>
          </div>
        </div>

        <div v-if="analysisExpenseRows.length" class="group-chip-list">
          <span v-for="item in analysisExpenseRows" :key="item.key" class="group-chip">
            {{ item.label }} · ¥{{ formatMoney(item.amount) }}
          </span>
        </div>

        <div v-if="analysisBreakdownPills.length" class="group-chip-list">
          <span
            v-for="item in analysisBreakdownPills"
            :key="`${item.direction}-${item.type}`"
            class="group-chip"
          >
            {{ item.label }} · ¥{{ formatMoney(item.amount) }}
          </span>
        </div>
      </el-card>

      <el-card shadow="never" class="panel-card recent-panel ops-panel">
        <template #header>
          <div class="panel-head">
            <div class="panel-title-group">
              <span class="panel-title">运营观察席</span>
              <span class="panel-desc">最近动态与风险摘要</span>
            </div>
          </div>
        </template>

        <div class="insight-list compact-list">
          <div class="insight-row">
            <span>最近入账时间</span>
            <strong>{{ lastTransactionLabel }}</strong>
          </div>
          <div class="insight-row">
            <span>成功流水总数</span>
            <strong>{{ overviewTransactionCount }} 笔</strong>
          </div>
          <div class="insight-row">
            <span>最近动态条数</span>
            <strong>{{ recentTransactionCount }} 条</strong>
          </div>
          <div class="insight-row">
            <span>活跃欠款</span>
            <strong>¥{{ formatMoney(systemOverview.debt_summary.active_amount) }}</strong>
          </div>
        </div>

        <div v-if="recentTransactions.length" class="signal-list">
          <div
            v-for="item in recentTransactions.slice(0, 4)"
            :key="item.id || item.transaction_no"
            class="signal-item"
          >
            <div class="signal-copy">
              <strong>{{ item.description || item.transaction_no || '--' }}</strong>
              <span>{{
                formatDateTime(
                  item.completed_at || item.completedAt || item.createdAt || item.created_at,
                )
              }}</span>
            </div>
            <div :class="item.direction === 'in' ? 'amount-in' : 'amount-out'">
              {{ item.direction === 'in' ? '+' : '-' }}¥{{ formatMoney(item.amount) }}
            </div>
          </div>
        </div>
      </el-card>
    </section>

    <section class="board-grid">
      <el-card shadow="never" class="panel-card transaction-card featured-panel">
        <template #header>
          <div class="panel-head">
            <div class="panel-title-group">
              <span class="panel-tag">Priority</span>
              <span class="panel-title">平台收入流水</span>
              <span class="panel-desc"
                >优先查看收入、支出与回款明细，支持按方向和关键字快速筛选</span
              >
            </div>
            <span class="panel-sub">共 {{ transactionPagination.total }} 条流水记录</span>
          </div>
        </template>

        <div class="toolbar compact">
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
            style="width: 220px"
            @keyup.enter="loadTransactions"
          />
          <el-button @click="loadTransactions">查询</el-button>
        </div>

        <el-table :data="transactions" stripe v-loading="loading.transactions">
          <el-table-column prop="transaction_no" label="流水号" min-width="180" />
          <el-table-column prop="description" label="描述" min-width="190" />
          <el-table-column label="金额" width="130">
            <template #default="{ row }">
              <span :class="row.direction === 'in' ? 'amount-in' : 'amount-out'">
                {{ row.direction === 'in' ? '+' : '-' }}¥{{ formatMoney(row.amount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="130" />
          <el-table-column label="时间" min-width="170">
            <template #default="{ row }">
              {{
                formatDateTime(
                  row.completed_at || row.completedAt || row.createdAt || row.created_at,
                )
              }}
            </template>
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

      <div class="side-stack">
        <el-card shadow="never" class="panel-card metric-panel">
          <template #header>
            <div class="panel-head">
              <div class="panel-title-group">
                <span class="panel-title">支出结构</span>
                <span class="panel-desc">支出按平台补偿、积分抵扣、平台垫付三类拆分</span>
              </div>
            </div>
          </template>

          <div class="metric-list">
            <div class="metric-row">
              <span>累计支出</span>
              <strong>¥{{ formatMoney(platformExpense) }}</strong>
            </div>
            <div v-for="item in overviewExpenseRows" :key="item.key" class="metric-row">
              <span>{{ item.label }}</span>
              <strong>¥{{ formatMoney(item.amount) }}</strong>
            </div>
          </div>

          <div class="group-chip-list" v-if="groupedStats.length || analysisBreakdownPills.length">
            <span v-for="item in groupedStats" :key="item.type" class="group-chip">
              {{ item.type }} · ¥{{ formatMoney(item.amount) }}
            </span>
            <span v-for="item in analysisBreakdownPills" :key="`${item.direction}-${item.type}`" class="group-chip">
              {{ item.label }} · ¥{{ formatMoney(item.amount) }}
            </span>
          </div>
        </el-card>
      </div>
    </section>

    <el-card shadow="never" class="panel-card debt-card">
      <template #header>
        <div class="panel-head">
          <div class="panel-title-group">
            <span class="panel-title">配送员欠款台账</span>
            <span class="panel-desc"
              >跟踪赔付垫资、待还金额与历史抵扣记录，辅助判断风险回收速度</span
            >
          </div>
          <el-tag type="danger" effect="dark">活跃欠款 {{ activeDebtSummaryText }}</el-tag>
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
        <el-select
          v-model="debtFilters.status"
          clearable
          placeholder="欠款状态"
          style="width: 140px"
        >
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
          <template #default="{ row }">{{
            formatDateTime(row.createdAt || row.created_at)
          }}</template>
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
              <template #default="{ row }">{{
                formatDateTime(row.createdAt || row.created_at)
              }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { ElMessage } from 'element-plus'
import { analyticsApi, financeManagementApi } from '@/api'

use([CanvasRenderer, BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent])

const loading = reactive({
  overview: false,
  analysis: false,
  revenueBrief: false,
  debts: false,
  transactions: false,
  debtDetail: false,
})

const systemOverview = reactive({
  account: { balance: 0, total_income: 0, total_expense: 0, last_transaction_at: null },
  transaction_summary: { total_count: 0, income_amount: 0, expense_amount: 0 },
  expense_breakdown: {
    platform_compensation: 0,
    points_subsidy: 0,
    deliverer_compensation_advance: 0,
  },
  grouped_stats: [],
  debt_summary: { active_count: 0, active_amount: 0 },
  recent_transactions: [],
})

const analysisRange = ref(30)
const analysisData = reactive({
  range_days: 30,
  summary: {
    total_income: 0,
    total_expense: 0,
    net_income: 0,
    profit_margin: 0,
    avg_daily_income: 0,
    avg_daily_expense: 0,
    total_transactions: 0,
    best_income_day: { period: '--', income: 0 },
    highest_margin_day: { period: '--', profit_margin: 0 },
  },
  trend: [],
  expense_breakdown: {
    platform_compensation: 0,
    points_subsidy: 0,
    deliverer_compensation_advance: 0,
  },
  grouped_breakdown: [],
})
const revenueBrief = reactive({
  totalRevenue: 0,
  totalCommission: 0,
  avgCommissionRate: 0,
  completedOrders: 0,
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

const groupedStats = computed(() => systemOverview.grouped_stats || [])
const recentTransactions = computed(() => systemOverview.recent_transactions || [])
const expenseLabels = {
  platform_compensation: '平台补偿',
  points_subsidy: '积分抵扣',
  deliverer_compensation_advance: '垫付配送员赔偿',
}
const platformIncome = computed(
  () =>
    Number(
      systemOverview.transaction_summary?.income_amount || systemOverview.account.total_income || 0,
    ) || 0,
)
const platformExpense = computed(
  () =>
    Number(
      systemOverview.transaction_summary?.expense_amount ||
        systemOverview.account.total_expense ||
        0,
    ) || 0,
)
const overviewTransactionCount = computed(
  () =>
    Number(
      systemOverview.transaction_summary?.total_count || recentTransactions.value.length || 0,
    ) || 0,
)
const recentTransactionCount = computed(() => recentTransactions.value.length)
const netIncome = computed(() => platformIncome.value - platformExpense.value)
const analysisRangeLabel = computed(() => `近${analysisRange.value}天`)
const overviewExpenseRows = computed(() =>
  Object.entries(systemOverview.expense_breakdown || {}).map(([key, value]) => ({
    key,
    label: expenseLabels[key] || key,
    amount: Number(value || 0) || 0,
  })),
)
const analysisExpenseRows = computed(() =>
  Object.entries(analysisData.expense_breakdown || {}).map(([key, value]) => ({
    key,
    label: expenseLabels[key] || key,
    amount: Number(value || 0) || 0,
  })),
)
const analysisBreakdownPills = computed(() =>
  (analysisData.grouped_breakdown || []).slice(0, 6).map((item) => ({
    ...item,
    label: `${item.direction === 'in' ? '收入' : '支出'}:${item.type}`,
  })),
)
const incomeShare = computed(() => {
  const total = platformIncome.value + platformExpense.value
  if (!total) return '0.0'
  return ((platformIncome.value / total) * 100).toFixed(1)
})
const debtRecoveryRate = computed(() => {
  const activeAmount = Number(systemOverview.debt_summary?.active_amount || 0) || 0
  const baseline = platformIncome.value + activeAmount
  if (!baseline) return '100.0'
  return ((platformIncome.value / baseline) * 100).toFixed(1)
})
const commissionRevenueRatio = computed(() => {
  if (!revenueBrief.totalRevenue) return '0.0'
  return ((revenueBrief.totalCommission / revenueBrief.totalRevenue) * 100).toFixed(1)
})
const lastTransactionLabel = computed(() => {
  const value = systemOverview.account?.last_transaction_at
  return value ? formatDateTime(value) : '暂无记录'
})
const analysisChartOption = computed(() => {
  const source = analysisData.trend || []
  const dates = source.map((item) => item.period?.slice(5) || item.period)
  const incomeSeries = source.map((item) => Number(item.income || 0))
  const expenseSeries = source.map((item) => Number(item.expense || 0))
  const netSeries = source.map((item) => Number(item.net_income || 0))
  const marginSeries = source.map((item) => Number(item.profit_margin || 0))

  return {
    color: ['#6366f1', '#f59e0b', '#10b981', '#0ea5e9'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderWidth: 0,
      textStyle: { color: '#fff' },
      formatter: (params) => {
        const title = params?.[0]?.axisValueLabel || '--'
        const lines = params.map((item) => {
          const suffix = item.seriesName === '收益率' ? '%' : ''
          return `${item.marker}${item.seriesName}: ${Number(item.value || 0).toFixed(2)}${suffix}`
        })
        return [title, ...lines].join('<br/>')
      },
    },
    legend: {
      top: 0,
      textStyle: { color: '#64748b' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '14%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' },
    },
    yAxis: [
      {
        type: 'value',
        name: '金额',
        axisLabel: {
          color: '#64748b',
          formatter: (value) => `¥${value}`,
        },
        splitLine: { lineStyle: { color: '#eef2f7' } },
      },
      {
        type: 'value',
        name: '收益率',
        axisLabel: {
          color: '#64748b',
          formatter: (value) => `${value}%`,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '收入',
        type: 'bar',
        barMaxWidth: 16,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: incomeSeries,
      },
      {
        name: '支出',
        type: 'bar',
        barMaxWidth: 16,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: expenseSeries,
      },
      {
        name: '净收益',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        yAxisIndex: 0,
        data: netSeries,
      },
      {
        name: '收益率',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        yAxisIndex: 1,
        lineStyle: { type: 'dashed' },
        data: marginSeries,
      },
    ],
  }
})

const activeDebtSummaryText = computed(() => {
  const active = debtSummary.value.find((item) => ['active', 'partial'].includes(item.status))
  return active ? `¥${formatMoney(active.remaining_amount)}` : '¥0.00'
})

const formatMoney = (value) => (Number(value || 0) || 0).toFixed(2)
const formatPercent = (value) => `${(Number(value || 0) || 0).toFixed(1)}%`
const formatRate = (value) => `${((Number(value || 0) || 0) * 100).toFixed(1)}%`

const formatDateParam = (value) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getAnalyticsRangeParams = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - analysisRange.value + 1)
  return {
    start_date: formatDateParam(start),
    end_date: formatDateParam(end),
  }
}

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

const loadAnalysis = async () => {
  loading.analysis = true
  try {
    const response = await financeManagementApi.getSystemAccountAnalysis({
      days: analysisRange.value,
    })
    Object.assign(analysisData, response.data || {})
  } catch (error) {
    ElMessage.error(error.message || '获取系统账户分析失败')
  } finally {
    loading.analysis = false
  }
}

const loadRevenueBrief = async () => {
  loading.revenueBrief = true
  try {
    const params = getAnalyticsRangeParams()
    const [dashboardResponse, revenueResponse] = await Promise.all([
      analyticsApi.getDashboardStats(params),
      analyticsApi.getRevenueStats(params),
    ])

    revenueBrief.totalRevenue = Number(dashboardResponse.data?.revenue || 0) || 0
    revenueBrief.completedOrders = Number(dashboardResponse.data?.orders?.completed || 0) || 0
    revenueBrief.totalCommission =
      Number(revenueResponse.data?.commission_stats?.total_commission || 0) || 0
    revenueBrief.avgCommissionRate =
      Number(revenueResponse.data?.commission_stats?.avg_commission_rate || 0) || 0
  } catch (error) {
    ElMessage.error(error.message || '获取运营收入摘要失败')
  } finally {
    loading.revenueBrief = false
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
  await Promise.all([loadOverview(), loadRangeSummary(), loadDebts(), loadTransactions()])
}

const loadRangeSummary = async () => {
  await Promise.all([loadAnalysis(), loadRevenueBrief()])
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
.finance-management {
  --finance-bg:
    radial-gradient(circle at top left, rgba(15, 23, 42, 0.08), transparent 24%),
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 24%),
    linear-gradient(180deg, #f4f7fb 0%, #eef3f9 100%);
  max-width: 1600px;
  margin: 0 auto;
  padding: 12px 0 28px;
}

.finance-page {
  display: grid;
  gap: 22px;
}

.finance-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 30px;
  background: var(--finance-bg);
  overflow: hidden;
  position: relative;
  box-shadow: 0 20px 50px rgba(148, 163, 184, 0.14);
}

.finance-hero::after {
  content: '';
  position: absolute;
  inset: auto -80px -120px auto;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  filter: blur(10px);
}

.hero-main {
  position: relative;
  z-index: 1;
}

.hero-main {
  display: grid;
  gap: 22px;
}

.hero-topline {
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.1);
  color: #4338ca;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 2.2rem;
  line-height: 1.05;
  font-weight: 800;
  color: #0f172a;
  font-family: 'Fira Code', 'Segoe UI', monospace;
}

.page-subtitle {
  margin: 0;
  max-width: 680px;
  font-size: 0.98rem;
  line-height: 1.7;
  color: #475569;
}

.hero-refresh {
  min-width: 104px;
}

.hero-command-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(340px, 0.72fr);
  gap: 20px;
  align-items: stretch;
}

.hero-income-card {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(250px, 0.85fr);
  gap: 22px;
  padding: 30px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.16), transparent 24%),
    radial-gradient(circle at bottom left, rgba(56, 189, 248, 0.18), transparent 28%),
    linear-gradient(145deg, rgba(15, 23, 42, 0.99), rgba(30, 41, 59, 0.96) 52%, rgba(51, 65, 85, 0.95));
  color: #fff;
  box-shadow: 0 34px 80px rgba(15, 23, 42, 0.2);
  min-height: 272px;
}

.income-copy {
  display: grid;
  gap: 10px;
}

.income-kicker {
  color: rgba(255, 255, 255, 0.64);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.income-amount {
  font-size: clamp(3rem, 4.2vw, 4.4rem);
  line-height: 0.9;
  font-weight: 800;
  letter-spacing: -0.05em;
}

.income-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
}

.income-side {
  display: grid;
  gap: 12px;
  align-content: start;
}

.income-side-item {
  display: grid;
  gap: 6px;
  padding: 16px 16px 15px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
}

.income-side-item span {
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
}

.income-side-item strong {
  color: #fff;
  font-size: 1.15rem;
}

.hero-aside {
  display: grid;
  gap: 14px;
}

.hero-command-rail {
  display: grid;
  gap: 18px;
  align-content: stretch;
}

.aside-card {
  display: grid;
  gap: 10px;
  padding: 22px 22px 20px;
  border-radius: 24px;
  border: 1px solid rgba(203, 213, 225, 0.75);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.aside-card strong {
  font-size: 1.8rem;
  line-height: 1;
  color: #0f172a;
}

.aside-card small,
.aside-label {
  color: #64748b;
}

.aside-label {
  font-size: 13px;
  font-weight: 700;
}

.overview-aside-card {
  gap: 16px;
  align-content: start;
}

.balance-spotlight-card {
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
}

.risk-spotlight-card {
  background:
    radial-gradient(circle at top right, rgba(248, 113, 113, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 237, 0.88));
}

.aside-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.aside-note {
  color: #94a3b8;
  font-size: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.risk-summary-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.risk-summary-row div {
  display: grid;
  gap: 8px;
  padding: 14px 14px 12px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid #e2e8f0;
}

.risk-summary-row span {
  color: #64748b;
  font-size: 12px;
}

.risk-summary-row strong {
  font-size: 1.2rem;
}

.aside-stat-list {
  display: grid;
  gap: 14px;
}

.aside-stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px dashed #dbe4f0;
}

.aside-stat-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.aside-stat-row span {
  color: #64748b;
  font-size: 13px;
}

.aside-stat-row strong {
  font-size: 1.35rem;
  line-height: 1;
}

.overview-aside-card small {
  line-height: 1.7;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.insight-card {
  padding: 22px 22px 20px;
  border-radius: 24px;
  border: 1px solid rgba(203, 213, 225, 0.72);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.08);
}

.insight-card.primary {
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 32%),
    linear-gradient(135deg, #eef4ff, #f8fbff);
  border-color: rgba(96, 165, 250, 0.34);
}

.insight-card.warning {
  background:
    radial-gradient(circle at top right, rgba(239, 68, 68, 0.1), transparent 32%),
    linear-gradient(135deg, #fff9f8, #ffffff);
}

.insight-card.soft {
  background:
    radial-gradient(circle at top right, rgba(20, 184, 166, 0.12), transparent 32%),
    linear-gradient(135deg, #f5fffd, #ffffff);
}

.insight-card-wide {
  position: relative;
  overflow: hidden;
}

.insight-card-wide::after {
  content: '';
  position: absolute;
  right: -28px;
  bottom: -40px;
  width: 140px;
  height: 140px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
}

.insight-eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.insight-value {
  margin-bottom: 8px;
  color: #0f172a;
  font-size: 2.15rem;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.insight-card p {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.analysis-stage {
  display: grid;
}

.analysis-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  align-items: start;
}

.ops-panel {
  border-style: dashed;
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.08), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
}

.analysis-chart {
  height: 360px;
}

.board-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.58fr) minmax(300px, 0.72fr);
  gap: 22px;
  align-items: start;
}

.board-grid > * {
  align-self: start;
}

.side-stack {
  display: grid;
  gap: 20px;
  align-content: start;
}

.panel-card {
  border-radius: 26px;
  border: 1px solid rgba(203, 213, 225, 0.72);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  box-shadow: 0 14px 30px rgba(148, 163, 184, 0.08);
}

.featured-panel {
  border-color: rgba(96, 165, 250, 0.28);
  height: auto;
}

.featured-panel :deep(.el-card__body) {
  display: block;
}

.panel-card :deep(.el-card__header) {
  padding: 22px 24px;
  border-bottom: 1px solid #eef2f7;
}

.panel-card :deep(.el-card__body) {
  padding: 24px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-title-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.panel-tag {
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.1);
  color: #4338ca;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel-title {
  font-size: 1.08rem;
  font-weight: 800;
  color: #0f172a;
}

.panel-desc {
  font-size: 0.84rem;
  color: #64748b;
  line-height: 1.6;
}

.panel-sub {
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.toolbar.compact {
  margin-bottom: 20px;
}

.metric-list {
  display: grid;
  gap: 12px;
}

.metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #e2e8f0;
}

.metric-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.metric-row span {
  color: #64748b;
}

.metric-row strong {
  color: #0f172a;
  font-size: 1rem;
}

.group-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}

.group-chip {
  display: inline-flex;
  padding: 7px 10px;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  border: 1px solid #e2e8f0;
}

.recent-list {
  display: grid;
  gap: 12px;
}

.insight-list {
  display: grid;
  gap: 12px;
}

.insight-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #e2e8f0;
}

.insight-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.insight-row span {
  color: #64748b;
}

.insight-row strong {
  color: #0f172a;
  font-size: 0.96rem;
}

.signal-list {
  display: grid;
  gap: 12px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #eef2f7;
}

.signal-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.signal-copy {
  display: grid;
  gap: 4px;
}

.signal-copy strong {
  color: #0f172a;
  font-size: 0.93rem;
}

.signal-copy span {
  color: #64748b;
  font-size: 12px;
}

.recent-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #eef2f7;
}

.recent-item:first-child {
  padding-top: 0;
}

.recent-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.recent-main {
  display: grid;
  gap: 4px;
}

.recent-main strong {
  color: #0f172a;
  font-size: 0.95rem;
}

.recent-main span {
  color: #64748b;
  font-size: 12px;
}

.person-cell,
.order-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.person-cell strong,
.order-cell strong {
  color: #0f172a;
  font-weight: 700;
}

.person-cell span,
.order-cell span {
  color: #64748b;
  font-size: 12px;
}

.panel-card :deep(.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-row-hover-bg-color: #f8fbff;
}

.panel-card :deep(.el-table th.el-table__cell) {
  font-weight: 700;
  color: #64748b;
}

.panel-card :deep(.el-table td.el-table__cell) {
  padding-top: 14px;
  padding-bottom: 14px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.amount-in,
.positive {
  color: #059669;
  font-weight: 800;
}

.amount-out,
.negative {
  color: #dc2626;
  font-weight: 800;
}

.detail-block {
  margin-top: 20px;
}

.detail-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .analysis-summary-grid,
  .board-grid {
    grid-template-columns: 1fr;
  }

  .hero-command-grid {
    grid-template-columns: 1fr;
  }

  .insight-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .hero-income-card {
    grid-template-columns: 1fr;
  }

  .panel-sub {
    white-space: normal;
    text-align: right;
  }
}

@media (max-width: 768px) {
  .finance-management {
    padding: 0 0 14px;
  }

  .finance-hero {
    padding: 18px;
    border-radius: 22px;
  }

  .hero-title-row,
  .panel-head,
  .recent-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-refresh {
    width: 100%;
  }

  .insight-grid {
    grid-template-columns: 1fr;
  }

  .risk-summary-row {
    grid-template-columns: 1fr;
  }

  .panel-card :deep(.el-card__header),
  .panel-card :deep(.el-card__body) {
    padding-left: 16px;
    padding-right: 16px;
  }

  .panel-sub {
    text-align: left;
  }
}
</style>
