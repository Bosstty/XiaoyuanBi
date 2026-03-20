import { exportData } from './index'

export const normalizeExportValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.join('、')
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

export const createExportFileName = (prefix, dateRange = []) => {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(
    2,
    '0',
  )}`

  if (Array.isArray(dateRange) && dateRange.length === 2) {
    return `${prefix}_${dateRange[0]}_${dateRange[1]}_${stamp}`
  }

  return `${prefix}_${stamp}`
}

export const exportCsvFile = (rows, prefix, dateRange = []) => {
  exportData(rows, createExportFileName(prefix, dateRange), 'csv')
}
