const { Deliverer, User } = require('@/models');

const buildApplicationPayload = req => {
    const files = req.files || {};
    const body = req.body || {};
    const normalizeUploadPath = value => {
        if (!value) return null;
        return String(value).replace(/\\/g, '/').replace(/^.*\/uploads\//, '/uploads/');
    };

    return {
        real_name: body.real_name || body.name,
        phone: body.phone,
        id_card: body.id_card,
        vehicle_type: body.vehicle_type || 'walk',
        vehicle_number: null,
        emergency_contact_name: body.emergency_contact_name || body.emergency_contact,
        emergency_contact_phone: body.emergency_contact_phone || body.emergency_phone,
        service_areas: null,
        available_hours: null,
        id_card_front:
            normalizeUploadPath(files.id_card_front?.[0]?.path) ||
            normalizeUploadPath(body.id_card_front) ||
            null,
        id_card_back:
            normalizeUploadPath(files.id_card_back?.[0]?.path) ||
            normalizeUploadPath(body.id_card_back) ||
            null,
        vehicle_license: null,
        application_status: 'pending',
        verified: false,
        status: 'inactive',
    };
};

class DelivererApplicationController {
    // 提交配送员申请
    static async submitApplication(req, res) {
        try {
            const userId = req.user.id;
            const payload = buildApplicationPayload(req);

            if (
                !payload.real_name ||
                !payload.phone ||
                !payload.id_card ||
                !payload.emergency_contact_name ||
                !payload.emergency_contact_phone ||
                !payload.id_card_front ||
                !payload.id_card_back
            ) {
                return res.status(400).json({
                    success: false,
                    message: '请填写完整申请信息并上传身份证正反面照片',
                });
            }

            // 检查是否已经申请过
            const existingApplication = await Deliverer.findOne({
                where: { user_id: userId },
            });

            if (existingApplication) {
                if (existingApplication.application_status === 'banned') {
                    return res.status(403).json({
                        success: false,
                        message: '您的认证信息已被封禁，请联系客服解决',
                        data: existingApplication,
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: '您已提交过配送员申请',
                    data: existingApplication,
                });
            }

            // 创建配送员申请
            const application = await Deliverer.create({
                user_id: userId,
                ...payload,
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
            const application = await Deliverer.findOne({
                where: { user_id: userId },
            });

            if (!application) {
                return res.status(404).json({
                    success: false,
                    message: '未找到申请记录',
                });
            }

            if (
                application.application_status !== 'pending' &&
                application.application_status !== 'rejected'
            ) {
                if (application.application_status === 'banned') {
                    return res.status(403).json({
                        success: false,
                        message: '您的认证信息已被封禁，请联系客服解决',
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: '只能修改待审核或被拒绝的申请',
                });
            }

            const payload = buildApplicationPayload(req);

            if (
                !payload.real_name ||
                !payload.phone ||
                !payload.id_card ||
                !payload.emergency_contact_name ||
                !payload.emergency_contact_phone ||
                !payload.id_card_front ||
                !payload.id_card_back
            ) {
                return res.status(400).json({
                    success: false,
                    message: '请填写完整申请信息并上传身份证正反面照片',
                });
            }

            await application.update({
                ...payload,
                application_status: 'pending',
                rejection_reason: null,
            });

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
