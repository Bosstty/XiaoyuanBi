// 审计日志图表配置

// 操作类型饼图配置
export const getActionChartOption = (data) => {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      bottom: '0%',
      left: 'center',
      textStyle: {
        color: 'var(--text-secondary)',
      },
      itemWidth: 12,
      itemHeight: 12,
    },
    series: [
      {
        name: '操作类型',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
        },
        labelLine: {
          show: true,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        data: data,
        color: [
          '#6366f1',
          '#8b5cf6',
          '#ec4899',
          '#f43f5e',
          '#f97316',
          '#eab308',
          '#22c55e',
          '#14b8a6',
          '#06b6d4',
          '#3b82f6',
        ],
      },
    ],
  }
}

// 趋势图（折线图）配置
export const getTrendChartOption = (dateTrendData) => {
  const dates = dateTrendData.map((item) => item.date)
  const counts = dateTrendData.map((item) => item.count)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>操作次数: {c}',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#e5e7eb',
        },
      },
      axisLabel: {
        color: 'var(--text-secondary)',
        formatter: (value) => value.slice(5),
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: 'var(--text-secondary)',
      },
      splitLine: {
        lineStyle: {
          color: '#f1f5f9',
        },
      },
    },
    series: [
      {
        name: '操作次数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#6366f1',
          width: 3,
        },
        itemStyle: {
          color: '#6366f1',
        },
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
        data: counts,
      },
    ],
  }
}

// 状态分布饼图配置
export const getStatusChartOption = (statusData) => {
  const data = Object.entries(statusData).map(([key, value]) => ({
    name: key,
    value,
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      bottom: '0%',
      left: 'center',
      textStyle: {
        color: 'var(--text-secondary)',
      },
    },
    series: [
      {
        name: '状态分布',
        type: 'pie',
        radius: ['30%', '60%'],
        center: ['50%', '45%'],
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
        },
        data: data,
        color: ['#22c55e', '#6366f1', '#f97316', '#ef4444'],
      },
    ],
  }
}
