const { Deliverer, User } = require('../../models');

class DelivererApplicationController {
    // 提交配送员申请
    static async submitApplication(req, res) {
        try {
            const userId = req.user.id;
            const {
                name,
                phone,
                id_card,
                vehicle_type,
                emergency_contact,
                emergency_phone,
            } = req.body;

            // 检查是否已经申请过
            const existingApplication = await Deliverer.findOne({
                where: { user_id: userId },
            });

            if (existingApplication) {
                return res.status(400).json({
                    success: false,
                    message: '您已提交过配送员申请',
                    data: existingApplication,
                });
            }

            // 创建配送员申请
            const application = await Deliverer.create({
                user_id: userId,
                name,
                phone,
                id_card,
                vehicle_type,
                emergency_contact,
                emergency_phone,
                verification_status: 'pending',
                status: 'inactive',
            });

            res.json({
                success: true,
                message: '配送员申请已提交，请等待审核',
                data: application,
            });
        } catch (error) {
            console.error('提交配送员申请失败:', error);
            res.status(500).json({
                success: false,
                message: '提交配送员申请失败',
                error: error.message,
            });
        }
    }

    // 获取申请状态
    static async getApplicationStatus(req, res) {
        try {
            const userId = req.user.id;

            const application = await Deliverer.findOne({
                where: { user_id: userId },
                include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }],
            });

            if (!application) {
                return res.json({
                    success: true,
                    message: '未找到申请记录',
                    data: null,
                });
            }

            res.json({
                success: true,
                data: application,
            });
        } catch (error) {
            console.error('获取申请状态失败:', error);
            res.status(500).json({
                success: false,
                message: '获取申请状态失败',
                error: error.message,
            });
        }
    }

    // 更新申请信息
    static async updateApplication(req, res) {
        try {
            const userId = req.user.id;
            const updateData = req.body;

            const application = await Deliverer.findOne({
                where: { user_id: userId },
            });

            if (!application) {
                return res.status(404).json({
                    success: false,
                    message: '未找到申请记录',
                });
            }

            if (application.verification_status !== 'pending' && application.verification_status !== 'rejected') {
                return res.status(400).json({
                    success: false,
                    message: '只能修改待审核或被拒绝的申请',
                });
            }

            await application.update(updateData);

            res.json({
                success: true,
                message: '申请信息更新成功',
                data: application,
            });
        } catch (error) {
            console.error('更新申请信息失败:', error);
            res.status(500).json({
                success: false,
                message: '更新申请信息失败',
                error: error.message,
            });
        }
    }
}

module.exports = DelivererApplicationController;
