<template>
  <div class="user-settings">
    <van-nav-bar title="设置" left-arrow @click-left="goBack">
      <template #subtitle>个人偏好和账户设置</template>
    </van-nav-bar>

    <div class="settings-content">
      <van-tabs v-model:active="activeTab" class="settings-tabs">
        <!-- 个人信息设置 -->
        <van-tab title="个人信息" name="profile">
          <div class="tab-content">
            <van-cell-group title="基本信息">
              <!-- 头像区域 -->
              <van-cell title="头像" center>
                <template #value>
                  <div class="avatar-section">
                    <van-image
                      :src="profileForm.avatar"
                      round
                      width="40px"
                      height="40px"
                      fit="cover"
                    >
                      <template #error>
                        <div class="avatar-fallback">
                          {{ profileForm.username?.charAt(0) }}
                        </div>
                      </template>
                    </van-image>
                    <van-uploader
                      :after-read="handleAvatarUpload"
                      :max-count="1"
                      :max-size="2 * 1024 * 1024"
                    >
                      <van-button size="mini" type="primary">更换</van-button>
                    </van-uploader>
                  </div>
                </template>
              </van-cell>

              <van-field v-model="profileForm.username" name="username" label="用户名" disabled />

              <van-field
                v-model="profileForm.real_name"
                name="real_name"
                label="真实姓名"
                placeholder="请输入真实姓名"
                :rules="[{ required: true, message: '请输入真实姓名' }]"
              />

              <van-field v-model="profileForm.student_id" name="student_id" label="学号" disabled />

              <van-field
                v-model="profileForm.phone"
                name="phone"
                label="手机号"
                placeholder="请输入手机号"
                :rules="[{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }]"
              />

              <van-field
                v-model="profileForm.email"
                name="email"
                label="邮箱"
                placeholder="请输入邮箱"
                type="email"
                :rules="[{ type: 'email', message: '请输入正确的邮箱地址' }]"
              />

              <van-field
                v-model="profileForm.bio"
                name="bio"
                label="个人简介"
                type="textarea"
                placeholder="介绍一下自己..."
                maxlength="200"
                show-word-limit
                :autosize="{ minHeight: '60px' }"
              />

              <div class="form-actions">
                <van-button type="primary" @click="updateProfile" :loading="profileLoading" block>
                  保存更改
                </van-button>
              </div>
            </van-cell-group>
          </div>
        </van-tab>

        <!-- 安全设置 -->
        <van-tab title="安全设置" name="security">
          <div class="tab-content">
            <van-cell-group title="密码管理">
              <van-field
                v-model="passwordForm.old_password"
                name="old_password"
                label="当前密码"
                type="password"
                placeholder="请输入当前密码"
                :rules="[{ required: true, message: '请输入当前密码' }]"
              />

              <van-field
                v-model="passwordForm.new_password"
                name="new_password"
                label="新密码"
                type="password"
                placeholder="请输入新密码"
                :rules="[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度不能少于6位' },
                ]"
              />

              <van-field
                v-model="passwordForm.confirm_password"
                name="confirm_password"
                label="确认新密码"
                type="password"
                placeholder="请再次输入新密码"
                :rules="[
                  { required: true, message: '请确认新密码' },
                  { validator: validateConfirmPassword },
                ]"
              />

              <div class="form-actions">
                <van-button type="primary" @click="changePassword" :loading="passwordLoading" block>
                  修改密码
                </van-button>
              </div>
            </van-cell-group>
          </div>
        </van-tab>

        <!-- 通知设置 -->
        <van-tab title="通知设置" name="notifications">
          <div class="tab-content">
            <van-cell-group title="消息通知">
              <van-cell title="系统通知" label="接收系统重要通知和公告">
                <template #right-icon>
                  <van-switch v-model="notificationSettings.system" />
                </template>
              </van-cell>

              <van-cell title="订单通知" label="代取订单状态变更通知">
                <template #right-icon>
                  <van-switch v-model="notificationSettings.orders" />
                </template>
              </van-cell>

              <van-cell title="任务通知" label="任务申请和状态变更通知">
                <template #right-icon>
                  <van-switch v-model="notificationSettings.tasks" />
                </template>
              </van-cell>

              <van-cell title="论坛通知" label="帖子回复和点赞通知">
                <template #right-icon>
                  <van-switch v-model="notificationSettings.forum" />
                </template>
              </van-cell>

              <van-cell title="邮件通知" label="重要消息邮件提醒">
                <template #right-icon>
                  <van-switch v-model="notificationSettings.email" />
                </template>
              </van-cell>

              <div class="form-actions">
                <van-button
                  type="primary"
                  @click="saveNotificationSettings"
                  :loading="notificationLoading"
                  block
                >
                  保存设置
                </van-button>
              </div>
            </van-cell-group>
          </div>
        </van-tab>

        <!-- 隐私设置 -->
        <van-tab title="隐私设置" name="privacy">
          <div class="tab-content">
            <van-cell-group title="隐私偏好">
              <van-cell
                title="个人资料可见性"
                label="控制其他用户是否可以查看您的个人资料"
                is-link
                :value="getVisibilityText(privacySettings.profile_visibility)"
                @click="showVisibilityPicker = true"
              />

              <van-cell title="联系方式可见性" label="控制其他用户是否可以看到您的联系方式">
                <template #right-icon>
                  <van-switch v-model="privacySettings.contact_visible" />
                </template>
              </van-cell>

              <van-cell title="在线状态" label="显示您的在线状态给其他用户">
                <template #right-icon>
                  <van-switch v-model="privacySettings.online_status" />
                </template>
              </van-cell>

              <div class="form-actions">
                <van-button
                  type="primary"
                  @click="savePrivacySettings"
                  :loading="privacyLoading"
                  block
                >
                  保存设置
                </van-button>
              </div>
            </van-cell-group>
          </div>
        </van-tab>

        <!-- 应用设置 -->
        <van-tab title="应用设置" name="app">
          <div class="tab-content">
            <van-cell-group title="界面偏好">
              <van-cell
                title="主题模式"
                label="选择您喜欢的界面主题"
                is-link
                :value="getThemeText(appSettings.theme)"
                @click="showThemePicker = true"
              />

              <van-cell
                title="语言设置"
                label="选择界面语言"
                is-link
                :value="getLanguageText(appSettings.language)"
                @click="showLanguagePicker = true"
              />

              <van-cell title="自动保存草稿" label="发布内容时自动保存草稿">
                <template #right-icon>
                  <van-switch v-model="appSettings.auto_save" />
                </template>
              </van-cell>

              <div class="form-actions">
                <van-button type="primary" @click="saveAppSettings" :loading="appLoading" block>
                  保存设置
                </van-button>
              </div>
            </van-cell-group>
          </div>
        </van-tab>

        <!-- 账户管理 -->
        <van-tab title="账户管理" name="account">
          <div class="tab-content">
            <van-cell-group title="账户操作">
              <div class="danger-zone">
                <h4>危险操作</h4>
                <p>以下操作可能影响您的账户安全，请谨慎操作</p>

                <div class="danger-actions">
                  <van-button type="warning" @click="handleLogoutAllDevices" block>
                    <van-icon name="sign-out" />
                    登出所有设备
                  </van-button>
                  <van-button type="danger" @click="handleDeleteAccount" block>
                    <van-icon name="delete-o" />
                    删除账户
                  </van-button>
                </div>
              </div>
            </van-cell-group>
          </div>
        </van-tab>
      </van-tabs>
    </div>

    <!-- 可见性选择器 -->
    <van-popup v-model:show="showVisibilityPicker" position="bottom">
      <van-picker
        :columns="visibilityOptions"
        @confirm="onVisibilityConfirm"
        @cancel="showVisibilityPicker = false"
        title="选择可见性"
      />
    </van-popup>

    <!-- 主题选择器 -->
    <van-popup v-model:show="showThemePicker" position="bottom">
      <van-picker
        :columns="themeOptions"
        @confirm="onThemeConfirm"
        @cancel="showThemePicker = false"
        title="选择主题"
      />
    </van-popup>

    <!-- 语言选择器 -->
    <van-popup v-model:show="showLanguagePicker" position="bottom">
      <van-picker
        :columns="languageOptions"
        @confirm="onLanguageConfirm"
        @cancel="showLanguagePicker = false"
        title="选择语言"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { userAPI } from '@/utils/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const activeTab = ref('profile')
const profileLoading = ref(false)
const passwordLoading = ref(false)
const notificationLoading = ref(false)
const privacyLoading = ref(false)
const appLoading = ref(false)

const showVisibilityPicker = ref(false)
const showThemePicker = ref(false)
const showLanguagePicker = ref(false)

// 个人信息表单
const profileForm = ref({
  username: '',
  real_name: '',
  student_id: '',
  phone: '',
  email: '',
  bio: '',
  avatar: '',
})

// 密码修改表单
const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: '',
})

// 通知设置
const notificationSettings = ref({
  system: true,
  orders: true,
  tasks: true,
  forum: true,
  email: false,
})

// 隐私设置
const privacySettings = ref({
  profile_visibility: 'public',
  contact_visible: true,
  online_status: true,
})

// 应用设置
const appSettings = ref({
  theme: 'light',
  language: 'zh-CN',
  auto_save: true,
})

// 选择器选项
const visibilityOptions = [
  { text: '公开', value: 'public' },
  { text: '仅好友', value: 'friends' },
  { text: '私密', value: 'private' },
]

const themeOptions = [
  { text: '浅色主题', value: 'light' },
  { text: '深色主题', value: 'dark' },
  { text: '跟随系统', value: 'auto' },
]

const languageOptions = [
  { text: '简体中文', value: 'zh-CN' },
  { text: 'English', value: 'en-US' },
]

// 方法
const goBack = () => {
  router.push('/user')
}

// 加载用户信息
const loadUserProfile = async () => {
  try {
    const response = await userAPI.getProfile()
    if (response.success) {
      const userData = response.data
      profileForm.value = {
        username: userData.username,
        real_name: userData.real_name,
        student_id: userData.student_id,
        phone: userData.phone,
        email: userData.email,
        bio: userData.bio,
        avatar: userData.avatar,
      }
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

// 更新个人信息
const updateProfile = async () => {
  try {
    profileLoading.value = true

    const response = await userAPI.updateProfile(profileForm.value)
    if (response.success) {
      showToast('个人信息更新成功')
      userStore.updateUserInfo(response.data)
    }
  } catch (error) {
    showToast('更新失败: ' + error.message)
  } finally {
    profileLoading.value = false
  }
}

// 修改密码
const changePassword = async () => {
  try {
    passwordLoading.value = true

    const response = await userAPI.changePassword(passwordForm.value)
    if (response.success) {
      showToast('密码修改成功')
      passwordForm.value = {
        old_password: '',
        new_password: '',
        confirm_password: '',
      }
    }
  } catch (error) {
    showToast('修改失败: ' + error.message)
  } finally {
    passwordLoading.value = false
  }
}

// 头像上传处理
const handleAvatarUpload = async (file) => {
  // 验证文件类型和大小
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    showToast('头像图片只能是 JPG/PNG 格式!')
    return
  }
  if (!isLt2M) {
    showToast('头像图片大小不能超过 2MB!')
    return
  }

  try {
    const formData = new FormData()
    formData.append('avatar', file.file)

    const response = await userAPI.uploadAvatar(formData)
    if (response.success) {
      profileForm.value.avatar = response.data.avatar
      userStore.updateUser({ avatar: response.data.avatar })
      showToast('头像更新成功')
    } else {
      showToast(response.message || '头像上传失败')
    }
  } catch (error) {
    showToast('头像上传失败')
  }
}

// 表单验证函数
const validateConfirmPassword = (value) => {
  if (value !== passwordForm.value.new_password) {
    return '两次输入的密码不一致'
  }
  return true
}

// 保存通知设置
const saveNotificationSettings = async () => {
  notificationLoading.value = true
  try {
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))
    showToast('通知设置已保存')
  } catch (error) {
    showToast('保存失败')
  } finally {
    notificationLoading.value = false
  }
}

// 保存隐私设置
const savePrivacySettings = async () => {
  privacyLoading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    showToast('隐私设置已保存')
  } catch (error) {
    showToast('保存失败')
  } finally {
    privacyLoading.value = false
  }
}

// 保存应用设置
const saveAppSettings = async () => {
  appLoading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    showToast('应用设置已保存')
  } catch (error) {
    showToast('保存失败')
  } finally {
    appLoading.value = false
  }
}

// 获取文本显示
const getVisibilityText = (value) => {
  const option = visibilityOptions.find((item) => item.value === value)
  return option ? option.text : '公开'
}

const getThemeText = (value) => {
  const option = themeOptions.find((item) => item.value === value)
  return option ? option.text : '浅色主题'
}

const getLanguageText = (value) => {
  const option = languageOptions.find((item) => item.value === value)
  return option ? option.text : '简体中文'
}

// 选择器确认事件
const onVisibilityConfirm = ({ selectedOptions }) => {
  privacySettings.value.profile_visibility = selectedOptions[0].value
  showVisibilityPicker.value = false
}

const onThemeConfirm = ({ selectedOptions }) => {
  appSettings.value.theme = selectedOptions[0].value
  showThemePicker.value = false
}

const onLanguageConfirm = ({ selectedOptions }) => {
  appSettings.value.language = selectedOptions[0].value
  showLanguagePicker.value = false
}

// 登出所有设备
const handleLogoutAllDevices = async () => {
  try {
    await showConfirmDialog({
      title: '确认操作',
      message: '这将登出您在所有设备上的登录状态，确定继续吗？',
    })

    // 执行登出操作
    showToast('已登出所有设备')
  } catch (error) {
    // 用户取消
  }
}

// 删除账户
const handleDeleteAccount = async () => {
  try {
    await showConfirmDialog({
      title: '危险操作',
      message: '删除账户后，您的所有数据将无法恢复，确定要删除账户吗？',
    })

    // 执行删除操作
    showToast('账户删除功能暂未开放')
  } catch (error) {
    // 用户取消
  }
}

// 生命周期
onMounted(() => {
  loadUserProfile()
})
</script>

<style scoped>
.user-settings {
  background: #f7f8fa;
  min-height: 100vh;
}

.settings-content {
  padding-top: 8px;
}

.settings-tabs {
  background: white;
}

.tab-content {
  padding: 16px 0;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #1989fa;
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.form-actions {
  padding: 16px;
  background: white;
}

.danger-zone {
  margin: 16px;
  border: 1px solid #ee0a24;
  border-radius: 8px;
  padding: 16px;
  background: #fef0f0;
}

.danger-zone h4 {
  margin: 0 0 8px 0;
  color: #ee0a24;
  font-size: 14px;
  font-weight: 600;
}

.danger-zone p {
  margin: 0 0 16px 0;
  color: #969799;
  font-size: 12px;
}

.danger-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
