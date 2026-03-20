import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const myTasks = ref([])
  const currentTask = ref(null)

  function addTask(taskData) {
    const task = {
      id: Date.now(),
      ...taskData,
      status: 'published',
      createTime: new Date().toISOString(),
      applicants: [],
    }
    tasks.value.unshift(task)
    return task
  }

  function applyForTask(taskId, applicationData) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (task) {
      task.applicants.push({
        id: Date.now(),
        ...applicationData,
        applyTime: new Date().toISOString(),
      })
    }
  }

  function updateTaskStatus(taskId, status) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (task) {
      task.status = status
      task.updateTime = new Date().toISOString()
    }
  }

  function getTasksByCategory(category) {
    return tasks.value.filter((task) => task.category === category)
  }

  function setCurrentTask(task) {
    currentTask.value = task
  }

  return {
    tasks,
    myTasks,
    currentTask,
    addTask,
    applyForTask,
    updateTaskStatus,
    getTasksByCategory,
    setCurrentTask,
  }
})
