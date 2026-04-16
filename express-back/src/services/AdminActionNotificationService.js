const { Message, User } = require('../models');
const emailService = require('../../services/emailService');

function getAdminDisplayName(adminUser) {
    return (
        adminUser?.name ||
        adminUser?.real_name ||
        adminUser?.username ||
        (adminUser?.id ? `管理员#${adminUser.id}` : '管理员')
    );
}

function buildActionConfig(entityType, action) {
    const map = {
        forum_post: {
            reject: { title: '帖子审核未通过', actionLabel: '审核驳回', type: 'forum' },
            hide: { title: '帖子已被下架', actionLabel: '管理员下架', type: 'forum' },
            delete: { title: '帖子已被删除', actionLabel: '管理员删除', type: 'forum' },
            pin: { title: '帖子已被置顶', actionLabel: '管理员置顶', type: 'forum' },
            unpin: { title: '帖子已取消置顶', actionLabel: '取消置顶', type: 'forum' },
            restore: { title: '帖子已恢复展示', actionLabel: '恢复展示', type: 'forum' },
            approve: { title: '帖子审核已通过', actionLabel: '审核通过', type: 'forum' },
        },
        task: {
            cancelled: { title: '任务已被管理员下架', actionLabel: '管理员下架', type: 'task' },
            expired: { title: '任务已被管理员结束', actionLabel: '管理员结束', type: 'task' },
            delete: { title: '任务已被删除', actionLabel: '管理员删除', type: 'task' },
            published: { title: '任务审核已通过', actionLabel: '审核通过', type: 'task' },
        },
        pickup_order: {
            cancelled: { title: '订单已被管理员取消', actionLabel: '管理员取消', type: 'order' },
            delete: { title: '订单已被管理员删除', actionLabel: '管理员删除', type: 'order' },
        },
    };

    return map[entityType]?.[action] || null;
}

function buildRelatedType(entityType) {
    return entityType;
}

function buildEntityLabel(entityType) {
    return (
        {
            forum_post: '帖子',
            task: '任务',
            pickup_order: '订单',
        }[entityType] || '内容'
    );
}

class AdminActionNotificationService {
    static async notifyUser({
        userId,
        adminUser,
        entityType,
        entityId,
        entityTitle,
        action,
        reason,
        remark,
    }) {
        try {
            if (!userId) {
                return false;
            }

            const config = buildActionConfig(entityType, action);
            if (!config) {
                return false;
            }

            const user = await User.findByPk(userId, {
                attributes: ['id', 'email', 'email_verified'],
            });

            if (!user) {
                return false;
            }

            const operatorName = getAdminDisplayName(adminUser);
            const entityLabel = buildEntityLabel(entityType);
            const normalizedTitle = String(entityTitle || '').trim() || `${entityLabel}#${entityId}`;
            const details = [
                { label: `${entityLabel}标题`, value: normalizedTitle },
                { label: '处理结果', value: config.actionLabel },
                { label: '处理人', value: operatorName },
            ];

            if (reason) {
                details.push({ label: '处理原因', value: String(reason).trim() });
            }

            if (remark) {
                details.push({ label: '处理备注', value: String(remark).trim() });
            }

            const contentLines = [
                `${entityLabel}《${normalizedTitle}》已被平台处理。`,
                `处理结果：${config.actionLabel}`,
                `处理人：${operatorName}`,
            ];

            if (reason) {
                contentLines.push(`处理原因：${String(reason).trim()}`);
            }

            if (remark) {
                contentLines.push(`处理备注：${String(remark).trim()}`);
            }

            await Message.create({
                sender_id: null,
                receiver_id: user.id,
                type: config.type,
                title: config.title,
                content: contentLines.join('\n'),
                related_type: buildRelatedType(entityType),
                related_id: entityId || null,
                priority: 'high',
                status: 'active',
                extra_data: {
                    action,
                    entity_type: entityType,
                    entity_title: normalizedTitle,
                    operator_name: operatorName,
                    reason: reason || null,
                    remark: remark || null,
                },
            });

            if (user.email_verified && user.email) {
                try {
                    await emailService.sendAdminActionNotice(user.email, {
                        subject: config.title,
                        title: config.title,
                        intro: `${entityLabel}《${normalizedTitle}》已由平台管理员处理，请查看以下明细。`,
                        actionLabel: config.actionLabel,
                        details,
                        footerNote: '如对本次管理员处理结果有疑问，请通过平台客服或工单渠道联系处理。',
                    });
                } catch (mailError) {
                    console.error('发送管理员处理结果邮件失败:', mailError);
                }
            }

            return true;
        } catch (error) {
            console.error('发送管理员处理结果通知失败:', error);
            return false;
        }
    }

    static async notifyReportResult({
        reporterId,
        adminUser,
        bizType,
        bizId,
        targetTitle,
        result,
        handleReason,
    }) {
        try {
            if (!reporterId) {
                return false;
            }

            const user = await User.findByPk(reporterId, {
                attributes: ['id', 'email', 'email_verified'],
            });

            if (!user) {
                return false;
            }

            const operatorName = getAdminDisplayName(adminUser);
            const entityType = bizType === 'post' ? 'forum_post' : 'task';
            const entityLabel = bizType === 'post' ? '帖子' : '任务';
            const normalizedTitle = String(targetTitle || '').trim() || `${entityLabel}#${bizId}`;
            const actionLabel = result === 'accept' ? '举报已采纳' : '举报已驳回';
            const title = result === 'accept' ? '你的举报已处理成功' : '你的举报处理结果已返回';
            const type = bizType === 'post' ? 'forum' : 'task';
            const details = [
                { label: '举报对象', value: `${entityLabel}《${normalizedTitle}》` },
                { label: '处理结果', value: actionLabel },
                { label: '处理人', value: operatorName },
            ];

            if (handleReason) {
                details.push({ label: '处理说明', value: String(handleReason).trim() });
            }

            const contentLines = [
                `你提交的${entityLabel}举报已有处理结果。`,
                `举报对象：${entityLabel}《${normalizedTitle}》`,
                `处理结果：${actionLabel}`,
                `处理人：${operatorName}`,
            ];

            if (handleReason) {
                contentLines.push(`处理说明：${String(handleReason).trim()}`);
            }

            await Message.create({
                sender_id: null,
                receiver_id: user.id,
                type,
                title,
                content: contentLines.join('\n'),
                related_type: buildRelatedType(entityType),
                related_id: bizId || null,
                priority: 'high',
                status: 'active',
                extra_data: {
                    action: result,
                    entity_type: entityType,
                    entity_title: normalizedTitle,
                    operator_name: operatorName,
                    reason: handleReason || null,
                    is_report_result: true,
                },
            });

            if (user.email_verified && user.email) {
                try {
                    await emailService.sendAdminActionNotice(user.email, {
                        subject: title,
                        title,
                        intro: `你提交的${entityLabel}举报已由平台管理员处理，请查看以下明细。`,
                        actionLabel,
                        details,
                        footerNote: '若你对本次举报处理结果有疑问，可继续通过平台客服或工单渠道反馈。',
                    });
                } catch (mailError) {
                    console.error('发送举报处理结果邮件失败:', mailError);
                }
            }

            return true;
        } catch (error) {
            console.error('发送举报处理结果通知失败:', error);
            return false;
        }
    }
}

module.exports = AdminActionNotificationService;
