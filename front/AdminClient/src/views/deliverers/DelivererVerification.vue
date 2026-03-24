<template>
  <div class="deliverer-verification">
    <!-- 页面头部 -->
    <DashboardFilterHeader
      v-model="dateRange"
      title="配送员审核"
      subtitle="审核配送员注册申请"
      filter-label="申请时间"
      filter-hint="默认展示最近30天，可按需调整"
      :action-icon="Download"
      action-label="导出"
      @change="handleDateRangeChange"
      @action="exportDeliverers"
    />

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filters" inline class="filter-form">
        <el-form-item label="审核状态">
          <el-select v-model="filters.verified" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待审核" value="false" />
            <el-option label="已通过" value="true" />
          </el-select>
        </el-form-item>

        <el-form-item label="申请状态">
          <el-select v-model="filters.applicationStatus" placeholder="全部" clearable style="width: 140px">
            <el-option label="待处理" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>

        <el-form-item label="关键词搜索">
          <el-input
            v-model="filters.keyword"
            placeholder="姓名/手机号/身份证"
            clearable
            prefix-icon="Search"
            style="width: 180px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="searchDeliverers">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetFilters">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 配送员列表 -->
    <el-card class="table-card" shadow="never">
      <el-table v-loading="loading" :data="deliverers" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" align="center" width="80" />
        <el-table-column prop="real_name" label="姓名" align="center">
          <template #default="{ row }">
            <div class="name-cell">
              <span>{{ row.real_name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" align="center">
          <template #default="{ row }">
            <span class="phone-text">{{ row.phone || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="id_card" label="身份证号" align="center" min-width="180">
          <template #default="{ row }">
            <span class="id-card-text">{{ row.id_card || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="verified" label="认证状态" align="center">
          <template #default="{ row }">
            <el-tag :type="row.verified ? 'success' : 'warning'" size="small">
              {{ row.verified ? '已认证' : '未认证' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="application_status" label="申请状态" align="center">
          <template #default="{ row }">
            <el-tag :type="getApplicationStatusTagType(row.application_status)" size="small">
              {{ getApplicationStatusText(row.application_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="账号状态" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" text @click="viewDetail(row)">
                查看
              </el-button>
              <el-button
                v-if="!row.verified && row.application_status === 'pending'"
                type="success"
                size="small"
                text
                @click="handleVerify(row, true)"
              >
                通过
              </el-button>
              <el-button
                v-if="!row.verified && row.application_status === 'pending'"
                type="danger"
                size="small"
                text
                @click="handleVerify(row, false)"
              >
                拒绝
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="verifyDialog.visible"
      :title="verifyDialog.approved ? '通过审核' : '拒绝审核'"
      width="450px"
      class="verify-dialog"
    >
      <el-form :model="verifyDialog.form" label-width="80px">
        <el-form-item label="配送员">
          <span>{{ verifyDialog.form.real_name }}</span>
        </el-form-item>
        <el-form-item label="手机号">
          <span>{{ verifyDialog.form.phone }}</span>
        </el-form-item>
        <el-form-item v-if="!verifyDialog.approved" label="拒绝原因" required>
          <el-input
            v-model="verifyDialog.form.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入拒绝原因"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="verifyDialog.form.remark"
            type="textarea"
            :rows="2"
            placeholder="可选填写备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          @click="submitVerify"
          :loading="verifyDialog.loading"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <DelivererDetail v-model="detailDrawer.visible" :deliverer="detailDrawer.data" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Search,
  RefreshRight,
} from '@element-plus/icons-vue'
import { delivererManagementApi } from '@/api'
import { exportCsvFile, normalizeExportValue } from '@/utils/export'
import DashboardFilterHeader from '../dashboard/components/DashboardFilterHeader.vue'
import DelivererDetail from './DelivererDetail.vue'

const router = useRouter()

const loading = ref(false)
const deliverers = ref([])
const dateRange = ref([])

const filters = reactive({
  verified: 'false',
  applicationStatus: 'pending',
  keyword: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const verifyDialog = reactive({
  visible: false,
  loading: false,
  approved: true,
  form: {
    id: null,
    real_name: '',
    phone: '',
    reason: '',
    remark: '',
  },
})

const detailDrawer = reactive({
  visible: false,
  data: null,
})

const queryParams = computed(() => {
  const params = {
    page: pagination.page,
    limit: pagination.pageSize,
    verified: filters.verified || 'false',
    application_status: filters.applicationStatus || 'pending',
  }

  if (filters.keyword) params.keyword = filters.keyword
  if (dateRange.value?.length === 2) {
    params.startDate = dateRange.value[0]
    params.endDate = dateRange.value[1]
  }

  return params
})

const fetchDeliverers = async () => {
  loading.value = true
  try {
    const response = await delivererManagementApi.getDeliverers(queryParams.value)
    if (response.success) {
      deliverers.value = response.data?.deliverers || response.data || []
      const paginationData = response.pagination || response.data?.pagination || {}
      pagination.total = paginationData.total || 0
    }
  } catch (error) {
    console.error('获取配送员列表失败:', error)
    ElMessage.error('获取配送员列表失败')
  } finally {
    loading.value = false
  }
}

const searchDeliverers = () => {
  pagination.page = 1
  fetchDeliverers()
}

const resetFilters = () => {
  filters.verified = 'false'
  filters.applicationStatus = 'pending'
  filters.keyword = ''
  pagination.page = 1
  fetchDeliverers()
}

const handleDateRangeChange = () => {
  pagination.page = 1
  fetchDeliverers()
}

const viewDetail = async (row) => {
  try {
    const response = await delivererManagementApi.getDelivererById(row.id)
    if (response.success) {
      detailDrawer.data = response.data
      detailDrawer.visible = true
    }
  } catch {
    ElMessage.error('获取详情失败')
  }
}

const handleVerify = (deliverer, approved) => {
  verifyDialog.form.id = deliverer.id
  verifyDialog.form.real_name = deliverer.real_name
  verifyDialog.form.phone = deliverer.phone
  verifyDialog.form.reason = ''
  verifyDialog.form.remark = ''
  verifyDialog.approved = approved
  verifyDialog.visible = true
}

const submitVerify = async () => {
  if (!verifyDialog.approved && !verifyDialog.form.reason) {
    ElMessage.warning('请输入拒绝原因')
    return
  }

  verifyDialog.loading = true
  try {
    const response = await delivererManagementApi.verifyDeliverer(verifyDialog.form.id, {
      approved: verifyDialog.approved,
      reason: verifyDialog.form.reason,
      remark: verifyDialog.form.remark,
    })
    if (response.success) {
      ElMessage.success(verifyDialog.approved ? '审核已通过' : '已拒绝该申请')
      verifyDialog.visible = false
      fetchDeliverers()
    }
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    verifyDialog.loading = false
  }
}

const exportDeliverers = async () => {
  try {
    const params = {
      ...queryParams.value,
      page: 1,
      limit: Math.max(pagination.total || deliverers.value.length || 0, 1000),
    }

    const response = await delivererManagementApi.getDeliverers(params)
    if (!response.success) throw new Error(response.message || '导出失败')

    const list = response.data?.deliverers || response.data || []
    const rows = list.map((item) => ({
      ID: item.id,
      姓名: normalizeExportValue(item.real_name),
      手机号: normalizeExportValue(item.phone),
      身份证号: normalizeExportValue(item.id_card),
      认证状态: item.verified ? '已认证' : '未认证',
      申请状态: getApplicationStatusText(item.application_status),
      账号状态: getStatusText(item.status),
      申请时间: normalizeExportValue(item.createdAt),
    }))

    exportCsvFile(rows, '配送员审核', dateRange.value)
    ElMessage.success(`已导出 ${rows.length} 条数据`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(error.message || '导出失败')
  }
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.page = 1
  fetchDeliverers()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  fetchDeliverers()
}

const getApplicationStatusText = (status) => {
  const map = {
    pending: '待处理',
    approved: '已通过',
    rejected: '已拒绝',
  }
  return map[status] || status
}

const getApplicationStatusTagType = (status) => {
  const map = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] || ''
}

const getStatusText = (status) => {
  const map = {
    active: '正常',
    inactive: '未激活',
    suspended: '暂停',
    banned: '封禁',
    rejected: '已拒绝',
  }
  return map[status] || status
}

const getStatusTagType = (status) => {
  const map = {
    active: 'success',
    inactive: 'info',
    suspended: 'warning',
    banned: 'danger',
    rejected: 'danger',
  }
  return map[status] || ''
}

const formatDateTime = (dateTime) => {
  return new Date(dateTime).toLocaleString('zh-CN')
}

onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  fetchDeliverers()
})
</script>

<style scoped>
.deliverer-verification {
  max-width: 1600px;
  margin: 0 auto;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
  border-radius: var(--radius-xl);
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.filter-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-secondary);
}

/* 表格卡片 */
.table-card {
  border-radius: var(--radius-xl);
}

/* 姓名 */
.name-cell {
  font-weight: 500;
}

/* 电话文本 */
.phone-text,
.id-card-text {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
}

/* 时间文本 */
.time-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 审核对话框 */
.verify-dialog :deep(.el-dialog) {
  border-radius: var(--radius-xl);
}
</style>
