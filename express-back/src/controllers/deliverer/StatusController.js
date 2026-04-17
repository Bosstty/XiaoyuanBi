const { Deliverer } = require('@/models');

class DelivererStatusController {
    // 更新配送员状态（上线/下线）
    static async updateStatus(req, res) {
        try {
            const userId = req.user.id;
            const { is_online, online, status } = req.body;

            const deliverer = await Deliverer.findOne({
                where: { user_id: userId },
            });

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员信息不存在',
                });
            }

            if (deliverer.application_status !== 'approved' || !deliverer.verified) {
                return res.status(400).json({
                    success: false,
                    message: '配送员尚未通过审核',
                });
            }

            if (deliverer.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: '配送员当前状态不可切换在线状态',
                });
            }

            let nextOnline;
            if (typeof is_online === 'boolean') {
                nextOnline = is_online;
            } else if (typeof online === 'boolean') {
                nextOnline = online;
            } else if (typeof status === 'string') {
                nextOnline = ['active', 'online'].includes(status);
            } else {
                return res.status(400).json({
                    success: false,
                    message: '请提供有效的在线状态',
                });
            }

            await deliverer.update({
                is_online: nextOnline,
                last_online_at: nextOnline ? new Date() : deliverer.last_online_at || new Date(),
            });

            res.json({
                success: true,
                message: '状态更新成功',
                data: {
                    is_online: deliverer.is_online,
                    last_online_at: deliverer.last_online_at,
                },
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
                location_updated_at: new Date(),
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
                attributes: [
                    'is_online',
                    'last_online_at',
                    'status',
                    'current_latitude',
                    'current_longitude',
                    'location_updated_at',
                ],
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
