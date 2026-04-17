/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: 应用健康检查
 *     responses:
 *       200:
 *         description: 服务正常
 *
 * /api/public/health:
 *   get:
 *     tags: [Public]
 *     summary: 公共健康检查
 *     responses:
 *       200:
 *         description: 服务正常
 *
 * /api/public/status:
 *   get:
 *     tags: [Public]
 *     summary: 获取服务状态
 *     responses:
 *       200:
 *         description: 返回服务版本和运行状态
 *
 * /api/admin/analytics/dashboard:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: 获取平台概览
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *         description: 统计周期
 *     responses:
 *       200:
 *         description: 平台概览统计
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *
 * /api/admin/analytics/user-behavior:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: 获取用户行为分析
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *     responses:
 *       200:
 *         description: 用户活跃、热门行为和留存数据
 *
 * /api/admin/analytics/service-quality:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: 获取服务质量指标
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *     responses:
 *       200:
 *         description: 订单完成率、平均配送时长和投诉数据
 *
 * /api/admin/analytics/revenue:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: 获取收入分析
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *     responses:
 *       200:
 *         description: 收入趋势、来源分布和佣金统计
 *
 * /api/admin/analytics/revenue/details:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: 获取收入明细详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: payment_method
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: 交易明细列表
 *
 * /api/admin/analytics/realtime:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: 获取实时监控指标
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 最近一小时的实时数据
 *
 * /api/admin/analytics/alerts/abnormal-orders:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: 获取异常订单预警
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *     responses:
 *       200:
 *         description: 异常订单与风险提示
 */
