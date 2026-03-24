<template>
  <el-drawer v-model="visible" title="配送员详情" size="600px">
    <template v-if="deliverer">
      <!-- 基本信息头部 -->
      <div class="detail-header">
        <el-avatar :size="80" :src="deliverer.user?.avatar || deliverer.avatar">
          <el-icon :size="40"><UserFilled /></el-icon>
        </el-avatar>
        <div class="detail-info">
          <h3>{{ deliverer.real_name }}</h3>
          <p>{{ deliverer.phone }}</p>
          <div class="tags">
            <el-tag :type="getApplicationStatusType(deliverer.application_status)" size="small">
              {{ getApplicationStatusText(deliverer.application_status) }}
            </el-tag>
            <el-tag :type="getStatusType(deliverer.status)" size="small">
              {{ getStatusText(deliverer.status) }}
            </el-tag>
            <el-tag :type="deliverer.is_online ? 'success' : 'info'" size="small">
              {{ deliverer.is_online ? '在线' : '离线' }}
            </el-tag>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 基本信息 -->
      <div class="section-title">基本信息</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户ID">
          {{ deliverer.user_id }}
        </el-descriptions-item>
        <el-descriptions-item label="配送员ID">
          {{ deliverer.id }}
        </el-descriptions-item>
        <el-descriptions-item label="用户名">
          {{ deliverer.user?.username || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="学号">
          {{ deliverer.user?.student_id || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="真实姓名">
          {{ deliverer.real_name }}
        </el-descriptions-item>
        <el-descriptions-item label="手机号">
          {{ deliverer.phone }}
        </el-descriptions-item>
        <el-descriptions-item label="出行方式">
          <el-tag :type="getVehicleType(deliverer.vehicle_type)" size="small">
            {{ getVehicleText(deliverer.vehicle_type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="车牌号">
          {{ deliverer.vehicle_number || '无' }}
        </el-descriptions-item>
        <el-descriptions-item label="注册时间" :span="2">
          {{ formatDateTime(deliverer.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>

      <el-divider />

      <!-- 认证信息 -->
      <div class="section-title">认证信息</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="身份证号">
          {{ deliverer.id_card || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="认证状态">
          <el-tag :type="getApplicationStatusType(deliverer.application_status)" size="small">
            {{ getApplicationStatusText(deliverer.application_status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="认证时间">
          {{ deliverer.approval_time ? formatDateTime(deliverer.approval_time) : '待认证' }}
        </el-descriptions-item>
        <el-descriptions-item label="健康证有效期">
          {{ deliverer.certificate_expiry || '无' }}
        </el-descriptions-item>
        <el-descriptions-item label="紧急联系人">
          {{ deliverer.emergency_contact_name || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="紧急联系电话">
          {{ deliverer.emergency_contact_phone || '未填写' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 证件照片 -->
      <div class="certificate-images" v-if="deliverer.id_card_front || deliverer.id_card_back">
        <div class="section-title">证件照片</div>
        <div class="image-list">
          <el-image
            v-if="deliverer.id_card_front"
            :src="deliverer.id_card_front"
            :preview-src-list="[deliverer.id_card_front]"
            fit="cover"
            class="certificate-img"
          >
            <template #error>
              <div class="image-error">
                <el-icon><Picture /></el-icon>
                <span>身份证正面</span>
              </div>
            </template>
          </el-image>
          <el-image
            v-if="deliverer.id_card_back"
            :src="deliverer.id_card_back"
            :preview-src-list="[deliverer.id_card_back]"
            fit="cover"
            class="certificate-img"
          >
            <template #error>
              <div class="image-error">
                <el-icon><Picture /></el-icon>
                <span>身份证背面</span>
              </div>
            </template>
          </el-image>
        </div>
      </div>

      <el-divider />

      <!-- 统计数据 -->
      <div class="section-title">统计数据</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="评分">
          <el-rate
            :model-value="parseFloat(deliverer.rating) || 5"
            disabled
            show-score
            text-color="#ff9900"
          />
        </el-descriptions-item>
        <el-descriptions-item label="总订单">
          {{ deliverer.stats?.totalOrders || deliverer.total_orders || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="完成订单">
          {{ deliverer.stats?.completedOrders || deliverer.completed_orders || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="取消订单">
          {{ deliverer.stats?.cancelledOrders || deliverer.cancelled_orders || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="总收入" :span="2">
          <span class="earnings"
            >¥{{
              parseFloat(deliverer.stats?.totalRevenue || deliverer.total_earnings || 0).toFixed(2)
            }}</span
          >
        </el-descriptions-item>
      </el-descriptions>

      <!-- 订单记录 -->
      <div class="orders-section" v-if="deliverer.orders && deliverer.orders.length > 0">
        <el-divider />
        <div class="section-title">最近订单</div>
        <el-table :data="deliverer.orders" size="small" stripe>
          <el-table-column prop="order_no" label="订单号" min-width="180" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getOrderStatusType(row.status)" size="small">
                {{ getOrderStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="金额" width="100">
            <template #default="{ row }">
              <span class="earnings">¥{{ parseFloat(row.price || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 空状态 -->
    <el-empty v-else description="暂无数据" />
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { UserFilled, Picture } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  deliverer: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// 状态
const getStatusType = (status) => {
  const types = {
    active: 'success',
    resting: 'warning',
    disabled: 'danger',
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    active: '在职',
    resting: '休息中',
    disabled: '已禁用',
  }
  return texts[status] || '未知'
}

// 出行方式
const getVehicleType = (type) => {
  const types = {
    walk: 'info',
    bike: 'success',
    electric: 'warning',
    motor: 'danger',
  }
  return types[type] || 'info'
}

const getVehicleText = (type) => {
  const texts = {
    walk: '步行',
    bike: '自行车',
    electric: '电动车',
    motor: '摩托车',
  }
  return texts[type] || '未知'
}

// 认证状态
const getApplicationStatusText = (status) => {
  const texts = {
    approved: '已认证',
    pending: '待审核',
    rejected: '已拒绝',
    banned: '已封禁',
  }
  return texts[status] || '未知'
}

const getApplicationStatusType = (status) => {
  const types = {
    approved: 'success',
    pending: 'warning',
    rejected: 'danger',
    banned: 'danger',
  }
  return types[status] || 'info'
}

// 订单状态
const getOrderStatusType = (status) => {
  const types = {
    pending: 'info',
    accepted: 'primary',
    picking_up: 'warning',
    delivering: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'info'
}

const getOrderStatusText = (status) => {
  const texts = {
    pending: '待接单',
    accepted: '已接单',
    picking_up: '取货中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return texts[status] || status
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.detail-header .el-avatar {
  color: white;
}

.detail-header h3 {
  margin: 0 0 8px 0;
  color: #303133;
}

.detail-header p {
  margin: 0 0 8px 0;
  color: #606266;
}

.tags {
  display: flex;
  gap: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.certificate-images {
  margin-top: 16px;
}

.image-list {
  display: flex;
  gap: 16px;
}

.certificate-img {
  width: 150px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 12px;
}

.image-error .el-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.orders-section {
  margin-top: 16px;
}

.earnings {
  font-weight: 600;
  color: #67c23a;
  font-family: 'Fira Code', monospace;
}

:deep(.el-drawer__body) {
  padding: 20px;
}
</style>
