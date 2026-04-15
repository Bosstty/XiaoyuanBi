<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">审计日志</h1>
        <p class="page-subtitle">系统操作记录与安全审计</p>
      </div>
      <div class="header-actions">
        <!-- 翻页切换器 -->
        <div class="view-switcher" ref="switcherRef">
          <button
            class="switcher-btn"
            :class="{ active: currentView === 'stats' }"
            @click="switchView('stats')"
            ref="btnStatsRef"
          >
            <el-icon><DataAnalysis /></el-icon>
            数据统计
          </button>
          <button
            class="switcher-btn"
            :class="{ active: currentView === 'table' }"
            @click="switchView('table')"
            ref="btnTableRef"
          >
            <el-icon><List /></el-icon>
            日志列表
          </button>
          <div class="switcher-indicator" :style="indicatorStyle"></div>
        </div>

        <el-button @click="refreshData" style="margin-left: 12px">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="danger" @click="showDeleteDialog = true">
          <el-icon><Delete /></el-icon>
          清理日志
        </el-button>
      </div>
    </div>

    <!-- 统计卡片（始终展示） -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card clickable" @click="goToTable('all')">
          <div class="stat-card-inner">
            <div class="stat-icon-wrap total">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.total }}</span>
              <span class="stat-label">日志总数</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card clickable" @click="goToTable('today')">
          <div class="stat-card-inner">
            <div class="stat-icon-wrap today">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.today }}</span>
              <span class="stat-label">今日日志</span>
            </div>
            <div class="stat-badge success-rate">{{ stats.success_rate }}%</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card clickable" @click="goToTable('fail')">
          <div class="stat-card-inner">
            <div class="stat-icon-wrap fail">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.fail }}</span>
              <span class="stat-label">失败操作</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card clickable" @click="goToTable('highrisk')">
          <div class="stat-card-inner">
            <div class="stat-icon-wrap high-risk">
              <el-icon><WarningFilled /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.high_risk }}</span>
              <span class="stat-label">高风险操作</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ══ 翻页主体 ══ -->
    <div class="flip-viewport">
      <div class="flip-track" :class="currentView === 'table' ? 'show-table' : 'show-stats'">
        <!-- 左页：统计图表 -->
        <div class="flip-page page-stats">
          <el-row :gutter="16" style="margin-bottom: 16px">
            <el-col :span="14">
              <el-card class="chart-card">
                <template #header>
                  <div class="chart-header">
                    <span class="chart-title">操作趋势</span>
                    <span class="chart-sub">近 5 日请求量</span>
                  </div>
                </template>
                <v-chart class="chart-instance" :option="trendChartOption" autoresize />
              </el-card>
            </el-col>
            <el-col :span="10">
              <el-card class="chart-card" style="height: 100%">
                <template #header>
                  <div class="chart-header">
                    <span class="chart-title">风险等级分布</span>
                  </div>
                </template>
                <div class="risk-dist-body">
                  <v-chart class="chart-donut" :option="riskChartOption" autoresize />
                  <div class="risk-legend">
                    <div class="risk-legend-item" v-for="item in riskLegendData" :key="item.key">
                      <span class="dot" :style="{ background: item.color }"></span>
                      <span class="risk-legend-label">{{ item.label }}</span>
                      <span class="risk-legend-val">{{ item.value }}</span>
                      <span class="risk-legend-pct">{{ item.pct }}%</span>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-card class="chart-card dist-card">
                <template #header>
                  <div class="chart-header"><span class="chart-title">HTTP 方法分布</span></div>
                </template>
                <div class="dist-list">
                  <div
                    class="dist-item"
                    v-for="(count, method) in statsData?.method_distribution"
                    :key="method"
                  >
                    <div class="dist-item-top">
                      <el-tag :type="getMethodType(method)" size="small" class="method-tag">{{
                        method
                      }}</el-tag>
                      <span class="dist-count">{{ count.toLocaleString() }}</span>
                      <span class="dist-pct">{{ getMethodPct(count) }}%</span>
                    </div>
                    <div class="dist-bar-track">
                      <div
                        class="dist-bar-fill"
                        :class="'method-' + method.toLowerCase()"
                        :style="{ width: getMethodPct(count) + '%' }"
                      ></div>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card class="chart-card dist-card">
                <template #header>
                  <div class="chart-header"><span class="chart-title">HTTP 状态码分布</span></div>
                </template>
                <div class="status-stacked">
                  <div
                    class="status-seg"
                    v-for="(count, code) in statsData?.status_distribution"
                    :key="code"
                    :class="'status-' + code"
                    :style="{ flex: count }"
                  >
                    <span v-if="getStatusPct(count) > 8">{{ code }}</span>
                  </div>
                </div>
                <div class="dist-list" style="margin-top: 14px">
                  <div
                    class="dist-item"
                    v-for="(count, code) in statsData?.status_distribution"
                    :key="code"
                  >
                    <div class="dist-item-top">
                      <el-tag :type="getStatusTagType(code)" size="small" class="method-tag">{{
                        code
                      }}</el-tag>
                      <span class="dist-count">{{ count.toLocaleString() }}</span>
                      <span class="dist-pct">{{ getStatusPct(count) }}%</span>
                    </div>
                    <div class="dist-bar-track">
                      <div
                        class="dist-bar-fill"
                        :class="'status-fill-' + code"
                        :style="{ width: getStatusPct(count) + '%' }"
                      ></div>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card class="chart-card dist-card">
                <template #header>
                  <div class="chart-header"><span class="chart-title">Top 10 请求路径</span></div>
                </template>
                <div class="action-list">
                  <div
                    class="action-item"
                    v-for="(item, idx) in statsData?.top_actions"
                    :key="item.action"
                  >
                    <span class="action-rank" :class="{ 'rank-top': idx < 3 }">{{ idx + 1 }}</span>
                    <span class="action-name">{{ item.action }}</span>
                    <span class="action-count">{{ item.count.toLocaleString() }}</span>
                    <div class="action-bar-track">
                      <div
                        class="action-bar-fill"
                        :style="{
                          width: (item.count / statsData.top_actions[0].count) * 100 + '%',
                        }"
                      ></div>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 翻到列表的提示 -->
          <div class="page-nav-footer">
            <button class="nav-arrow-btn" @click="switchView('table')">
              查看日志列表
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>
        </div>

        <!-- 右页：日志列表 -->
        <div class="flip-page page-table">
          <el-card class="filter-card">
            <el-form :model="filters" inline class="filter-form">
              <el-form-item label="搜索">
                <el-input
                  v-model="filters.search"
                  placeholder="操作/IP地址"
                  clearable
                  style="width: 160px"
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
              <el-form-item label="HTTP方法">
                <el-select
                  v-model="filters.method"
                  placeholder="全部"
                  clearable
                  style="width: 100px"
                >
                  <el-option label="全部" value="" /><el-option label="GET" value="GET" /><el-option
                    label="POST"
                    value="POST"
                  /><el-option label="PUT" value="PUT" /><el-option
                    label="DELETE"
                    value="DELETE"
                  /><el-option label="PATCH" value="PATCH" />
                </el-select>
              </el-form-item>
              <el-form-item label="风险等级">
                <el-select
                  v-model="filters.risk_level"
                  placeholder="全部"
                  clearable
                  style="width: 100px"
                >
                  <el-option label="全部" value="" /><el-option label="低" value="low" /><el-option
                    label="中"
                    value="medium"
                  /><el-option label="高" value="high" /><el-option label="严重" value="critical" />
                </el-select>
              </el-form-item>
              <el-form-item label="操作结果">
                <el-select
                  v-model="filters.success"
                  placeholder="全部"
                  clearable
                  style="width: 100px"
                >
                  <el-option label="全部" value="" /><el-option
                    label="成功"
                    value="true"
                  /><el-option label="失败" value="false" />
                </el-select>
              </el-form-item>
              <el-form-item label="操作者类型">
                <el-select
                  v-model="filters.operator_type"
                  placeholder="全部"
                  clearable
                  style="width: 120px"
                  @change="filters.operator_id = ''"
                >
                  <el-option label="用户" value="user" />
                  <el-option label="管理员" value="admin" />
                </el-select>
              </el-form-item>
              <el-form-item label="操作者" v-if="filters.operator_type">
                <el-select
                  v-model="filters.operator_id"
                  placeholder="选择操作者"
                  clearable
                  style="width: 150px"
                >
                  <el-option
                    v-for="op in operators.filter((o) => o.type === filters.operator_type)"
                    :key="op.id"
                    :label="op.real_name || op.name || op.username"
                    :value="op.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="日期范围">
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  style="width: 240px"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleSearch"
                  ><el-icon><Search /></el-icon>搜索</el-button
                >
                <el-button @click="resetFilters"
                  ><el-icon><RefreshLeft /></el-icon>重置</el-button
                >
              </el-form-item>
            </el-form>
          </el-card>

          <el-card class="table-card">
            <el-tabs v-model="activeTab">
              <el-tab-pane label="全部日志" name="all">
                <el-table
                  v-loading="loading"
                  :data="logs"
                  stripe
                  style="width: 100%"
                  @row-click="handleRowClick"
                  @row-contextmenu="(row, column, event) => handleRightClickDelete(row, event)"
                >
                  <el-table-column prop="id" label="ID" width="80" />
                  <el-table-column prop="action" label="操作" min-width="140">
                    <template #default="{ row }">
                      <div class="action-cell">
                        <el-tag size="small" :type="getMethodType(row.method)">{{
                          row.method
                        }}</el-tag>
                        <span class="action-text">{{ row.action }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="URL" min-width="160">
                    <template #default="{ row }"
                      ><el-tag size="small">{{ row.url }}</el-tag></template
                    >
                  </el-table-column>
                  <el-table-column label="操作者" width="120">
                    <template #default="{ row }">
                      <span v-if="row.admin">{{ row.admin.name || row.admin.username }}</span>
                      <span v-else-if="row.user">{{
                        row.user.real_name || row.user.username
                      }}</span>
                      <span v-else class="text-muted">-</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="ip_address" label="IP地址" width="130" />
                  <el-table-column prop="response_status" label="状态码" width="90">
                    <template #default="{ row }">
                      <el-tag
                        :type="
                          row.response_status >= 200 && row.response_status < 300
                            ? 'success'
                            : row.response_status >= 400
                              ? 'danger'
                              : 'info'
                        "
                        size="small"
                        >{{ row.response_status || '-' }}</el-tag
                      >
                    </template>
                  </el-table-column>
                  <el-table-column prop="duration" label="耗时" width="90">
                    <template #default="{ row }">
                      <span :class="{ 'text-warning': row.duration > 1000 }">{{
                        row.duration ? row.duration + 'ms' : '-'
                      }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="risk_level" label="风险" width="80">
                    <template #default="{ row }">
                      <el-tag :type="getRiskType(row.risk_level)" size="small">{{
                        getRiskLabel(row.risk_level)
                      }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作时间" width="170">
                    <template #default="{ row }">{{
                      formatDateTime(row.created_at || row.createdAt)
                    }}</template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>
              <!-- 高风险日志 -->
              <el-tab-pane label="高风险日志" name="high-risk">
                <el-table
                  v-loading="highRiskLoading"
                  :data="highRiskLogs"
                  stripe
                  style="width: 100%"
                  @row-click="handleRowClick"
                  @row-contextmenu="(row, column, event) => handleRightClickDelete(row, event)"
                >
                  <el-table-column prop="id" label="ID" width="80" />
                  <el-table-column prop="action" label="操作" min-width="140">
                    <template #default="{ row }">
                      <div class="action-cell">
                        <el-tag size="small" :type="getMethodType(row.method)">{{
                          row.method
                        }}</el-tag>
                        <span class="action-text">{{ row.action }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="URL" min-width="160">
                    <template #default="{ row }"
                      ><el-tag size="small">{{ row.url }}</el-tag></template
                    >
                  </el-table-column>
                  <el-table-column label="操作者" width="120">
                    <template #default="{ row }">
                      <span v-if="row.admin">{{ row.admin.name || row.admin.username }}</span>
                      <span v-else-if="row.user">{{
                        row.user.real_name || row.user.username
                      }}</span>
                      <span v-else class="text-muted">-</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="ip_address" label="IP地址" width="130" />
                  <el-table-column prop="risk_level" label="风险" width="100">
                    <template #default="{ row }">
                      <el-tag :type="getRiskType(row.risk_level)" size="small">{{
                        getRiskLabel(row.risk_level)
                      }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="success" label="结果" width="90">
                    <template #default="{ row }">
                      <el-tag :type="row.success ? 'success' : 'danger'" size="small">{{
                        row.success ? '成功' : '失败'
                      }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作时间" width="170">
                    <template #default="{ row }">{{
                      formatDateTime(row.created_at || row.createdAt)
                    }}</template>
                  </el-table-column>
                </el-table>
                <div class="pagination-container">
                  <el-pagination
                    v-model:current-page="highRiskPagination.current"
                    v-model:page-size="highRiskPagination.pageSize"
                    :page-sizes="[20, 50, 100]"
                    :total="highRiskPagination.total"
                    layout="total, sizes, prev, pager, next, jumper"
                    @size-change="handleHighRiskSizeChange"
                    @current-change="handleHighRiskPageChange"
                  />
                </div>
              </el-tab-pane>
            </el-tabs>
            <!-- 全部日志分页 -->
            <div class="pagination-container" v-show="activeTab === 'all'">
              <el-pagination
                v-model:current-page="pagination.current"
                v-model:page-size="pagination.pageSize"
                :page-sizes="[20, 50, 100, 200]"
                :total="pagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handlePageChange"
              />
            </div>
            <!-- 高风险日志分页（已在tab-pane内部） -->
          </el-card>

          <!-- 翻回统计的提示 -->
          <div class="page-nav-footer left">
            <button class="nav-arrow-btn" @click="switchView('stats')">
              <el-icon><ArrowLeft /></el-icon>
              返回数据统计
            </button>
          </div>
        </div>
      </div>

      <!-- 底部页码指示器 -->
      <div class="page-dots">
        <span
          class="page-dot"
          :class="{ active: currentView === 'stats' }"
          @click="switchView('stats')"
        ></span>
        <span
          class="page-dot"
          :class="{ active: currentView === 'table' }"
          @click="switchView('table')"
        ></span>
      </div>
    </div>

    <!-- 日志详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="日志详情" width="800px">
      <el-descriptions v-if="currentLog" :column="2" border>
        <el-descriptions-item label="ID">{{ currentLog.id }}</el-descriptions-item>
        <el-descriptions-item label="操作">{{ currentLog.action }}</el-descriptions-item>
        <el-descriptions-item label="HTTP方法">
          <el-tag :type="getMethodType(currentLog.method)" size="small">{{
            currentLog.method
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="URL" :span="2">{{ currentLog.url }}</el-descriptions-item>
        <el-descriptions-item label="操作者">
          <span v-if="currentLog.admin"
            >{{ currentLog.admin.name || currentLog.admin.username }} (管理员)</span
          >
          <span v-else-if="currentLog.user"
            >{{ currentLog.user.real_name || currentLog.user.username }} (用户)</span
          >
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ currentLog.ip_address }}</el-descriptions-item>
        <el-descriptions-item label="响应状态">
          <el-tag
            :type="
              currentLog.response_status >= 200 && currentLog.response_status < 300
                ? 'success'
                : currentLog.response_status >= 400
                  ? 'danger'
                  : 'info'
            "
            size="small"
            >{{ currentLog.response_status }}</el-tag
          >
        </el-descriptions-item>
        <el-descriptions-item label="耗时">{{ currentLog.duration }}ms</el-descriptions-item>
        <el-descriptions-item label="风险等级">
          <el-tag :type="getRiskType(currentLog.risk_level)" size="small">{{
            getRiskLabel(currentLog.risk_level)
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作结果">
          <el-tag :type="currentLog.success ? 'success' : 'danger'" size="small">{{
            currentLog.success ? '成功' : '失败'
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作时间" :span="2">{{
          formatDateTime(currentLog.created_at || currentLog.createdAt)
        }}</el-descriptions-item>
        <el-descriptions-item label="资源类型">{{
          currentLog.resource_type || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="资源ID">{{
          currentLog.resource_id || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="Session ID">{{
          currentLog.session_id || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="User-Agent" :span="2">
          <div class="user-agent-text">{{ currentLog.user_agent || '-' }}</div>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.error_message" label="错误信息" :span="2">
          <div class="error-message">{{ currentLog.error_message }}</div>
        </el-descriptions-item>
        <el-descriptions-item
          v-if="currentLog.request_body && Object.keys(currentLog.request_body).length"
          label="请求参数"
          :span="2"
        >
          <pre class="json-content">{{ JSON.stringify(currentLog.request_body, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.extra_data" label="额外数据" :span="2">
          <pre class="json-content">{{ JSON.stringify(currentLog.extra_data, null, 2) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 删除日志对话框 -->
    <el-dialog v-model="showDeleteDialog" title="清理审计日志" width="500px">
      <el-form :model="deleteForm" label-width="100px">
        <el-form-item label="清理方式">
          <el-radio-group v-model="deleteForm.type">
            <el-radio value="days">按保留天数</el-radio>
            <el-radio value="ids">按选中ID</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="保留天数" v-if="deleteForm.type === 'days'">
          <el-input-number v-model="deleteForm.days" :min="1" :max="365" />
          <span style="margin-left: 10px">天（只删除低风险和中风险日志）</span>
        </el-form-item>
        <el-form-item label="日志ID" v-if="deleteForm.type === 'ids'">
          <el-input
            v-model="deleteForm.idsInput"
            type="textarea"
            :rows="3"
            placeholder="请输入日志ID，多个用逗号分隔（如：1,2,3）"
          />
        </el-form-item>
        <el-alert type="warning" :closable="false" show-icon> 谨慎操作，删除后无法恢复！ </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="showDeleteDialog = false">取消</el-button>
        <el-button type="danger" @click="handleDeleteLogs" :loading="deleteLoading"
          >确认删除</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'
import { dateUtils } from '@/utils'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, PieChart, BarChart, TooltipComponent, LegendComponent, GridComponent])

// ─── 视图切换 ──────────────────────────────────────────────
const currentView = ref('stats')
const btnStatsRef = ref(null)
const btnTableRef = ref(null)
const indicatorStyle = ref({ left: '4px', width: '0px' })

const updateIndicator = async () => {
  await nextTick()
  const btn = currentView.value === 'stats' ? btnStatsRef.value : btnTableRef.value
  if (!btn) return
  indicatorStyle.value = {
    left: btn.offsetLeft + 'px',
    width: btn.offsetWidth + 'px',
  }
}

const switchView = (view) => {
  currentView.value = view
  updateIndicator()
}

const goToTable = (filter) => {
  if (filter === 'all') filterByAll()
  else if (filter === 'today') filterByToday()
  else if (filter === 'fail') filterByFail()
  else if (filter === 'highrisk') filterByHighRisk()
  switchView('table')
}

// ─── 数据状态 ──────────────────────────────────────────────
const loading = ref(false)
const logs = ref([])
const currentLog = ref(null)
const detailDialogVisible = ref(false)
const statsData = ref(null)
const filters = reactive({
  search: '',
  method: '',
  risk_level: '',
  success: '',
  operator_id: '',
  operator_type: '',
})
const dateRange = ref([])
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })
const stats = reactive({ total: 0, today: 0, fail: 0, high_risk: 0, success_rate: '0' })
const operators = ref([]) // 操作者列表
const activeTab = ref('all') // 当前标签页
const highRiskLogs = ref([]) // 高风险日志列表
const highRiskLoading = ref(false)
const highRiskPagination = reactive({ current: 1, pageSize: 20, total: 0 })
const showDeleteDialog = ref(false)
const deleteForm = reactive({ type: 'days', days: 7, ids: [], idsInput: '' })
const deleteLoading = ref(false)

// ─── 图表配置 ──────────────────────────────────────────────
const trendChartOption = computed(() => {
  if (!statsData.value?.date_trend) return {}
  const trend = statsData.value.date_trend
  const maxVal = Math.max(...trend.map((d) => d.count))
  return {
    grid: { top: 16, right: 16, bottom: 32, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 12 },
      formatter: (p) => `${p[0].axisValue}<br/>请求量：<b>${p[0].value}</b>`,
    },
    xAxis: {
      type: 'category',
      data: trend.map((d) => d.date.slice(5)),
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisTick: { show: false },
      axisLabel: { color: '#909399', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f2f5', type: 'dashed' } },
      axisLabel: { color: '#909399', fontSize: 11 },
    },
    series: [
      {
        data: trend.map((d) => d.count),
        type: 'bar',
        barMaxWidth: 40,
        itemStyle: {
          color: (p) =>
            p.value === maxVal
              ? {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: '#6366f1' },
                    { offset: 1, color: '#818cf8' },
                  ],
                }
              : {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: '#a5b4fc' },
                    { offset: 1, color: '#c7d2fe' },
                  ],
                },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }
})

const riskColors = { low: '#22c55e', medium: '#f97316', high: '#ef4444' }

const riskChartOption = computed(() => {
  if (!statsData.value?.risk_distribution) return {}
  const dist = statsData.value.risk_distribution
  const labels = { low: '低风险', medium: '中风险', high: '高风险' }
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: '#fff',
      borderColor: '#e4e7ed',
      textStyle: { color: '#303133', fontSize: 12 },
    },
    legend: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['50%', '50%'],
        data: Object.entries(dist).map(([k, v]) => ({
          name: labels[k],
          value: v,
          itemStyle: { color: riskColors[k] },
        })),
        label: { show: false },
        emphasis: { scale: false },
      },
    ],
  }
})

const riskLegendData = computed(() => {
  if (!statsData.value?.risk_distribution) return []
  const dist = statsData.value.risk_distribution
  const total = Object.values(dist).reduce((a, b) => a + b, 0)
  const labels = { low: '低风险', medium: '中风险', high: '高风险' }
  return Object.entries(dist).map(([k, v]) => ({
    key: k,
    label: labels[k],
    value: v.toLocaleString(),
    color: riskColors[k],
    pct: ((v / total) * 100).toFixed(1),
  }))
})

const methodTotal = computed(() =>
  !statsData.value?.method_distribution
    ? 1
    : Object.values(statsData.value.method_distribution).reduce((a, b) => a + b, 0),
)
const getMethodPct = (count) => ((count / methodTotal.value) * 100).toFixed(1)

const statusTotal = computed(() =>
  !statsData.value?.status_distribution
    ? 1
    : Object.values(statsData.value.status_distribution).reduce((a, b) => a + b, 0),
)
const getStatusPct = (count) => ((count / statusTotal.value) * 100).toFixed(1)
const getStatusTagType = (code) =>
  ({ '2xx': 'success', '4xx': 'warning', '5xx': 'danger' })[code] || 'info'

// ─── 数据获取 ──────────────────────────────────────────────
const fetchLogs = async () => {
  loading.value = true
  try {
    const params = { page: pagination.current, limit: pagination.pageSize, ...filters }
    if (dateRange.value?.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    // 处理操作者筛选
    if (filters.operator_id && filters.operator_type) {
      if (filters.operator_type === 'user') {
        params.user_id = filters.operator_id
      } else if (filters.operator_type === 'admin') {
        params.admin_id = filters.operator_id
      }
    }
    Object.keys(params).forEach((k) => {
      if (params[k] === '' || params[k] === null) delete params[k]
    })
    const res = await adminApi.getAuditLogs(params)
    if (res.success) {
      logs.value = res.data || []
      pagination.total = res.pagination?.total || 0
    }
  } catch (e) {
    ElMessage.error('获取审计日志失败')
  } finally {
    loading.value = false
  }
}

// 获取操作者列表
const fetchOperators = async () => {
  try {
    const res = await adminApi.getAuditOperators()
    if (res.success) {
      operators.value = res.data || []
    }
  } catch (e) {
    console.error('获取操作者列表失败', e)
  }
}

// 获取高风险日志
const fetchHighRiskLogs = async () => {
  highRiskLoading.value = true
  try {
    const params = {
      page: highRiskPagination.current,
      limit: highRiskPagination.pageSize,
    }
    console.log('获取高风险日志，参数:', params)
    const res = await adminApi.getHighRiskLogs(params)
    console.log('高风险日志响应:', res)
    if (res.success) {
      highRiskLogs.value = res.data || []
      highRiskPagination.total = res.pagination?.total || 0
      console.log('高风险日志数据:', highRiskLogs.value.length, '条')
    }
  } catch (e) {
    console.error('获取高风险日志失败:', e)
    ElMessage.error('获取高风险日志失败')
  } finally {
    highRiskLoading.value = false
  }
}

// 监听标签页切换
watch(activeTab, (newTab) => {
  if (newTab === 'high-risk' && highRiskLogs.value.length === 0) {
    fetchHighRiskLogs()
  }
})

const handleHighRiskPageChange = (page) => {
  highRiskPagination.current = page
  fetchHighRiskLogs()
}

const handleHighRiskSizeChange = (size) => {
  highRiskPagination.pageSize = size
  highRiskPagination.current = 1
  fetchHighRiskLogs()
}

// 删除日志
const handleDeleteLogs = async () => {
  // 验证参数
  if (deleteForm.type === 'days') {
    if (!deleteForm.days || deleteForm.days < 1) {
      ElMessage.warning('请输入有效的保留天数')
      return
    }
  } else {
    // 解析输入的ID
    if (!deleteForm.idsInput || deleteForm.idsInput.trim() === '') {
      ElMessage.warning('请输入要删除的日志ID')
      return
    }
    // 将输入的ID字符串转换为数组
    deleteForm.ids = deleteForm.idsInput
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '')
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id))

    if (deleteForm.ids.length === 0) {
      ElMessage.warning('请输入有效的日志ID')
      return
    }
  }

  deleteLoading.value = true
  try {
    const params = deleteForm.type === 'days' ? { days: deleteForm.days } : { ids: deleteForm.ids }
    console.log('删除日志参数:', params)
    const res = await adminApi.deleteAuditLogs(params)
    if (res.success) {
      ElMessage.success(`成功删除 ${res.data.deleted_count} 条日志`)
      showDeleteDialog.value = false
      // 重置表单
      deleteForm.ids = []
      deleteForm.idsInput = ''
      fetchLogs()
      fetchStats()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (err) {
    console.error('删除日志失败:', err)
    ElMessage.error(err.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

// 右键删除单条日志
const handleRightClickDelete = (row, event) => {
  // 禁用默认右键菜单
  event.preventDefault()
  event.stopPropagation()
  // 打开确认对话框
  ElMessageBox.confirm(
    `确定要删除这条日志吗？\n操作: ${row.action}\n时间: ${formatDateTime(row.created_at || row.createdAt)}`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        const res = await adminApi.deleteAuditLogs({ ids: [row.id] })
        if (res.success) {
          ElMessage.success('删除成功')
          fetchLogs()
          fetchStats()
        } else {
          ElMessage.error(res.message || '删除失败')
        }
      } catch (err) {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

const fetchStats = async () => {
  try {
    const res = await adminApi.getAuditLogStats()
    if (res.success) {
      const d = res.data
      stats.total = d.overview.total
      stats.today = d.overview.today
      stats.fail = d.overview.fail
      stats.high_risk = d.overview.high_risk
      stats.success_rate = d.overview.success_rate
      statsData.value = d
    }
  } catch (e) {
    console.error(e)
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchLogs()
}
const resetFilters = () => {
  Object.keys(filters).forEach((k) => {
    filters[k] = ''
  })
  dateRange.value = []
  pagination.current = 1
  fetchLogs()
}
const filterByAll = () => {
  filters.risk_level = ''
  filters.success = ''
  dateRange.value = []
  pagination.current = 1
  fetchLogs()
}
const filterByToday = () => {
  dateRange.value = dateUtils.getTodayRange()
  filters.risk_level = ''
  filters.success = ''
  pagination.current = 1
  fetchLogs()
}
const filterByFail = () => {
  filters.success = 'false'
  filters.risk_level = ''
  dateRange.value = []
  pagination.current = 1
  fetchLogs()
}
const filterByHighRisk = () => {
  filters.risk_level = 'high'
  filters.success = ''
  dateRange.value = []
  pagination.current = 1
  fetchLogs()
}
const handlePageChange = (page) => {
  pagination.current = page
  fetchLogs()
}
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.current = 1
  fetchLogs()
}

const handleRowClick = async (row) => {
  try {
    const res = await adminApi.getAuditLogById(row.id)
    if (res.success) {
      currentLog.value = res.data
      detailDialogVisible.value = true
    }
  } catch (e) {
    console.error(e)
  }
}

const refreshData = () => {
  fetchLogs()
  fetchStats()
}

const getMethodType = (m) => {
  // 确保 m 是字符串
  const method = typeof m === 'string' ? m.toUpperCase() : ''
  return (
    { GET: 'success', POST: 'primary', PUT: 'warning', DELETE: 'danger', PATCH: 'info' }[method] ||
    'info'
  )
}
const getRiskType = (l) =>
  ({ low: 'info', medium: 'warning', high: 'danger', critical: 'danger' })[l] || 'info'
const getRiskLabel = (l) => ({ low: '低', medium: '中', high: '高', critical: '严重' })[l] || l
const formatDateTime = (d) => (d ? new Date(d).toLocaleString('zh-CN') : '-')

onMounted(() => {
  fetchLogs()
  fetchStats()
  fetchOperators()
  updateIndicator()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

/* ─── Header ─── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.header-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
  margin: 0;
}
.page-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}
.header-actions {
  display: flex;
  align-items: center;
}

/* ─── 切换器 ─── */
.view-switcher {
  position: relative;
  display: flex;
  background: var(--bg-page, #f5f7fa);
  border-radius: 10px;
  padding: 4px;
  gap: 2px;
}

.switcher-btn {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #909399);
  cursor: pointer;
  transition: color 0.25s;
  white-space: nowrap;
}

.switcher-btn.active {
  color: var(--text-primary, #303133);
}

.switcher-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition:
    left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

/* ─── 统计卡片 ─── */
.stats-row {
  margin-bottom: 16px;
}
.stat-card {
  border-radius: var(--radius-xl, 12px);
  box-shadow: none;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.stat-card.clickable {
  cursor: pointer;
}
.stat-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.1);
}
.stat-card :deep(.el-card__body) {
  padding: 20px;
}
.stat-card-inner {
  display: flex;
  align-items: center;
  gap: 14px;
}
.stat-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.stat-icon-wrap.total {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}
.stat-icon-wrap.today {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}
.stat-icon-wrap.fail {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.stat-icon-wrap.high-risk {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}
.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
}
.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.stat-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}
.stat-badge.success-rate {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

/* ─── 翻页视口 ─── */
.flip-viewport {
  overflow: hidden;
  position: relative;
}

.flip-track {
  display: flex;
  width: 200%;
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.flip-track.show-stats {
  transform: translateX(0);
}
.flip-track.show-table {
  transform: translateX(-50%);
}

.flip-page {
  width: 50%;
  flex-shrink: 0;
  min-width: 0;
  padding-right: 1px; /* 防止右侧卡片被裁剪 */
}

/* 底部导航 */
.page-nav-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 0 4px;
}
.page-nav-footer.left {
  justify-content: flex-start;
}

.nav-arrow-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6366f1;
  cursor: pointer;
  padding: 7px 16px;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.25);
  background: rgba(99, 102, 241, 0.04);
  transition:
    background 0.2s,
    box-shadow 0.2s;
  font-weight: 500;
}
.nav-arrow-btn:hover {
  background: rgba(99, 102, 241, 0.1);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
}

/* 底部指示点 */
.page-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 12px 0 2px;
}
.page-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dde1e9;
  cursor: pointer;
  transition: all 0.3s;
}
.page-dot.active {
  width: 24px;
  border-radius: 4px;
  background: #6366f1;
}

/* ─── 图表卡片 ─── */
.chart-card {
  border-radius: var(--radius-xl, 12px);
  box-shadow: none;
}
.chart-card :deep(.el-card__header) {
  padding: 16px 20px 0;
  border-bottom: none;
}
.chart-card :deep(.el-card__body) {
  padding: 16px 20px 20px;
}
.dist-card :deep(.el-card__body) {
  padding: 12px 20px 20px;
}
.chart-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.chart-sub {
  font-size: 12px;
  color: var(--text-secondary);
}
.chart-instance {
  width: 100%;
  height: 240px;
}
.chart-donut {
  width: 130px;
  height: 130px;
  flex-shrink: 0;
}
.risk-dist-body {
  display: flex;
  align-items: center;
  gap: 20px;
}
.risk-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.risk-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.risk-legend-label {
  flex: 1;
  color: var(--text-secondary);
}
.risk-legend-val {
  font-weight: 600;
  color: var(--text-primary);
  min-width: 36px;
  text-align: right;
}
.risk-legend-pct {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
}

/* 分布列表 */
.dist-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dist-item-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.method-tag {
  font-size: 11px;
  min-width: 52px;
  text-align: center;
}
.dist-count {
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.dist-pct {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 44px;
  text-align: right;
}
.dist-bar-track {
  height: 5px;
  background: var(--bg-page, #f5f7fa);
  border-radius: 3px;
  overflow: hidden;
}
.dist-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.method-get {
  background: linear-gradient(90deg, #22c55e, #4ade80);
}
.method-post {
  background: linear-gradient(90deg, #6366f1, #818cf8);
}
.method-put {
  background: linear-gradient(90deg, #f97316, #fb923c);
}
.method-delete {
  background: linear-gradient(90deg, #ef4444, #f87171);
}
.method-patch {
  background: linear-gradient(90deg, #06b6d4, #22d3ee);
}

.status-stacked {
  display: flex;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  gap: 2px;
}
.status-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
}
.status-2xx {
  background: #22c55e;
}
.status-3xx {
  background: #6366f1;
}
.status-4xx {
  background: #f97316;
}
.status-5xx {
  background: #ef4444;
}
.status-fill-2xx {
  background: linear-gradient(90deg, #22c55e, #4ade80);
}
.status-fill-3xx {
  background: linear-gradient(90deg, #6366f1, #818cf8);
}
.status-fill-4xx {
  background: linear-gradient(90deg, #f97316, #fb923c);
}
.status-fill-5xx {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.action-item {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  grid-template-rows: auto 4px;
  column-gap: 8px;
  row-gap: 5px;
  align-items: center;
}
.action-rank {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-align: center;
  grid-row: 1;
}
.action-rank.rank-top {
  color: #6366f1;
}
.action-name {
  font-size: 12px;
  font-family: 'Fira Code', monospace;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  grid-row: 1;
}
.action-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  grid-row: 1;
}
.action-bar-track {
  grid-column: 1 / -1;
  grid-row: 2;
  height: 4px;
  background: var(--bg-page, #f5f7fa);
  border-radius: 2px;
  overflow: hidden;
}
.action-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #818cf8, #c7d2fe);
  border-radius: 2px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ─── 筛选 & 表格 ─── */
.filter-card,
.table-card {
  margin-bottom: 16px;
  border-radius: var(--radius-xl, 12px);
  box-shadow: none;
}
.filter-form {
  display: flex;
  flex-wrap: wrap;
}
.action-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.action-text {
  word-break: break-all;
}
.text-muted {
  color: var(--text-muted);
}
.text-warning {
  color: var(--accent-warning);
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* ─── 弹窗 ─── */
.error-message {
  color: var(--accent-danger);
  font-family: monospace;
}
.json-content {
  background: var(--bg-page, #f5f7fa);
  padding: 10px;
  border-radius: var(--radius-lg, 8px);
  max-height: 200px;
  overflow: auto;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
.user-agent-text {
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
  max-width: 500px;
}
:deep(.el-dialog) {
  border-radius: var(--radius-xl, 12px);
}
:deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
}
:deep(.el-dialog__title) {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}
:deep(.el-dialog__body) {
  padding: 24px;
}
:deep(.el-dialog__headerbtn) {
  top: 20px;
  right: 20px;
}
</style>
