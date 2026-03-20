const { Deliverer } = require('../../models');

class ServiceDelivererController {
    // 获取配送员列表
    async getDeliverers(req, res) {
        try {
            const { keyword, status, page = 1, limit = 20 } = req.query;
            const where = {};

            if (keyword) {
                where[Symbol.for('or')] = [
                    { username: { [Symbol.for('like')]: `%${keyword}%` } },
                    { phone: { [Symbol.for('like')]: `%${keyword}%` } },
                ];
            }
            if (status) where.status = status;

            const { count, rows } = await Deliverer.findAndCountAll({
                where,
                attributes: { exclude: ['password'] },
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: (page - 1) * limit,
            });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: count,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取配送员列表失败',
                error: error.message,
            });
        }
    }

    // 获取配送员详情
    async getDelivererDetail(req, res) {
        try {
            const deliverer = await Deliverer.findByPk(req.params.id, {
                attributes: { exclude: ['password'] },
            });

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员不存在',
                });
            }

            res.json({
                success: true,
                data: deliverer,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取配送员详情失败',
                error: error.message,
            });
        }
    }

    // 更新配送员状态
    async updateStatus(req, res) {
        try {
            const { status, reason } = req.body;
            const deliverer = await Deliverer.findByPk(req.params.id);

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员不存在',
                });
            }

            deliverer.status = status;
            if (reason) {
                deliverer.status_reason = reason;
            }
            await deliverer.save();

            res.json({
                success: true,
                message: '配送员状态更新成功',
                data: deliverer,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '更新配送员状态失败',
                error: error.message,
            });
        }
    }
}

module.exports = new ServiceDelivererController();
