<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">系统设置</h1>
        <p class="page-subtitle">配置平台基础参数和系统功能</p>
      </div>
    </div>

    <el-card class="settings-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基础设置 -->
        <el-tab-pane label="基础设置" name="basic">
          <el-form :model="basicSettings" label-width="150px" class="settings-form">
            <el-form-item label="网站名称">
              <el-input v-model="basicSettings.siteName" placeholder="请输入网站名称" />
            </el-form-item>
            <el-form-item label="网站描述">
              <el-input
                v-model="basicSettings.siteDescription"
                type="textarea"
                :rows="3"
                placeholder="请输入网站描述"
              />
            </el-form-item>
            <el-form-item label="联系邮箱">
              <el-input v-model="basicSettings.contactEmail" placeholder="请输入联系邮箱" />
            </el-form-item>
            <el-form-item label="客服电话">
              <el-input v-model="basicSettings.servicePhone" placeholder="请输入客服电话" />
            </el-form-item>
            <el-form-item label="网站Logo">
              <el-upload
                class="logo-uploader"
                action="/api/upload"
                :show-file-list="false"
                :on-success="handleLogoUpload"
              >
                <img v-if="basicSettings.logoUrl" :src="basicSettings.logoUrl" class="logo" />
                <el-icon v-else class="logo-uploader-icon"><Plus /></el-icon>
              </el-upload>
            </el-form-item>
            <el-form-item label="系统维护模式">
              <el-switch
                v-model="basicSettings.maintenanceMode"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
            <el-form-item label="维护提示信息" v-if="basicSettings.maintenanceMode">
              <el-input
                v-model="basicSettings.maintenanceMessage"
                type="textarea"
                :rows="2"
                placeholder="系统维护中，请稍后再试"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 用户设置 -->
        <el-tab-pane label="用户设置" name="user">
          <el-form :model="userSettings" label-width="150px" class="settings-form">
            <el-form-item label="新用户默认积分">
              <el-input-number v-model="userSettings.defaultCredits" :min="0" :max="1000" />
            </el-form-item>
            <el-form-item label="每日签到积分">
              <el-input-number v-model="userSettings.dailySignInCredits" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="允许游客访问">
              <el-switch
                v-model="userSettings.allowGuestAccess"
                active-text="允许"
                inactive-text="禁止"
              />
            </el-form-item>
            <el-form-item label="用户注册审核">
              <el-switch
                v-model="userSettings.requireApproval"
                active-text="需要审核"
                inactive-text="自动通过"
              />
            </el-form-item>
            <el-form-item label="邮箱验证">
              <el-switch
                v-model="userSettings.requireEmailVerification"
                active-text="必须验证"
                inactive-text="可选验证"
              />
            </el-form-item>
            <el-form-item label="手机验证">
              <el-switch
                v-model="userSettings.requirePhoneVerification"
                active-text="必须验证"
                inactive-text="可选验证"
              />
            </el-form-item>
            <el-form-item label="密码复杂度">
              <el-select v-model="userSettings.passwordComplexity" placeholder="请选择密码复杂度">
                <el-option label="简单 (6位以上)" value="simple" />
                <el-option label="中等 (8位+数字字母)" value="medium" />
                <el-option label="复杂 (8位+数字字母符号)" value="complex" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 订单设置 -->
        <el-tab-pane label="订单设置" name="order">
          <el-form :model="orderSettings" label-width="150px" class="settings-form">
            <el-form-item label="自动取消时间">
              <el-input-number v-model="orderSettings.autoCancelHours" :min="1" :max="72" />
              <span class="unit">小时</span>
            </el-form-item>
            <el-form-item label="平台手续费率">
              <el-input-number
                v-model="orderSettings.platformFeeRate"
                :min="0"
                :max="20"
                :precision="2"
              />
              <span class="unit">%</span>
            </el-form-item>
            <el-form-item label="最低订单金额">
              <el-input-number v-model="orderSettings.minOrderAmount" :min="0" :precision="2" />
              <span class="unit">元</span>
            </el-form-item>
            <el-form-item label="最高订单金额">
              <el-input-number v-model="orderSettings.maxOrderAmount" :min="0" :precision="2" />
              <span class="unit">元</span>
            </el-form-item>
            <el-form-item label="配送费计算方式">
              <el-radio-group v-model="orderSettings.deliveryFeeType">
                <el-radio value="fixed">固定费用</el-radio>
                <el-radio value="distance">按距离计算</el-radio>
                <el-radio value="free">免费配送</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="固定配送费" v-if="orderSettings.deliveryFeeType === 'fixed'">
              <el-input-number v-model="orderSettings.fixedDeliveryFee" :min="0" :precision="2" />
              <span class="unit">元</span>
            </el-form-item>
            <el-form-item label="每公里费用" v-if="orderSettings.deliveryFeeType === 'distance'">
              <el-input-number v-model="orderSettings.perKmFee" :min="0" :precision="2" />
              <span class="unit">元/公里</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 支付设置 -->
        <el-tab-pane label="支付设置" name="payment">
          <el-form :model="paymentSettings" label-width="150px" class="settings-form">
            <el-form-item label="支付方式">
              <el-checkbox-group v-model="paymentSettings.enabledMethods">
                <el-checkbox value="wechat">微信支付</el-checkbox>
                <el-checkbox value="alipay">支付宝</el-checkbox>
                <el-checkbox value="balance">余额支付</el-checkbox>
                <el-checkbox value="credit">积分支付</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item
              label="微信支付配置"
              v-if="paymentSettings.enabledMethods.includes('wechat')"
            >
              <el-input
                v-model="paymentSettings.wechat.appId"
                placeholder="微信AppID"
                style="margin-bottom: 10px"
              />
              <el-input
                v-model="paymentSettings.wechat.mchId"
                placeholder="商户号"
                style="margin-bottom: 10px"
              />
              <el-input
                v-model="paymentSettings.wechat.apiKey"
                placeholder="API密钥"
                type="password"
              />
            </el-form-item>
            <el-form-item
              label="支付宝配置"
              v-if="paymentSettings.enabledMethods.includes('alipay')"
            >
              <el-input
                v-model="paymentSettings.alipay.appId"
                placeholder="支付宝AppID"
                style="margin-bottom: 10px"
              />
              <el-input
                v-model="paymentSettings.alipay.privateKey"
                placeholder="应用私钥"
                type="password"
              />
            </el-form-item>
            <el-form-item
              label="积分兑换比例"
              v-if="paymentSettings.enabledMethods.includes('credit')"
            >
              <el-input-number v-model="paymentSettings.creditExchangeRate" :min="1" :max="1000" />
              <span class="unit">积分 = 1元</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 通知设置 -->
        <el-tab-pane label="通知设置" name="notification">
          <el-form :model="notificationSettings" label-width="150px" class="settings-form">
            <el-form-item label="邮件通知">
              <el-switch
                v-model="notificationSettings.emailEnabled"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
            <el-form-item label="SMTP服务器" v-if="notificationSettings.emailEnabled">
              <el-input
                v-model="notificationSettings.smtp.host"
                placeholder="smtp.example.com"
                style="margin-bottom: 10px"
              />
              <el-input-number
                v-model="notificationSettings.smtp.port"
                placeholder="端口"
                style="width: 150px; margin-bottom: 10px"
              />
              <el-input
                v-model="notificationSettings.smtp.username"
                placeholder="用户名"
                style="margin-bottom: 10px"
              />
              <el-input
                v-model="notificationSettings.smtp.password"
                placeholder="密码"
                type="password"
              />
            </el-form-item>
            <el-form-item label="短信通知">
              <el-switch
                v-model="notificationSettings.smsEnabled"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
            <el-form-item label="短信服务商" v-if="notificationSettings.smsEnabled">
              <el-select v-model="notificationSettings.smsProvider" placeholder="请选择服务商">
                <el-option label="阿里云" value="aliyun" />
                <el-option label="腾讯云" value="tencent" />
                <el-option label="华为云" value="huawei" />
              </el-select>
            </el-form-item>
            <el-form-item label="推送通知">
              <el-switch
                v-model="notificationSettings.pushEnabled"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 安全设置 -->
        <el-tab-pane label="安全设置" name="security">
          <el-form :model="securitySettings" label-width="150px" class="settings-form">
            <el-form-item label="登录失败限制">
              <el-input-number v-model="securitySettings.maxLoginAttempts" :min="3" :max="10" />
              <span class="unit">次</span>
            </el-form-item>
            <el-form-item label="锁定时长">
              <el-input-number v-model="securitySettings.lockoutDuration" :min="5" :max="120" />
              <span class="unit">分钟</span>
            </el-form-item>
            <el-form-item label="会话超时">
              <el-input-number v-model="securitySettings.sessionTimeout" :min="30" :max="1440" />
              <span class="unit">分钟</span>
            </el-form-item>
            <el-form-item label="IP白名单">
              <el-input
                v-model="securitySettings.ipWhitelist"
                type="textarea"
                :rows="3"
                placeholder="每行一个IP地址，支持CIDR格式"
              />
            </el-form-item>
            <el-form-item label="启用两步验证">
              <el-switch
                v-model="securitySettings.twoFactorEnabled"
                active-text="开启"
                inactive-text="关闭"
              />
            </el-form-item>
            <el-form-item label="API访问限制">
              <el-input-number v-model="securitySettings.apiRateLimit" :min="100" :max="10000" />
              <span class="unit">次/小时</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button type="primary" size="large" @click="saveSettings" :loading="saving"
          >保存设置</el-button
        >
        <el-button size="large" @click="resetSettings">重置</el-button>
        <el-button type="warning" size="large" @click="exportSettings">导出配置</el-button>
        <el-button type="info" size="large" @click="importSettings">导入配置</el-button>
      </div>
    </el-card>

    <!-- 系统信息 -->
    <el-card class="system-info-card">
      <template #header>
        <h3>系统信息</h3>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="系统版本">{{ systemInfo.version }}</el-descriptions-item>
        <el-descriptions-item label="运行环境">{{ systemInfo.environment }}</el-descriptions-item>
        <el-descriptions-item label="数据库版本">{{ systemInfo.dbVersion }}</el-descriptions-item>
        <el-descriptions-item label="服务器时间">{{ systemInfo.serverTime }}</el-descriptions-item>
        <el-descriptions-item label="运行时间">{{ systemInfo.uptime }}</el-descriptions-item>
        <el-descriptions-item label="内存使用">{{ systemInfo.memoryUsage }}</el-descriptions-item>
        <el-descriptions-item label="磁盘空间">{{ systemInfo.diskSpace }}</el-descriptions-item>
        <el-descriptions-item label="在线用户">{{ systemInfo.onlineUsers }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { systemApi } from '@/api'

// 响应式数据
const activeTab = ref('basic')
const saving = ref(false)

const basicSettings = reactive({
  siteName: '哈尔滨学院校园综合服务平台',
  siteDescription: '为哈尔滨学院学生提供便捷的校园生活服务',
  contactEmail: 'support@campus.edu.cn',
  servicePhone: '400-123-4567',
  logoUrl: '',
  maintenanceMode: false,
  maintenanceMessage: '系统维护中，请稍后再试',
})

const userSettings = reactive({
  defaultCredits: 100,
  dailySignInCredits: 5,
  allowGuestAccess: true,
  requireApproval: false,
  requireEmailVerification: true,
  requirePhoneVerification: false,
  passwordComplexity: 'medium',
})

const orderSettings = reactive({
  autoCancelHours: 24,
  platformFeeRate: 5.0,
  minOrderAmount: 1.0,
  maxOrderAmount: 500.0,
  deliveryFeeType: 'fixed',
  fixedDeliveryFee: 3.0,
  perKmFee: 2.0,
})

const paymentSettings = reactive({
  enabledMethods: ['wechat', 'alipay', 'balance'],
  wechat: {
    appId: '',
    mchId: '',
    apiKey: '',
  },
  alipay: {
    appId: '',
    privateKey: '',
  },
  creditExchangeRate: 100,
})

const notificationSettings = reactive({
  emailEnabled: true,
  smtp: {
    host: '',
    port: 587,
    username: '',
    password: '',
  },
  smsEnabled: false,
  smsProvider: 'aliyun',
  pushEnabled: true,
})

const securitySettings = reactive({
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  sessionTimeout: 120,
  ipWhitelist: '',
  twoFactorEnabled: false,
  apiRateLimit: 1000,
})

const systemInfo = reactive({
  version: '1.0.0',
  environment: 'Production',
  dbVersion: 'MySQL 8.0',
  serverTime: new Date().toLocaleString(),
  uptime: '15天 8小时 32分钟',
  memoryUsage: '2.1GB / 8GB',
  diskSpace: '125GB / 500GB',
  onlineUsers: 342,
})

// 方法
const fetchSettings = async () => {
  try {
    const response = await systemApi.getSettings()
    if (response.success) {
      // 更新各个设置对象
      Object.assign(basicSettings, response.data.basic || {})
      Object.assign(userSettings, response.data.user || {})
      Object.assign(orderSettings, response.data.order || {})
      Object.assign(paymentSettings, response.data.payment || {})
      Object.assign(notificationSettings, response.data.notification || {})
      Object.assign(securitySettings, response.data.security || {})
    }
  } catch (error) {
    ElMessage.error('获取系统设置失败: ' + error.message)
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    const settings = {
      basic: basicSettings,
      user: userSettings,
      order: orderSettings,
      payment: paymentSettings,
      notification: notificationSettings,
      security: securitySettings,
    }

    const response = await systemApi.updateSettings(settings)
    if (response.success) {
      ElMessage.success('设置保存成功')
    }
  } catch (error) {
    ElMessage.error('保存设置失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

const resetSettings = async () => {
  try {
    await ElMessageBox.confirm('确定要重置所有设置到默认值吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await systemApi.resetSettings()
    if (response.success) {
      ElMessage.success('重置成功')
      // 重新加载设置
      fetchSettings()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置失败: ' + error.message)
    }
  }
}

const exportSettings = async () => {
  try {
    const response = await systemApi.exportSettings()
    if (response.success || response.data) {
      // 创建下载
      const data = response.data || response
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `system-settings-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      ElMessage.success('导出成功')
    }
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message)
  }
}

const importSettings = async () => {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const settings = JSON.parse(text)

        await ElMessageBox.confirm('确定要导入设置吗？这将覆盖当前所有设置。', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })

        const response = await systemApi.importSettings(settings)
        if (response.success) {
          ElMessage.success('导入成功')
          // 重新加载设置
          fetchSettings()
        }
      } catch (parseError) {
        ElMessage.error('文件解析失败: ' + parseError.message)
      }
    }
    input.click()
  } catch (error) {
    ElMessage.error('导入失败: ' + error.message)
  }
}

const handleLogoUpload = (response) => {
  if (response.success) {
    basicSettings.logoUrl = response.data.url
    ElMessage.success('Logo上传成功')
  } else {
    ElMessage.error('Logo上传失败')
  }
}

// 生命周期
onMounted(() => {
  fetchSettings()

  // 定时更新系统信息
  setInterval(() => {
    systemInfo.serverTime = new Date().toLocaleString()
  }, 1000)
})
</script>

<style scoped>
.page-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  color: var(--text-primary, #2c3e50);
}

.page-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #909399);
}

.settings-form {
  max-width: 600px;
  margin: 20px 0;
}

.unit {
  margin-left: 10px;
  color: #666;
}

.logo-uploader .logo {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
}

.logo-uploader .logo-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  line-height: 100px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.logo-uploader:hover .logo-uploader-icon {
  border-color: var(--primary);
  color: var(--primary);
}

.action-buttons {
  margin-top: 30px;
  text-align: center;
  padding: 20px;
  border-top: 1px solid #eee;
}

.action-buttons .el-button {
  margin: 0 10px;
}

.system-info-card {
  margin-top: 20px;
  border-radius: var(--radius-xl, 16px);
}

/* 响应式 */
@media (max-width: 768px) {
  .page-container {
    padding: 12px;
  }

  .page-title {
    font-size: 1.5rem;
  }
}
</style>
