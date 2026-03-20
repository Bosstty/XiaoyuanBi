<template>
  <div class="dashboard">
    <!-- 页面头部 -->
    <DashboardFilterHeader
      v-model="dateRange"
      title="数据分析"
      subtitle="平台运营数据统计与分析报表"
      filter-label="统计范围"
      filter-hint="默认展示最近30天，可按需调整"
      :action-icon="Download"
      action-label="导出报告"
      @change="handleDateRangeChange"
      @action="exportReport"
    />

    <!-- ① 核心指标卡片 -->
    <div class="stats-grid">
      <div class="stat-card stat-revenue">
        <div class="stat-icon">
          <el-icon :size="22"><Money /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">总收入</span>
          <div class="stat-value-row">
            <span class="stat-value">¥{{ formatNumber(metrics.totalRevenue) }}</span>
            <el-tag
              :type="metrics.revenueGrowth >= 0 ? 'success' : 'danger'"
              size="small"
              effect="dark"
              round
            >
              {{ metrics.revenueGrowth >= 0 ? '+' : '' }}{{ metrics.revenueGrowth.toFixed(1) }}%
            </el-tag>
          </div>
          <div class="stat-meta">
            <span>已完成订单 {{ metrics.completedOrders }} 笔</span>
          </div>
        </div>
      </div>

      <div class="stat-card stat-orders">
        <div class="stat-icon">
          <el-icon :size="22"><Box /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">订单总数</span>
          <div class="stat-value-row">
            <span class="stat-value">{{ formatNumber(metrics.totalOrders) }}</span>
            <el-tag type="primary" size="small" effect="dark" round
              >新增 {{ metrics.newOrders }}</el-tag
            >
          </div>
          <div class="stat-meta">
            <span
              >已完成 {{ metrics.completedOrders }} &nbsp;·&nbsp; 完成率
              {{ metrics.completionRate }}%</span
            >
          </div>
        </div>
      </div>

      <div class="stat-card stat-users">
        <div class="stat-icon">
          <el-icon :size="22"><User /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">用户</span>
          <div class="stat-value-row">
            <span class="stat-value">{{ formatNumber(metrics.totalUsers) }}</span>
            <el-tag type="warning" size="small" effect="dark" round
              >新增 {{ metrics.newUsers }}</el-tag
            >
          </div>
          <div class="stat-meta">
            <span
              >配送员 {{ metrics.totalDeliverers }} 人 &nbsp;·&nbsp; 在线
              {{ metrics.onlineDeliverers }} 人</span
            >
          </div>
        </div>
      </div>

      <div class="stat-card stat-avg">
        <div class="stat-icon">
          <el-icon :size="22"><TrendCharts /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">平均订单价值</span>
          <div class="stat-value-row">
            <span class="stat-value">¥{{ metrics.avgOrderValue.toFixed(2) }}</span>
            <el-tag type="success" size="small" effect="dark" round
              >任务 {{ metrics.totalTasks }}</el-tag
            >
          </div>
          <div class="stat-meta">
            <span>新增任务 {{ metrics.newTasks }} 个</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ② 收入趋势 + 订单状态 -->
    <div class="charts-grid charts-grid-7-3">
      <!-- 收入趋势折线图 -->
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <div class="chart-title-group">
              <h3>收入趋势</h3>
              <span class="chart-subtitle">过去30天每日平台抽成统计</span>
            </div>
          </div>
        </template>
        <v-chart :option="revenueChartOption" style="height: 300px" autoresize />
      </el-card>

      <!-- 订单状态分布饼图 -->
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <div class="chart-title-group">
              <h3>订单状态分布</h3>
              <span class="chart-subtitle">各状态订单数量</span>
            </div>
          </div>
        </template>
        <v-chart :option="orderStatusChartOption" style="height: 300px" autoresize />
      </el-card>
    </div>

    <!-- ③ 收入来源 + 支付方式 + 佣金 -->
    <div class="charts-grid charts-grid-3col">
      <!-- 收入来源类型 -->
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <div class="chart-title-group">
              <h3>收入来源分布</h3>
              <span class="chart-subtitle">订单与任务抽成占比</span>
            </div>
          </div>
        </template>
        <v-chart :option="revenueByTypeChartOption" style="height: 260px" autoresize />
      </el-card>

      <!-- 支付方式分布 -->
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <div class="chart-title-group">
              <h3>支付方式分布</h3>
              <span class="chart-subtitle">抽成对应支付渠道金额</span>
            </div>
          </div>
        </template>
        <v-chart :option="paymentMethodChartOption" style="height: 260px" autoresize />
      </el-card>

      <!-- 佣金统计 -->
      <el-card class="chart-card commission-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <div class="chart-title-group">
              <h3>佣金统计</h3>
              <span class="chart-subtitle">平台抽成收益</span>
            </div>
          </div>
        </template>
        <div class="commission-body">
          <div class="commission-big">
            <div class="commission-icon">
              <el-icon :size="28"><Money /></el-icon>
            </div>
            <div>
              <div class="commission-label">总佣金收入</div>
              <div class="commission-val">¥{{ formatNumber(commissionStats.totalCommission) }}</div>
            </div>
          </div>
          <el-divider />
          <div class="commission-row">
            <div class="commission-info-item">
              <div class="ci-label">平均佣金费率</div>
              <div class="ci-val rate">
                {{ (commissionStats.avgCommissionRate * 100).toFixed(1) }}%
              </div>
            </div>
            <div class="commission-info-item">
              <div class="ci-label">总收入</div>
              <div class="ci-val">¥{{ formatNumber(metrics.totalRevenue) }}</div>
            </div>
          </div>
          <div class="commission-progress-wrap">
            <div class="cp-label">
              <span>佣金 / 总收入占比</span>
              <span class="cp-pct">{{ commissionRatio }}%</span>
            </div>
            <el-progress
              :percentage="Number(commissionRatio)"
              :stroke-width="10"
              :show-text="false"
              color="#6366f1"
            />
          </div>
          <!-- 支付方式金额明细 -->
          <el-divider />
          <div class="payment-detail-list">
            <div v-for="item in paymentList" :key="item.name" class="pd-item">
              <span class="pd-dot" :style="{ background: item.color }"></span>
              <span class="pd-name">{{ item.name }}</span>
              <span class="pd-count">{{ item.count }} 笔</span>
              <span class="pd-amount">¥{{ formatNumber(item.amount) }}</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- ④ 收入明细 -->
    <el-card class="chart-card revenue-detail-card" shadow="never">
      <template #header>
        <div class="chart-header">
          <div class="chart-title-group">
            <h3>收入明细</h3>
            <span class="chart-subtitle">按日期、来源和支付方式查看平台抽成明细</span>
          </div>
          <div class="revenue-inline-pager" v-if="revenueDetails.length > 0">
            <el-button circle size="small" @click="prevRevenuePage">
              <span class="pager-arrow">‹</span>
            </el-button>
            <span class="pager-text"
              >{{ revenuePagination.currentPage }} / {{ revenuePageCount }}</span
            >
            <el-button circle size="small" @click="nextRevenuePage">
              <span class="pager-arrow">›</span>
            </el-button>
          </div>
        </div>
      </template>
      <el-table
        :data="pagedRevenueDetails"
        stripe
        class="revenue-detail-table"
        max-height="360"
        @row-click="openRevenueDetail"
      >
        <el-table-column prop="date" label="日期" min-width="120" />
        <el-table-column prop="typeLabel" label="收入类型" min-width="120" />
        <el-table-column prop="paymentMethodLabel" label="支付方式" min-width="120" />
        <el-table-column prop="count" label="抽成笔数" min-width="100" align="center" />
        <el-table-column label="平均费率" min-width="120" align="center">
          <template #default="{ row }">{{ row.avgCommissionRate }}%</template>
        </el-table-column>
        <el-table-column label="抽成金额" min-width="140" align="right">
          <template #default="{ row }">
            <span class="rd-amount">¥{{ formatNumber(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openRevenueDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer
      v-model="revenueDetailVisible"
      size="32%"
      class="revenue-detail-drawer"
      destroy-on-close
    >
      <template #header>
        <div class="drawer-header">
          <div class="drawer-title-block">
            <div class="drawer-kicker">Revenue Detail</div>
            <h3>{{ selectedRevenueDetail?.typeLabel || '收入明细详情' }}</h3>
            <p>{{ selectedRevenueDetail?.date || '查看平台抽成统计详情' }}</p>
          </div>
        </div>
      </template>

      <div v-if="selectedRevenueDetail" v-loading="revenueDetailLoading" class="detail-drawer-body">
        <div class="detail-overview-grid">
          <div class="detail-overview-card">
            <span>抽成金额</span>
            <strong>¥{{ formatNumber(selectedRevenueDetail.amount) }}</strong>
            <em>{{ selectedRevenueDetail.count }} 笔抽成</em>
          </div>
          <div class="detail-overview-card">
            <span>平均费率</span>
            <strong>{{ selectedRevenueDetail.avgCommissionRate }}%</strong>
            <em>{{ selectedRevenueDetail.paymentMethodLabel }}</em>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">统计信息</div>
          <div class="detail-info-grid">
            <div class="detail-info-item">
              <label>统计日期</label>
              <span>{{ selectedRevenueDetail.date }}</span>
            </div>
            <div class="detail-info-item">
              <label>收入类型</label>
              <span>{{ selectedRevenueDetail.typeLabel }}</span>
            </div>
            <div class="detail-info-item">
              <label>支付方式</label>
              <span>{{ selectedRevenueDetail.paymentMethodLabel }}</span>
            </div>
            <div class="detail-info-item">
              <label>抽成笔数</label>
              <span>{{ selectedRevenueDetail.count }}</span>
            </div>
            <div class="detail-info-item">
              <label>平均费率</label>
              <span>{{ selectedRevenueDetail.avgCommissionRate }}%</span>
            </div>
            <div class="detail-info-item">
              <label>抽成金额</label>
              <span>¥{{ formatNumber(selectedRevenueDetail.amount) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">关联订单/任务</div>
          <el-table
            :data="revenueDetailItems"
            size="small"
            stripe
            class="revenue-detail-items-table"
          >
            <el-table-column prop="business_no" label="业务单号" min-width="150" />
            <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="owner_name" label="用户" min-width="100" />
            <el-table-column prop="paymentMethodLabel" label="支付方式" min-width="100" />
            <el-table-column prop="amount" label="交易金额" min-width="100" align="right">
              <template #default="{ row }">¥{{ formatNumber(row.amount) }}</template>
            </el-table-column>
            <el-table-column
              prop="commissionRateText"
              label="抽成费率"
              min-width="100"
              align="center"
            />
            <el-table-column
              prop="commission_amount"
              label="抽成金额"
              min-width="100"
              align="right"
            >
              <template #default="{ row }">¥{{ formatNumber(row.commission_amount) }}</template>
            </el-table-column>
            <el-table-column prop="statusLabel" label="状态" min-width="90" align="center" />
          </el-table>
        </div>
      </div>
    </el-drawer>

    <!-- ⑤ 用户行为 + 热门操作 -->
    <div class="charts-grid charts-grid-7-3">
      <!-- 用户活跃度 -->
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <div class="chart-title-group">
              <h3>用户活跃度</h3>
              <span class="chart-subtitle">活跃用户 & 操作次数</span>
            </div>
          </div>
        </template>
        <v-chart :option="userActivityChartOption" style="height: 260px" autoresize />
      </el-card>

      <!-- 热门操作 Top10 -->
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <div class="chart-title-group">
              <h3>热门操作 Top10</h3>
              <span class="chart-subtitle">用户行为频次</span>
            </div>
          </div>
        </template>
        <div class="popular-actions">
          <div v-for="(item, idx) in popularActions" :key="item.action" class="pa-item">
            <span class="pa-rank" :class="idx < 3 ? 'top3' : ''">{{ idx + 1 }}</span>
            <span class="pa-name">{{ formatAction(item.action) }}</span>
            <div class="pa-bar-wrap">
              <div
                class="pa-bar"
                :style="{
                  width: (item.count / popularActions[0].count) * 100 + '%',
                  background: getBarColor(idx),
                }"
              ></div>
            </div>
            <span class="pa-count">{{ item.count }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- ⑥ 用户留存 -->
    <div class="charts-grid charts-grid-3col">
      <el-card
        class="chart-card retention-card"
        shadow="never"
        v-for="(item, idx) in retentionItems"
        :key="idx"
      >
        <div class="retention-body">
          <div class="retention-icon" :style="{ background: item.bgColor, color: item.color }">
            <el-icon :size="24"><User /></el-icon>
          </div>
          <div class="retention-info">
            <div class="retention-label">{{ item.label }}</div>
            <div class="retention-val">{{ item.value }}%</div>
            <div class="retention-desc">{{ item.desc }}</div>
          </div>
          <el-progress
            type="circle"
            :percentage="item.value"
            :width="64"
            :stroke-width="6"
            :color="item.color"
          />
        </div>
      </el-card>
    </div>

    <!-- ⑦ 服务质量：评分分布 + 配送员排行（整行独立布局） -->
    <div class="charts-grid charts-grid-4-6 charts-grid-stretch">
      <!-- 评分分布 -->
      <el-card class="chart-card rating-stretch-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <div class="chart-title-group">
              <h3>用户评分分布</h3>
              <span class="chart-subtitle">订单满意度反馈</span>
            </div>
            <div class="rating-summary">
              <span class="rating-avg"
                >投诉数：<strong>{{ serviceQuality.complaints }}</strong></span
              >
            </div>
          </div>
        </template>
        <v-chart :option="ratingChartOption" class="rating-chart-stretch" autoresize />
      </el-card>

      <!-- 配送员排行榜 -->
      <el-card class="chart-card deliverer-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <div class="chart-title-group">
              <h3>配送员绩效排行</h3>
              <span class="chart-subtitle">评分 · 完成订单 · 完成率</span>
            </div>
          </div>
        </template>
        <el-table :data="delivererPerformance" size="small" style="width: 100%" stripe>
          <el-table-column label="排名" width="52" align="center">
            <template #default="{ $index }">
              <span class="rank-badge" :class="$index < 3 ? 'rank-top' : ''">{{ $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="username" label="配送员" min-width="80" align="center" />
          <el-table-column label="评分" min-width="130" align="center">
            <template #default="{ row }">
              <div class="rating-cell">
                <el-rate :model-value="Number(row.rating)" disabled :max="5" size="small" />
                <span class="rating-num">{{ Number(row.rating).toFixed(2) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="completed_orders" label="完成单" min-width="70" align="center" />
          <el-table-column prop="total_orders" label="总接单" min-width="70" align="center" />
          <el-table-column label="完成率" min-width="90" align="center">
            <template #default="{ row }">
              <el-tag
                :type="Number(row.completion_rate) >= 100 ? 'success' : 'warning'"
                size="small"
                effect="light"
                round
              >
                {{ Number(row.completion_rate).toFixed(1) }}%
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- ⑦ 异常订单预警 -->
    <AbnormalOrderWorkbench :alerts="abnormalAlerts" :orders="abnormalOrders" />

    <!-- ⑧ 实时监控 -->
    <el-card class="chart-card pending-card" shadow="never">
      <template #header>
        <div class="chart-header">
          <div class="chart-title-group">
            <h3>实时监控</h3>
            <span class="chart-subtitle">每5秒自动刷新</span>
          </div>
          <el-tag type="success" size="small" effect="dark" round>
            <el-icon class="is-loading"><Loading /></el-icon>
            实时更新中
          </el-tag>
        </div>
      </template>
      <div class="monitor-grid">
        <div class="monitor-item" v-for="item in monitorItems" :key="item.label">
          <div class="monitor-icon" :class="item.iconClass">
            <el-icon :size="22"><component :is="item.icon" /></el-icon>
          </div>
          <div class="monitor-content">
            <span class="monitor-label">{{ item.label }}</span>
            <span class="monitor-value">{{ item.value }}</span>
            <span class="monitor-sub">{{ item.sub }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Money,
  Box,
  User,
  TrendCharts,
  Download,
  Refresh,
  Loading,
  Timer,
  Cpu,
  Check,
} from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import { analyticsApi } from '@/api'
import { exportCsvFile } from '@/utils/export'
import AbnormalOrderWorkbench from './components/AbnormalOrderWorkbench.vue'
import DashboardFilterHeader from './components/DashboardFilterHeader.vue'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

// ─── 基础状态 ───────────────────────────────────────────
const dateRange = ref([])
let realtimeTimer = null

// ─── 核心指标 ────────────────────────────────────────────
const metrics = reactive({
  totalRevenue: 0,
  completedOrders: 0,
  totalOrders: 0,
  newOrders: 0,
  totalUsers: 0,
  newUsers: 0,
  totalDeliverers: 0,
  onlineDeliverers: 0,
  avgOrderValue: 0,
  revenueGrowth: 0,
  totalTasks: 0,
  newTasks: 0,
  completionRate: 0,
})

// ─── 实时数据 ─────────────────────────────────────────────
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

const monitorItems = computed(() => [
  {
    label: '在线用户',
    value: realtime.onlineUsers,
    sub: `${realtime.onlineDeliverers} 配送员在线`,
    iconClass: 'online',
    icon: 'User',
  },
  {
    label: '待处理订单',
    value: realtime.pendingOrders,
    sub: `${realtime.activeOrders} 进行中`,
    iconClass: 'orders',
    icon: 'Box',
  },
  {
    label: '近1小时新订单',
    value: realtime.newOrdersLastHour,
    sub: `${realtime.completedOrdersLastHour} 已完成`,
    iconClass: 'load',
    icon: 'Cpu',
  },
  {
    label: 'API调用(近1小时)',
    value: realtime.apiCallsLastHour,
    sub: realtime.systemHealth === 'normal' ? '系统正常' : '系统异常',
    iconClass: realtime.systemHealth === 'normal' ? 'response' : 'alert',
    icon: 'Timer',
  },
])

// ─── 收入相关 ─────────────────────────────────────────────
const commissionStats = reactive({ totalCommission: 0, avgCommissionRate: 0 })
const commissionRatio = computed(() => {
  if (!metrics.totalRevenue) return '0.00'
  return ((commissionStats.totalCommission / metrics.totalRevenue) * 100).toFixed(2)
})

const paymentList = ref([])
const revenueDetails = ref([])
const revenueDetailVisible = ref(false)
const selectedRevenueDetail = ref(null)
const revenueDetailItems = ref([])
const revenueDetailLoading = ref(false)
const revenuePagination = reactive({
  currentPage: 1,
  pageSize: 8,
})
const revenuePageCount = computed(() =>
  Math.max(1, Math.ceil(revenueDetails.value.length / revenuePagination.pageSize)),
)
const pagedRevenueDetails = computed(() => {
  const start = (revenuePagination.currentPage - 1) * revenuePagination.pageSize
  return revenueDetails.value.slice(start, start + revenuePagination.pageSize)
})

// ─── 服务质量 ─────────────────────────────────────────────
const serviceQuality = reactive({ complaints: 0 })
const delivererPerformance = ref([])
const ratingDistribution = ref([])

// ─── 用户行为 ─────────────────────────────────────────────
const popularActions = ref([])
const retention = reactive({ day_1: 0, day_7: 0, day_30: 0 })
const retentionItems = computed(() => [
  {
    label: '次日留存率',
    value: retention.day_1,
    desc: '注册次日回访',
    bgColor: 'rgba(99,102,241,0.1)',
    color: '#6366f1',
  },
  {
    label: '7日留存率',
    value: retention.day_7,
    desc: '7天内回访',
    bgColor: 'rgba(59,130,246,0.1)',
    color: '#3b82f6',
  },
  {
    label: '30日留存率',
    value: retention.day_30,
    desc: '30天内回访',
    bgColor: 'rgba(16,185,129,0.1)',
    color: '#10b981',
  },
])

// ─── 异常订单 ─────────────────────────────────────────────
const abnormalAlerts = ref([])
const abnormalOrders = ref([])

// ─── 图表配置 ─────────────────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.97)',
  borderColor: '#e2e8f0',
  borderWidth: 1,
  textStyle: { color: '#0f172a' },
}
const AXIS_STYLE = {
  axisLine: { lineStyle: { color: '#e2e8f0' } },
  axisLabel: { color: '#64748b' },
  splitLine: { lineStyle: { color: '#f1f5f9' } },
}

// 收入趋势
const revenueChartOption = ref({
  tooltip: {
    trigger: 'axis',
    ...TOOLTIP_STYLE,
    axisPointer: {
      type: 'cross',
      crossStyle: { color: '#94a3b8' },
    },
  },
  legend: {
    data: ['收入'],
    bottom: 0,
    textStyle: { color: '#64748b' },
  },
  grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: [], ...AXIS_STYLE },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisLabel: { color: '#64748b', formatter: (v) => `¥${v}` },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
  },
  series: [
    {
      name: '收入',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 3, color: '#6366f1' },
      itemStyle: { color: '#6366f1', borderWidth: 2, borderColor: '#fff' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
            { offset: 1, color: 'rgba(99, 102, 241, 0.05)' },
          ],
        },
      },
      data: [],
    },
  ],
})

// 订单状态
const orderStatusChartOption = ref({
  tooltip: { trigger: 'item', ...TOOLTIP_STYLE, formatter: '{b}: {c} 单 ({d}%)' },
  legend: { show: false },
  series: [
    {
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['50%', '52%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{c}单',
        fontSize: 12,
        color: '#64748b',
        lineHeight: 18,
      },
      labelLine: { show: true, length: 8, length2: 12, lineStyle: { color: '#cbd5e1' } },
      emphasis: {
        label: { show: true, fontSize: 13, fontWeight: 'bold' },
        itemStyle: {},
      },
      data: [],
    },
  ],
})

// 收入来源
const revenueByTypeChartOption = ref({
  tooltip: { trigger: 'item', ...TOOLTIP_STYLE, formatter: '{b}: ¥{c} ({d}%)' },
  legend: { show: false },
  series: [
    {
      type: 'pie',
      radius: ['40%', '68%'],
      center: ['50%', '52%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{d}%',
        fontSize: 12,
        color: '#64748b',
        lineHeight: 18,
      },
      labelLine: { show: true, length: 8, length2: 12, lineStyle: { color: '#cbd5e1' } },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: [],
    },
  ],
})

// 支付方式
const paymentMethodChartOption = ref({
  tooltip: { trigger: 'item', ...TOOLTIP_STYLE, formatter: '{b}: ¥{c} ({d}%)' },
  legend: { show: false },
  series: [
    {
      type: 'pie',
      radius: ['40%', '68%'],
      center: ['50%', '52%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{d}%',
        fontSize: 12,
        color: '#64748b',
        lineHeight: 18,
      },
      labelLine: { show: true, length: 8, length2: 12, lineStyle: { color: '#cbd5e1' } },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: [],
    },
  ],
})

// 用户活跃度
const userActivityChartOption = ref({
  tooltip: { trigger: 'axis', ...TOOLTIP_STYLE },
  legend: { data: ['活跃用户', '操作次数'], bottom: 0, textStyle: { color: '#64748b' } },
  grid: { left: '3%', right: '4%', bottom: '14%', top: '8%', containLabel: true },
  xAxis: { type: 'category', data: [], ...AXIS_STYLE },
  yAxis: [
    {
      type: 'value',
      name: '用户数',
      axisLine: { show: false },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    {
      type: 'value',
      name: '操作数',
      axisLine: { show: false },
      axisLabel: { color: '#64748b' },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: '活跃用户',
      type: 'bar',
      barWidth: '30%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#6366f1' },
            { offset: 1, color: '#818cf8' },
          ],
        },
      },
      data: [],
    },
    {
      name: '操作次数',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      lineStyle: { color: '#f59e0b', width: 2 },
      itemStyle: { color: '#f59e0b' },
      data: [],
    },
  ],
})

// 评分分布
const ratingChartOption = ref({
  tooltip: { trigger: 'axis', ...TOOLTIP_STYLE },
  grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
  xAxis: { type: 'category', data: ['0星', '1星', '2星', '3星', '4星', '5星'], ...AXIS_STYLE },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisLabel: { color: '#64748b' },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
  },
  series: [
    {
      type: 'bar',
      barWidth: '40%',
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: (params) => {
          const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981']
          return colors[params.dataIndex] || '#6366f1'
        },
      },
      data: [],
    },
  ],
})

// ─── 辅助函数 ─────────────────────────────────────────────
const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return new Intl.NumberFormat('zh-CN').format(Math.round(num * 100) / 100)
}

const formatAction = (action) => {
  const map = {
    'user.logout': '用户退出',
    'order.cancel': '取消订单',
    'task.create': '发布任务',
    'order.complete': '完成订单',
    'recharge.create': '充值',
    'order.update': '更新订单',
    'task.accept': '接受任务',
    'user.register': '用户注册',
    'task.complete': '完成任务',
    'forum.comment.create': '发表评论',
  }
  return map[action] || action
}

const getBarColor = (idx) => {
  const colors = [
    '#6366f1',
    '#3b82f6',
    '#f59e0b',
    '#10b981',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#84cc16',
    '#06b6d4',
  ]
  return colors[idx] || '#6366f1'
}

const getRevenueTypeLabel = (type) => {
  const typeNames = {
    pickup_order: '代取抽成',
    task: '任务抽成',
  }
  return typeNames[type] || type || '-'
}

const getPaymentMethodLabel = (method) => {
  const methodNames = {
    alipay: '支付宝',
    balance: '余额',
    wechat: '微信支付',
    bank_card: '银行卡',
  }
  return methodNames[method] || method || '未记录'
}

const getBusinessStatusLabel = (status) => {
  const map = {
    pending: '待处理',
    accepted: '已接单',
    picking: '取件中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
    published: '已发布',
    in_progress: '进行中',
    expired: '已过期',
  }
  return map[status] || status || '-'
}

const prevRevenuePage = () => {
  if (revenuePagination.currentPage > 1) revenuePagination.currentPage -= 1
}

const nextRevenuePage = () => {
  if (revenuePagination.currentPage < revenuePageCount.value) revenuePagination.currentPage += 1
}

const openRevenueDetail = async (row) => {
  selectedRevenueDetail.value = row
  revenueDetailVisible.value = true
  revenueDetailLoading.value = true
  revenueDetailItems.value = []

  try {
    const res = await analyticsApi.getRevenueDetailItems({
      ...getAnalyticsQueryParams(),
      date: row.date,
      type: row.type,
      payment_method: row.payment_method,
    })

    if (res.success && res.data) {
      revenueDetailItems.value = (res.data.items || []).map((item) => ({
        ...item,
        businessTypeLabel: getRevenueTypeLabel(item.business_type),
        paymentMethodLabel: getPaymentMethodLabel(item.payment_method),
        statusLabel: getBusinessStatusLabel(item.status),
        commissionRateText: `${((parseFloat(item.commission_rate) || 0) * 100).toFixed(1)}%`,
      }))
    }
  } catch {
    ElMessage.error('收入关联订单获取失败')
  } finally {
    revenueDetailLoading.value = false
  }
}

const getAnalyticsQueryParams = () => {
  const params = {}

  if (dateRange.value?.length === 2) {
    params.start_date = dateRange.value[0]
    params.end_date = dateRange.value[1]
  }

  return params
}

// ─── 数据获取 ─────────────────────────────────────────────
const fetchDashboardData = async () => {
  const res = await analyticsApi.getDashboardStats(getAnalyticsQueryParams())
  if (res.success) {
    const d = res.data
    metrics.totalRevenue = d.revenue || 0
    metrics.totalOrders = d.orders?.total || 0
    metrics.newOrders = d.orders?.new || 0
    metrics.completedOrders = d.orders?.completed || 0
    metrics.completionRate =
      metrics.totalOrders > 0
        ? ((metrics.completedOrders / metrics.totalOrders) * 100).toFixed(1)
        : 0
    metrics.totalUsers = d.users?.total || 0
    metrics.newUsers = d.users?.new || 0
    metrics.totalDeliverers = d.deliverers?.total || 0
    metrics.onlineDeliverers = d.deliverers?.online || 0
    metrics.totalTasks = d.tasks?.total || 0
    metrics.newTasks = d.tasks?.new || 0
    metrics.avgOrderValue =
      metrics.completedOrders > 0 ? metrics.totalRevenue / metrics.completedOrders : 0
    metrics.revenueGrowth = metrics.newUsers > 0 ? metrics.newUsers * 2 : 0
  }
}

const fetchRevenueData = async () => {
  const res = await analyticsApi.getRevenueStats(getAnalyticsQueryParams())
  if (res.success && res.data) {
    const d = res.data

    // 收入趋势
    if (d.revenue_trend) {
      revenueChartOption.value.xAxis.data = d.revenue_trend.map((i) => i.date)
      revenueChartOption.value.series[0].data = d.revenue_trend.map(
        (i) => parseFloat(i.revenue) || 0,
      )
    }

    // 收入来源
    if (d.revenue_by_type) {
      const typeColors = {
        pickup_order: '#6366f1',
        task: '#10b981',
      }
      revenueByTypeChartOption.value.series[0].data = d.revenue_by_type.map((i) => ({
        name: getRevenueTypeLabel(i.type),
        value: parseFloat(i.amount) || 0,
        itemStyle: { color: typeColors[i.type] || '#94a3b8' },
      }))
    }

    // 支付方式
    if (d.payment_method_distribution) {
      const methodColors = { alipay: '#1677ff', balance: '#ff6b6b', wechat: '#07c160' }
      paymentMethodChartOption.value.series[0].data = d.payment_method_distribution.map((i) => ({
        name: getPaymentMethodLabel(i.payment_method),
        value: parseFloat(i.amount) || 0,
        itemStyle: { color: methodColors[i.payment_method] || '#94a3b8' },
      }))
      paymentList.value = d.payment_method_distribution.map((i) => ({
        name: getPaymentMethodLabel(i.payment_method),
        amount: parseFloat(i.amount) || 0,
        count: i.count,
        color: methodColors[i.payment_method] || '#94a3b8',
      }))
    }

    // 佣金
    if (d.commission_stats) {
      commissionStats.totalCommission = parseFloat(d.commission_stats.total_commission) || 0
      commissionStats.avgCommissionRate = parseFloat(d.commission_stats.avg_commission_rate) || 0
    }

    // 收入明细
    revenueDetails.value = (d.revenue_details || []).map((i) => ({
      date: i.date,
      type: i.type,
      payment_method: i.payment_method,
      typeLabel: getRevenueTypeLabel(i.type),
      paymentMethodLabel: getPaymentMethodLabel(i.payment_method),
      count: parseInt(i.count) || 0,
      amount: parseFloat(i.amount) || 0,
      avgCommissionRate: ((parseFloat(i.avg_commission_rate) || 0) * 100).toFixed(1),
    }))
    revenuePagination.currentPage = 1
  }
}

const fetchServiceQualityData = async () => {
  const res = await analyticsApi.getServiceQualityStats(getAnalyticsQueryParams())
  if (res.success && res.data) {
    const d = res.data
    serviceQuality.complaints = d.complaints || 0

    // 订单状态饼图
    if (d.order_metrics) {
      const statusNames = {
        pending: '待接单',
        accepted: '已接单',
        picking: '取件中',
        delivering: '配送中',
        completed: '已完成',
        cancelled: '已取消',
      }
      const statusColors = {
        pending: '#f59e0b',
        accepted: '#3b82f6',
        picking: '#6366f1',
        delivering: '#8b5cf6',
        completed: '#10b981',
        cancelled: '#ef4444',
      }
      orderStatusChartOption.value.series[0].data = d.order_metrics.map((i) => ({
        name: statusNames[i.status] || i.status,
        value: parseInt(i.count) || 0,
        itemStyle: { color: statusColors[i.status] || '#94a3b8' },
      }))
    }

    // 评分分布
    if (d.rating_distribution) {
      const ratingArr = [0, 0, 0, 0, 0, 0]
      d.rating_distribution.forEach((i) => {
        if (i.rating <= 5) ratingArr[i.rating] = parseInt(i.count) || 0
      })
      ratingChartOption.value.series[0].data = ratingArr
    }

    // 配送员排行
    if (d.deliverer_performance) {
      delivererPerformance.value = d.deliverer_performance.map((i) => ({
        username: i.user?.username || `ID:${i.id}`,
        rating: i.rating,
        completed_orders: i.completed_orders,
        total_orders: i.total_orders,
        completion_rate: i.completion_rate,
      }))
    }
  }
}

const fetchUserBehaviorData = async () => {
  const res = await analyticsApi.getUserBehaviorStats(getAnalyticsQueryParams())
  if (res.success && res.data) {
    const d = res.data

    if (d.user_activity) {
      userActivityChartOption.value.xAxis.data = d.user_activity.map((i) => i.date)
      userActivityChartOption.value.series[0].data = d.user_activity.map(
        (i) => parseInt(i.active_users) || 0,
      )
      userActivityChartOption.value.series[1].data = d.user_activity.map(
        (i) => parseInt(i.total_actions) || 0,
      )
    }

    if (d.popular_actions) popularActions.value = d.popular_actions

    if (d.retention) {
      retention.day_1 = d.retention.day_1 || 0
      retention.day_7 = d.retention.day_7 || 0
      retention.day_30 = d.retention.day_30 || 0
    }
  }
}

const fetchRealtimeData = async () => {
  try {
    const res = await analyticsApi.getRealtimeStats()
    if (res.success) {
      const d = res.data
      realtime.onlineUsers = d.online_users || 0
      realtime.onlineDeliverers = d.online_deliverers || 0
      realtime.pendingOrders = d.pending_orders || 0
      realtime.activeOrders = d.active_orders || 0
      realtime.newOrdersLastHour = d.new_orders_last_hour || 0
      realtime.completedOrdersLastHour = d.completed_orders_last_hour || 0
      realtime.apiCallsLastHour = d.api_calls_last_hour || 0
      realtime.systemHealth = d.system_health || 'normal'
    }
  } catch {}
}

const fetchAbnormalOrders = async () => {
  const res = await analyticsApi.getAbnormalOrderAlerts(getAnalyticsQueryParams())
  if (res.success && res.data) {
    abnormalAlerts.value = res.data.alerts || []
    abnormalOrders.value = res.data.alerts?.[0]?.data || []
  }
}

const fetchAnalyticsData = async () => {
  await Promise.all([
    fetchDashboardData(),
    fetchRevenueData(),
    fetchServiceQualityData(),
    fetchUserBehaviorData(),
    fetchAbnormalOrders(),
  ])
}

// ─── 事件 ─────────────────────────────────────────────────
const handleDateRangeChange = async () => {
  await fetchAnalyticsData()
}

const refreshData = async () => {
  ElMessage.info('数据刷新中...')
  await Promise.all([fetchAnalyticsData(), fetchRealtimeData()])
  ElMessage.success('数据已刷新')
}

const exportReport = () => {
  const rows = [
    { 模块: '核心指标', 指标: '总收入', 值: metrics.totalRevenue, 备注: `增长 ${metrics.revenueGrowth.toFixed(1)}%` },
    { 模块: '核心指标', 指标: '订单总数', 值: metrics.totalOrders, 备注: `完成率 ${metrics.completionRate}%` },
    { 模块: '核心指标', 指标: '用户数', 值: metrics.totalUsers, 备注: `新增 ${metrics.newUsers}` },
    { 模块: '核心指标', 指标: '平均订单价值', 值: metrics.avgOrderValue.toFixed(2), 备注: `任务 ${metrics.totalTasks}` },
    ...revenueDetails.value.map((item) => ({
      模块: '收入明细',
      指标: `${item.date} ${item.typeLabel}`,
      值: item.amount,
      备注: `${item.paymentMethodLabel} / ${item.count}笔 / 费率${item.avgCommissionRate}%`,
    })),
    ...popularActions.value.map((item) => ({
      模块: '热门操作',
      指标: formatAction(item.action),
      值: item.count,
      备注: '用户行为频次',
    })),
    ...delivererPerformance.value.map((item) => ({
      模块: '配送员绩效',
      指标: item.username,
      值: Number(item.completion_rate).toFixed(1),
      备注: `评分 ${Number(item.rating).toFixed(2)} / 完成 ${item.completed_orders}`,
    })),
  ]

  exportCsvFile(rows, '数据分析', dateRange.value)
  ElMessage.success(`已导出 ${rows.length} 条分析数据`)
}

// ─── 生命周期 ─────────────────────────────────────────────
onMounted(async () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]

  await Promise.all([fetchAnalyticsData(), fetchRealtimeData()])

  realtimeTimer = setInterval(fetchRealtimeData, 5000)
})

onUnmounted(() => {
  if (realtimeTimer) clearInterval(realtimeTimer)
})
</script>

<style scoped>
/* ── 页面容器 ───────────────────────────────────────────── */
.dashboard {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── 指标卡片 ────────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 20px 24px;
  border: 1px solid var(--border-color);
  box-shadow: none !important;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  display: none;
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-revenue .stat-icon {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
.stat-orders .stat-icon {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.stat-users .stat-icon {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}
.stat-avg .stat-icon {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-content {
  flex: 1;
  min-width: 0;
}
.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}
.stat-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}
.stat-meta {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  margin-top: 6px;
}

/* ── 图表布局网格 ─────────────────────────────────────────── */
.charts-grid {
  display: grid;
  gap: 16px;
}
.charts-grid-7-3 {
  grid-template-columns: 7fr 3fr;
}
.charts-grid-5-5 {
  grid-template-columns: 1fr 1fr;
}
.charts-grid-4-6 {
  grid-template-columns: 4fr 6fr;
}
.charts-grid-stretch {
  align-items: stretch;
}
.charts-grid-stretch > * {
  height: 100%;
}
.rating-stretch-card {
  display: flex !important;
  flex-direction: column;
}
.rating-stretch-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 16px;
}
.rating-chart-stretch {
  flex: 1;
  min-height: 220px;
}
.charts-grid-3col {
  grid-template-columns: repeat(3, 1fr);
}

.chart-card {
  --el-card-border-color: var(--border-color);
  --el-card-border-radius: var(--radius-xl);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
  box-shadow: none !important;
  background: #fff;
  overflow: hidden;
}
.chart-card :deep(.el-card__header) {
  border-bottom: 1px solid var(--border-color);
}
.chart-card :deep(.el-card__body) {
  box-shadow: none !important;
  background: #fff;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chart-title-group h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.chart-subtitle {
  font-size: 0.78rem;
  color: var(--text-tertiary);
}

/* ── 佣金卡 ──────────────────────────────────────────────── */
.commission-card :deep(.el-card__body) {
  padding: 16px 20px;
}
.commission-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.commission-big {
  display: flex;
  align-items: center;
  gap: 14px;
}
.commission-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.commission-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.commission-val {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}
.commission-row {
  display: flex;
  gap: 16px;
}
.commission-info-item {
  flex: 1;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}
.ci-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.ci-val {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}
.ci-val.rate {
  color: #6366f1;
}
.commission-progress-wrap {
}
.cp-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.cp-pct {
  font-weight: 600;
  color: #6366f1;
}
.payment-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pd-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
}
.pd-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pd-name {
  flex: 1;
  color: var(--text-secondary);
}
.pd-count {
  color: var(--text-tertiary);
}
.pd-amount {
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
  min-width: 80px;
  text-align: right;
}

/* ── 收入明细 ───────────────────────────────────────────── */
.revenue-detail-card :deep(.el-card__body) {
  padding-top: 8px;
}
.revenue-inline-pager {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.18);
}
.revenue-detail-table :deep(.el-table__header th.el-table__cell) {
  background: #f8fafc;
  color: var(--text-secondary);
}
.revenue-detail-table :deep(.el-table__row) {
  cursor: pointer;
}
.rd-amount {
  font-weight: 700;
  color: #4338ca;
  font-family: 'Fira Code', monospace;
}
.revenue-detail-drawer :deep(.el-drawer__header) {
  margin-bottom: 0 !important;
  padding: 20px 24px 10px;
}
.revenue-detail-drawer :deep(.el-drawer__body) {
  padding: 8px 24px 24px;
}
.drawer-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.drawer-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.drawer-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6366f1;
}
.drawer-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}
.drawer-header p {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}
.detail-drawer-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail-overview-grid,
.detail-info-grid {
  display: grid;
  gap: 12px;
}
.detail-overview-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.detail-overview-card,
.detail-section {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(99, 102, 241, 0.12);
  background: #fff;
}
.detail-overview-card {
  display: flex;
  flex-direction: column;
}
.detail-overview-card span,
.detail-info-item label {
  font-size: 0.74rem;
  color: #7c8aa5;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.detail-overview-card strong {
  margin-top: 6px;
  color: #4338ca;
  font-size: 1.15rem;
  font-family: 'Fira Code', monospace;
}
.detail-overview-card em,
.detail-info-item span {
  margin-top: 6px;
  color: #24324a;
  font-style: normal;
}
.detail-section-title {
  margin-bottom: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}
.detail-info-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.detail-info-item {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.08);
}
.detail-info-item span {
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 600;
  color: #1e293b;
  word-break: break-word;
}
.revenue-detail-items-table :deep(.el-table__header th.el-table__cell) {
  background: #f8fafc;
  color: var(--text-secondary);
}

@media (max-width: 1200px) {
  .detail-overview-grid,
  .detail-info-grid {
    grid-template-columns: 1fr;
  }
}

/* ── 热门操作 ─────────────────────────────────────────────── */
.popular-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}
.pa-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
}
.pa-rank {
  width: 20px;
  text-align: center;
  font-weight: 700;
  color: var(--text-tertiary);
  font-family: 'Fira Code', monospace;
}
.pa-rank.top3 {
  color: #f59e0b;
}
.pa-name {
  width: 80px;
  color: var(--text-secondary);
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pa-bar-wrap {
  flex: 1;
  height: 8px;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}
.pa-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}
.pa-count {
  width: 30px;
  text-align: right;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}

/* ── 留存卡片 ─────────────────────────────────────────────── */
.retention-card :deep(.el-card__body) {
  padding: 20px;
}
.retention-body {
  display: flex;
  align-items: center;
  gap: 16px;
}
.retention-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.retention-info {
  flex: 1;
}
.retention-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.retention-val {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}
.retention-desc {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* ── 服务质量 ─────────────────────────────────────────────── */
.rating-summary {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.rating-avg strong {
  color: #ef4444;
  font-weight: 700;
}
.rank-badge {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  background: #fff;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}
.rank-badge.rank-top {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

/* ── 实时监控 ─────────────────────────────────────────────── */
.monitor-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.monitor-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: var(--radius-lg);
  background: #fff;
  border: 1px solid var(--border-color);
  transition: background 0.2s;
}
.monitor-item:hover {
  background: #fff;
}
.monitor-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.monitor-icon.online {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}
.monitor-icon.orders {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.monitor-icon.load {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
.monitor-icon.response {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.monitor-icon.alert {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.monitor-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.monitor-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.monitor-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}
.monitor-sub {
  font-size: 0.78rem;
  color: var(--text-tertiary);
}

/* ── 响应式 ───────────────────────────────────────────────── */
@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .monitor-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 1024px) {
  .charts-grid-7-3 {
    grid-template-columns: 1fr;
  }
  .charts-grid-5-5 {
    grid-template-columns: 1fr;
  }
  .charts-grid-3col {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .charts-grid-3col {
    grid-template-columns: 1fr;
  }
  .monitor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
