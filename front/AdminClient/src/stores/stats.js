import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStatsStore = defineStore('stats', () => {
  const dashboardStats = ref({
    totalUsers: 0,
    totalOrders: 0,
    totalTasks: 0,
    totalRevenue: 0,
    dailyActiveUsers: 0,
    orderCompletionRate: 0,
    taskSuccessRate: 0
  })

  const chartData = ref({
    userGrowth: [],
    orderTrends: [],
    taskCategories: [],
    revenueByMonth: []
  })

  const recentActivities = ref([])

  function updateDashboardStats(stats) {
    dashboardStats.value = { ...dashboardStats.value, ...stats }
  }

  function updateChartData(data) {
    chartData.value = { ...chartData.value, ...data }
  }

  function addActivity(activity) {
    recentActivities.value.unshift({
      id: Date.now(),
      ...activity,
      timestamp: new Date().toISOString()
    })

    // 保持最近50条活动记录
    if (recentActivities.value.length > 50) {
      recentActivities.value = recentActivities.value.slice(0, 50)
    }
  }

  return {
    dashboardStats,
    chartData,
    recentActivities,
    updateDashboardStats,
    updateChartData,
    addActivity
  }
})