<template>
  <div class="dashboard">
    <!-- Header -->
    <DashboardFilterHeader
      v-model="dateRange"
      title="数据看板"
      subtitle="运营首页 · 实时总览 · 快速进入分析与处理"
      filter-label="统计范围"
      filter-hint="默认展示最近30天，可按需调整"
      :action-icon="Download"
      action-label="导出总览"
      @change="handleDateRangeChange"
      @action="handleExportOverview"
    />

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div v-for="card in statCards" :key="card.key" class="stat-card" :class="card.theme">
        <div class="stat-icon">
          <el-icon :size="20"><component :is="card.icon" /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ card.label }}</span>
          <div class="stat-value-row">
            <span class="stat-value">{{ card.prefix }}{{ formatNumber(card.value) }}</span>
            <el-tag :type="card.tagType" size="small" effect="dark" round>{{ card.tag }}</el-tag>
          </div>
          <div class="stat-meta">{{ card.meta }}</div>
        </div>
      </div>
    </div>

    <!-- Overview Grid -->
    <div class="overview-grid">
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="card-header">
            <div>
              <h3 class="card-title">抽成与订单概览</h3>
              <span class="card-subtitle">近期平台抽成金额与抽成笔数趋势</span>
            </div>
          </div>
        </template>
        <v-chart :option="overviewChartOption" style="height: 300px" autoresize />
      </el-card>

      <div class="side-stack">
        <!-- 异常订单 -->
        <el-card class="alert-card" shadow="never">
          <div class="badge-label">Priority</div>
          <div class="card-header">
            <div>
              <h3 class="card-title">异常订单</h3>
              <p class="card-desc">{{ abnormalSummary.message || '当前无异常订单预警' }}</p>
            </div>
            <el-tag
              :type="abnormalSummary.level === 'high' ? 'danger' : 'warning'"
              size="small"
              effect="dark"
              round
            >
              {{ abnormalSummary.level === 'high' ? '高风险' : '中风险' }}
            </el-tag>
          </div>
          <div class="alert-number">{{ formatNumber(abnormalSummary.count || 0) }}</div>
          <div class="alert-meta">
            <span>待处理 {{ formatNumber(realtime.pendingOrders) }}</span>
            <span>在线配送员 {{ formatNumber(realtime.onlineDeliverers) }}</span>
          </div>
          <router-link to="/analytics" class="text-link">去数据分析页处理 →</router-link>
        </el-card>

        <!-- 数据分析入口 -->
        <el-card class="entry-card" shadow="never">
          <div class="badge-label">Deep Dive</div>
          <div class="card-header entry-card-header">
            <div>
              <h3 class="card-title">进入数据分析</h3>
              <p class="card-desc">收入、留存、行为、服务质量和异常处理统一在分析页完成</p>
            </div>
            <router-link to="/analytics" class="text-link">去数据分析页处理 →</router-link>
          </div>
          <div class="pill-grid">
            <div class="pill">
              <span>投诉数</span>
              <strong>{{ formatNumber(serviceQuality.complaints) }}</strong>
            </div>
            <div class="pill">
              <span>系统状态</span>
              <strong>{{ realtime.systemHealth === 'normal' ? '正常' : '异常' }}</strong>
            </div>
            <div class="pill">
              <span>近1小时新订单</span>
              <strong>{{ formatNumber(realtime.newOrdersLastHour) }}</strong>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- Bottom Grid -->
    <div class="bottom-grid">
      <!-- 快捷入口 -->
      <el-card shadow="never">
        <template #header>
          <div class="card-header"><h3 class="card-title">快捷入口</h3></div>
        </template>
        <div class="quick-grid">
          <router-link
            v-for="entry in quickEntries"
            :key="entry.to"
            :to="entry.to"
            class="quick-item"
          >
            <div class="quick-icon" :class="entry.theme">
              <el-icon :size="22"><component :is="entry.icon" /></el-icon>
            </div>
            <span>{{ entry.label }}</span>
          </router-link>
        </div>
      </el-card>

      <!-- 运营摘要 -->
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <h3 class="card-title">运营摘要</h3>
            <router-link to="/analytics" class="text-link">查看分析</router-link>
          </div>
        </template>
        <div class="list-wrap">
          <div v-for="item in overviewItems" :key="item.title" class="list-item">
            <div class="dot" :class="item.type"></div>
            <div>
              <div class="item-title">{{ item.title }}</div>
              <div class="item-desc">{{ item.description }}</div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 待处理事项 -->
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <h3 class="card-title">待处理事项</h3>
            <el-badge :value="pendingItems.length" type="danger" />
          </div>
        </template>
        <div class="list-wrap">
          <div
            v-for="item in pendingItems"
            :key="item.id"
            class="list-item pending-item"
            :class="'p-' + item.priority"
          >
            <div class="dot priority-dot"></div>
            <div class="flex-1">
              <div class="item-title">{{ item.title }}</div>
              <div class="item-desc">{{ item.description }}</div>
            </div>
            <router-link class="text-link" :to="item.to">处理</router-link>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import { ElMessage } from 'element-plus'
import { analyticsApi } from '@/api'
import { exportCsvFile } from '@/utils/export'
import DashboardFilterHeader from './components/DashboardFilterHeader.vue'
import {
  User,
  Box,
  Briefcase,
  Money,
  Download,
  ChatDotRound,
  TrendCharts,
  Setting,
} from '@element-plus/icons-vue'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

// ---- State ----
const dateRange = ref([])
const overviewPeriod = ref('30')
const refreshing = ref(false)

const metrics = reactive({
  totalUsers: 0,
  totalOrders: 0,
  totalTasks: 0,
  totalRevenue: 0,
  newUsers: 0,
  completedOrders: 0,
  completionRate: 0,
  newTasks: 0,
})
const realtime = reactive({
  onlineUsers: 0,
  onlineDeliverers: 0,
  pendingOrders: 0,
  activeOrders: 0,
  newOrdersLastHour: 0,
  completedOrdersLastHour: 0,
  apiCallsLastHour: 0,
  systemHealth: 'normal',
})
const serviceQuality = reactive({ complaints: 0 })
const abnormalAlerts = ref([])
const trendSource = ref([])

// ---- Computed ----
const abnormalSummary = computed(() => abnormalAlerts.value[0] || {})

const commissionRatio = computed(() => {
  return metrics.totalRevenue > 0 ? '100.00' : '0.00'
})

// 将4个stat-card数据集中管理，方便以后增删
const statCards = computed(() => [
  {
    key: 'users',
    theme: 'theme-indigo',
    label: '总用户数',
    prefix: '',
    value: metrics.totalUsers,
    tagType: 'primary',
    tag: `日增 ${formatNumber(metrics.newUsers)}`,
    meta: `活跃在线 ${formatNumber(realtime.onlineUsers)}`,
    icon: User,
  },
  {
    key: 'orders',
    theme: 'theme-blue',
    label: '订单总数',
    prefix: '',
    value: metrics.totalOrders,
    tagType: 'success',
    tag: `完成率 ${metrics.completionRate}%`,
    meta: `进行中 ${formatNumber(realtime.activeOrders)}`,
    icon: Box,
  },
  {
    key: 'tasks',
    theme: 'theme-green',
    label: '总任务数',
    prefix: '',
    value: metrics.totalTasks,
    tagType: 'warning',
    tag: `新增 ${formatNumber(metrics.newTasks)}`,
    meta: `待处理 ${formatNumber(realtime.pendingOrders)}`,
    icon: Briefcase,
  },
  {
    key: 'revenue',
    theme: 'theme-orange',
    label: '总收入',
    prefix: '¥',
    value: metrics.totalRevenue,
    tagType: 'danger',
    tag: `抽成 ${commissionRatio.value}%`,
    meta: `近1小时 API ${formatNumber(realtime.apiCallsLastHour)}`,
    icon: Money,
  },
])

const quickEntries = [
  { to: '/users', label: '用户管理', theme: 'qi', icon: User },
  { to: '/orders', label: '订单管理', theme: 'qo', icon: Box },
  { to: '/tasks', label: '任务管理', theme: 'qt', icon: Briefcase },
  { to: '/forum', label: '论坛管理', theme: 'qf', icon: ChatDotRound },
  { to: '/analytics', label: '数据分析', theme: 'qa', icon: TrendCharts },
  { to: '/system', label: '系统设置', theme: 'qs', icon: Setting },
]

const overviewItems = computed(() => [
  {
    title: '用户增长',
    description: `今日新增用户 ${formatNumber(metrics.newUsers)}，当前在线 ${formatNumber(realtime.onlineUsers)} 人。`,
    type: 'primary',
  },
  {
    title: '订单履约',
    description: `总订单 ${formatNumber(metrics.totalOrders)}，完成率 ${metrics.completionRate}%，进行中 ${formatNumber(realtime.activeOrders)} 单。`,
    type: 'success',
  },
  {
    title: '风险状态',
    description: abnormalSummary.value.message || '暂无高风险异常订单，系统运行平稳。',
    type: 'danger',
  },
  {
    title: '系统负载',
    description: `近1小时 API 调用 ${formatNumber(realtime.apiCallsLastHour)} 次，系统状态 ${realtime.systemHealth === 'normal' ? '正常' : '异常'}。`,
    type: 'warning',
  },
])

const pendingItems = computed(() => [
  {
    id: 1,
    title: '异常订单预警',
    description: abnormalSummary.value.message || '暂无异常订单',
    priority: abnormalSummary.value.level === 'high' ? 'urgent' : 'high',
    to: '/analytics',
  },
  {
    id: 2,
    title: '待处理订单',
    description: `当前待处理订单 ${formatNumber(realtime.pendingOrders)} 单`,
    priority: realtime.pendingOrders > 20 ? 'high' : 'normal',
    to: '/orders',
  },
  {
    id: 3,
    title: '投诉与服务质量',
    description: `当前投诉 ${formatNumber(serviceQuality.complaints)} 条`,
    priority: serviceQuality.complaints > 0 ? 'high' : 'normal',
    to: '/analytics',
  },
  {
    id: 4,
    title: '系统监控',
    description: realtime.systemHealth === 'normal' ? '系统状态正常' : '检测到系统异常，请尽快排查',
    priority: realtime.systemHealth === 'normal' ? 'normal' : 'urgent',
    to: '/system',
  },
])

function getDashboardQueryParams(options = {}) {
  const params = {}

  if (options.period) {
    params.period = options.period
  }

  if (dateRange.value?.length === 2) {
    params.start_date = dateRange.value[0]
    params.end_date = dateRange.value[1]
  }

  return params
}

const overviewChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#0f172a' },
    formatter: (params) => {
      const revenue = params.find((item) => item.seriesName === '收入')
      const count = params.find((item) => item.seriesName === '抽成笔数')
      return [
        `<div style="margin-bottom:6px;font-weight:600;">${params[0]?.axisValue || ''}</div>`,
        `${revenue?.marker || ''}收入：¥${formatNumber(revenue?.value || 0)}`,
        `${count?.marker || ''}抽成笔数：${formatNumber(count?.value || 0)}`,
      ].join('<br/>')
    },
  },
  legend: { data: ['收入', '抽成笔数'], bottom: 0, textStyle: { color: '#64748b' } },
  grid: { left: '3%', right: '4%', top: '10%', bottom: '16%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: true,
    data: trendSource.value.map((i) => i.date),
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisTick: { show: false },
    axisLabel: { color: '#64748b', fontSize: 12, margin: 14 },
  },
  yAxis: [
    {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', formatter: (v) => formatNumber(v) },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8' },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: '抽成笔数',
      type: 'bar',
      yAxisIndex: 1,
      barWidth: 22,
      barGap: '-100%',
      z: 1,
      itemStyle: {
        borderRadius: [10, 10, 0, 0],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(129, 140, 248, 0.45)' },
            { offset: 1, color: 'rgba(129, 140, 248, 0.08)' },
          ],
        },
      },
      emphasis: {
        itemStyle: {
          color: 'rgba(99, 102, 241, 0.55)',
        },
      },
      data: trendSource.value.map((i) => parseInt(i.transaction_count) || 0),
    },
    {
      name: '收入',
      type: 'line',
      smooth: trendSource.value.length > 4 ? 0.35 : 0.18,
      symbol: 'circle',
      symbolSize: 8,
      z: 3,
      lineStyle: {
        width: 3,
        color: '#6366f1',
        shadowBlur: 8,
        shadowColor: 'rgba(99,102,241,0.15)',
      },
      itemStyle: { color: '#6366f1', borderColor: '#fff', borderWidth: 2.5 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99, 102, 241, 0.22)' },
            { offset: 1, color: 'rgba(99, 102, 241, 0.03)' },
          ],
        },
      },
      data: trendSource.value.map((i) => parseFloat(i.revenue) || 0),
    },
  ],
}))

// ---- Utils ----
function formatNumber(num) {
  if (!num) return '0'
  return new Intl.NumberFormat('zh-CN').format(num)
}

// ---- API ----
async function fetchDashboardData() {
  const r = await analyticsApi.getDashboardStats(getDashboardQueryParams())
  if (r.success && r.data) {
    const d = r.data
    metrics.totalUsers = d.users?.total || 0
    metrics.totalOrders = d.orders?.total || 0
    metrics.totalTasks = d.tasks?.total || 0
    metrics.totalRevenue = d.revenue || 0
    metrics.newUsers = d.users?.new || 0
    metrics.completedOrders = d.orders?.completed || 0
    metrics.newTasks = d.tasks?.new || 0
    metrics.completionRate =
      d.orders?.total > 0 ? ((d.orders.completed / d.orders.total) * 100).toFixed(1) : '0.0'
  }
}

async function fetchRealtimeData() {
  const r = await analyticsApi.getRealtimeStats()
  if (r.success && r.data) {
    const d = r.data
    realtime.onlineUsers = d.online_users || 0
    realtime.onlineDeliverers = d.online_deliverers || 0
    realtime.pendingOrders = d.pending_orders || 0
    realtime.activeOrders = d.active_orders || 0
    realtime.newOrdersLastHour = d.new_orders_last_hour || 0
    realtime.completedOrdersLastHour = d.completed_orders_last_hour || 0
    realtime.apiCallsLastHour = d.api_calls_last_hour || 0
    realtime.systemHealth = d.system_health || 'normal'
  }
}

async function fetchRevenueTrend(period = 'month') {
  const r = await analyticsApi.getRevenueStats(getDashboardQueryParams({ period }))
  if (r.success && r.data) trendSource.value = r.data.revenue_trend || []
}

async function fetchAbnormalOrders() {
  const r = await analyticsApi.getAbnormalOrderAlerts(getDashboardQueryParams())
  if (r.success && r.data) abnormalAlerts.value = r.data.alerts || []
}

async function fetchServiceQuality() {
  const r = await analyticsApi.getServiceQualityStats(getDashboardQueryParams())
  if (r.success && r.data) serviceQuality.complaints = r.data.complaints || 0
}

async function refreshData() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    const periodMap = { 7: 'week', 30: 'month', 90: 'quarter' }
    const results = await Promise.allSettled([
      fetchDashboardData(),
      fetchRealtimeData(),
      fetchRevenueTrend(periodMap[overviewPeriod.value] || 'month'),
      fetchAbnormalOrders(),
      fetchServiceQuality(),
    ])

    const failedCount = results.filter((item) => item.status === 'rejected').length
    if (failedCount !== 0) ElMessage.warning(`总览数据已刷新，${failedCount} 项数据更新失败`)
  } catch (e) {
    ElMessage.error('总览数据刷新失败')
    console.error(e)
  } finally {
    refreshing.value = false
  }
}

async function handlePeriodChange(v) {
  const periodMap = { 7: 'week', 30: 'month', 90: 'quarter' }
  await fetchRevenueTrend(periodMap[v] || 'month')
}

async function handleDateRangeChange() {
  await refreshData()
}

function handleExportOverview() {
  const rows = [
    { 模块: '概览', 指标: '总用户数', 值: metrics.totalUsers, 备注: `日增 ${metrics.newUsers}` },
    { 模块: '概览', 指标: '订单总数', 值: metrics.totalOrders, 备注: `完成率 ${metrics.completionRate}%` },
    { 模块: '概览', 指标: '总任务数', 值: metrics.totalTasks, 备注: `新增 ${metrics.newTasks}` },
    { 模块: '概览', 指标: '平台收入', 值: metrics.totalRevenue, 备注: `抽成 ${commissionRatio.value}%` },
    { 模块: '实时', 指标: '在线用户', 值: realtime.onlineUsers, 备注: `在线配送员 ${realtime.onlineDeliverers}` },
    { 模块: '实时', 指标: '待处理订单', 值: realtime.pendingOrders, 备注: `进行中 ${realtime.activeOrders}` },
    { 模块: '实时', 指标: '近1小时新订单', 值: realtime.newOrdersLastHour, 备注: `近1小时完成 ${realtime.completedOrdersLastHour}` },
    { 模块: '实时', 指标: 'API调用次数', 值: realtime.apiCallsLastHour, 备注: realtime.systemHealth },
    ...trendSource.value.map((item) => ({
      模块: '收入趋势',
      指标: item.date,
      值: item.revenue,
      备注: `抽成笔数 ${item.transaction_count || 0}`,
    })),
  ]

  exportCsvFile(rows, '数据看板', dateRange.value)
  ElMessage.success(`已导出 ${rows.length} 条总览数据`)
}

onMounted(async () => {
  const end = new Date(),
    start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  await refreshData()
})
</script>

<style scoped>
/* =============================================
   CSS 变量 — 所有颜色/间距只改这里
   ============================================= */
.dashboard {
  --clr-indigo: #4f6ef7;
  --clr-blue: #3b82f6;
  --clr-green: #10b981;
  --clr-orange: #f97316;
  --clr-slate: #64748b;

  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;

  --border: #e8edf5;
  --bg-card: #ffffff;
  --bg-subtle: #f7f9fc;

  --radius-card: 12px;
  --radius-icon: 10px;
  --transition: 0.2s ease;

  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 0 24px;
}

/* =============================================
   Stat Cards
   ============================================= */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius-card);
  background: var(--bg-card);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

/* 顶部颜色条 */
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.theme-indigo::before {
  background: linear-gradient(90deg, #4f6ef7, #818cf8);
}
.theme-blue::before {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}
.theme-green::before {
  background: linear-gradient(90deg, #10b981, #34d399);
}
.theme-orange::before {
  background: linear-gradient(90deg, #f97316, #fbbf24);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-icon);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 图标配色 */
.theme-indigo .stat-icon {
  background: rgba(79, 110, 247, 0.1);
  color: #4f6ef7;
}
.theme-blue .stat-icon {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.theme-green .stat-icon {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.theme-orange .stat-icon {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.stat-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.stat-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-value {
  font-size: 1.55rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
  line-height: 1;
}

.stat-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* =============================================
   Overview Grid（图表 + 侧边卡片）
   ============================================= */
.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(300px, 0.9fr);
  gap: 16px;
}

/* 图表卡片 */
.chart-card {
  border-radius: var(--radius-card) !important;
}

/* 侧边两卡片纵排 */
.side-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* alert-card & entry-card 共用基础 */
.alert-card,
.entry-card {
  border-radius: var(--radius-card) !important;
  background: linear-gradient(145deg, #fff 0%, #f5f7ff 100%) !important;
  border: 1px solid rgba(79, 110, 247, 0.1) !important;
}

/* =============================================
   卡片通用 header/title/desc
   ============================================= */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.card-subtitle {
  font-size: 0.78rem;
  color: var(--text-secondary);
  display: block;
  margin-top: 2px;
}

.card-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 4px 0 0;
  line-height: 1.6;
}

.badge-label {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  color: #4f6ef7;
  margin-bottom: 12px;
}

/* 异常订单大数字 */
.alert-number {
  font-size: 2.2rem;
  font-weight: 700;
  color: #3730a3;
  font-family: 'Fira Code', monospace;
  margin: 14px 0 10px;
}

.alert-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

/* 分析入口 */
.entry-card-header {
  align-items: center;
}

/* Pill 网格 */
.pill-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 16px;
}

.pill {
  padding: 12px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(79, 110, 247, 0.08);
  text-align: center;
}
.pill span {
  display: block;
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.pill strong {
  font-size: 0.95rem;
  color: var(--text-primary);
}

/* =============================================
   Bottom Grid
   ============================================= */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1.35fr 1fr;
  gap: 16px;
}

/* 快捷入口 */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 10px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  text-decoration: none;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 500;
  transition:
    transform var(--transition),
    background var(--transition);
}
.quick-item:hover {
  transform: translateY(-2px);
  background: #fff;
}

.quick-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-icon);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 快捷入口图标颜色 */
.qi {
  background: rgba(79, 110, 247, 0.1);
  color: #4f6ef7;
}
.qo {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.qt {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.qf {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}
.qa {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}
.qs {
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
}

/* =============================================
   通用列表（运营摘要 & 待处理）
   ============================================= */
.list-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.list-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}
.dot.primary {
  background: #4f6ef7;
}
.dot.success {
  background: #10b981;
}
.dot.warning {
  background: #f59e0b;
}
.dot.danger {
  background: #ef4444;
}

/* 待处理优先级点 */
.priority-dot {
  background: #6366f1;
}
.p-urgent .priority-dot {
  background: #ef4444;
}
.p-high .priority-dot {
  background: #f59e0b;
}
.p-normal .priority-dot {
  background: #4f6ef7;
}

.item-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.item-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.flex-1 {
  flex: 1;
  min-width: 0;
}

/* =============================================
   通用链接
   ============================================= */
.text-link {
  color: #4f6ef7;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.text-link:hover {
  text-decoration: underline;
}

/* =============================================
   响应式
   ============================================= */
@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .overview-grid {
    grid-template-columns: 1fr;
  }
  .bottom-grid {
    grid-template-columns: 1fr;
  }
  .pill-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .pill-grid {
    grid-template-columns: 1fr;
  }
}
</style>
