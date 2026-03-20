const { Deliverer } = require('../../models');

class DelivererStatusController {
    // 更新配送员状态（上线/下线）
    static async updateStatus(req, res) {
        try {
            const userId = req.user.id;
            const { status } = req.body; // active | offline | busy

            const deliverer = await Deliverer.findOne({
                where: { user_id: userId },
            });

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员信息不存在',
                });
            }

            if (deliverer.verification_status !== 'verified') {
                return res.status(400).json({
                    success: false,
                    message: '配送员尚未通过审核',
                });
            }

            await deliverer.update({ status });

            res.json({
                success: true,
                message: '状态更新成功',
                data: { status },
            });
        } catch (error) {
            console.error('更新配送员状态失败:', error);
            res.status(500).json({
                success: false,
                message: '更新配送员状态失败',
                error: error.message,
            });
        }
    }

    // 更新配送员位置
    static async updateLocation(req, res) {
        try {
            const userId = req.user.id;
            const { latitude, longitude } = req.body;

            const deliverer = await Deliverer.findOne({
                where: { user_id: userId },
            });

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员信息不存在',
                });
            }

            await deliverer.update({
                current_latitude: latitude,
                current_longitude: longitude,
                last_location_update: new Date(),
            });

            res.json({
                success: true,
                message: '位置更新成功',
            });
        } catch (error) {
            console.error('更新配送员位置失败:', error);
            res.status(500).json({
                success: false,
                message: '更新配送员位置失败',
                error: error.message,
            });
        }
    }

    // 获取当前状态
    static async getStatus(req, res) {
        try {
            const userId = req.user.id;

            const deliverer = await Deliverer.findOne({
                where: { user_id: userId },
                attributes: ['status', 'current_latitude', 'current_longitude', 'last_location_update'],
            });

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员信息不存在',
                });
            }

            res.json({
                success: true,
                data: deliverer,
            });
        } catch (error) {
            console.error('获取配送员状态失败:', error);
            res.status(500).json({
                success: false,
                message: '获取配送员状态失败',
                error: error.message,
            });
        }
    }
}

module.exports = DelivererStatusController;
