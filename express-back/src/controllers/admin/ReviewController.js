const { Op, Sequelize } = require('sequelize');
const { User, Deliverer, ForumPost, Task, ContentReport } = require('../../models');
const ContentModerationService = require('../../services/ContentModerationService');
const AdminActionNotificationService = require('../../services/AdminActionNotificationService');
const { responseUtils } = require('../../utils');

const PENDING_STUDENT_STATUS = 'pending_review';
const DEFAULT_LIMIT = 6;

function hasReviewAccess(user, codes = []) {
    const directPermissions = Array.isArray(user?.permissions) ? user.permissions : [];

    if (user?.role === 'super_admin' || directPermissions.includes('all')) {
        return true;
    }

    return codes.some(code => directPermissions.includes(code));
}

function parseMatchedWordsFromReason(reason) {
    if (!reason) return [];

    const suffix = String(reason).split(/[:：]/).slice(1).join('：') || String(reason);
    return [
        ...new Set(
            suffix
                .split(/[、,，/\s]+/)
                .map(item => item.trim())
                .filter(
                    item =>
                        item &&
                        item.length >= 2 &&
                        !item.includes('命中') &&
                        !item.includes('人工复核') &&
                        !item.includes('高风险') &&
                        !item.includes('敏感词')
                )
        ),
    ];
}

async function buildModerationPreview(item, type) {
    const existingReason = type === 'post' ? item.rejectReason : item.cancel_reason;
    const existingWords = parseMatchedWordsFromReason(existingReason);

    if (existingWords.length) {
        return {
            reason: existingReason,
            matchedWords: existingWords,
        };
    }

    const moderationResult = await ContentModerationService.review(
        type === 'post'
            ? {
                  title: item.title,
                  content: item.content,
                  summary: item.summary,
                  tags: item.tags,
              }
            : {
                  title: item.title,
                  description: item.description,
                  requirements: item.requirements,
                  location: item.location,
                  tags: item.tags,
                  skills_required: item.skills_required,
              },
        {
            label: type === 'post' ? '帖子内容' : '任务内容',
            scene: type === 'post' ? 'content' : 'task',
        }
    );

    if (moderationResult.action === 'review' || moderationResult.action === 'reject') {
        return {
            reason: ContentModerationService.buildReason(moderationResult),
            matchedWords: moderationResult.matchedWords || [],
        };
    }

    return {
        reason: existingReason || '',
        matchedWords: [],
    };
}

function getReportTypeLabel(value) {
    return (
        {
            fraud: '诈骗/虚假',
            ad: '广告引流',
            vulgar: '色情低俗',
            illegal: '违法违规',
            abuse: '辱骂攻击',
            false_info: '不实信息',
            unsafe_trade: '危险交易',
            other: '其他',
        }[value] || value || '其他'
    );
}

class ReviewController {
    static async getWorkbench(req, res) {
        try {
            const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 20);
            const currentAdmin = req.user;
            const modules = {
                students: hasReviewAccess(currentAdmin, ['review:student', 'user:admin_read']),
                deliverers: hasReviewAccess(currentAdmin, ['review:deliverer', 'deliverer:admin']),
                posts: hasReviewAccess(currentAdmin, ['review:forum', 'forum:moderate']),
                tasks: hasReviewAccess(currentAdmin, ['review:task', 'task:admin']),
            };
            modules.reports = hasReviewAccess(currentAdmin, ['review:report']);
            const reportWhere = { status: 'pending' };

            const studentWhere = {
                student_verified: false,
                verification_data: { [Op.ne]: null },
                [Op.and]: [
                    Sequelize.where(
                        Sequelize.json('verification_data.status'),
                        PENDING_STUDENT_STATUS
                    ),
                ],
            };

            const [pendingStudents, pendingDeliverers, pendingPosts, pendingTasks, pendingReports] = await Promise.all([
                modules.students
                    ? User.findAll({
                          where: studentWhere,
                          attributes: [
                              'id',
                              'username',
                              'real_name',
                              'college',
                              'major',
                              'student_id',
                              'verification_data',
                              'created_at',
                              'updated_at',
                          ],
                          order: [['updated_at', 'DESC']],
                          limit,
                      })
                    : Promise.resolve([]),
                modules.deliverers
                    ? Deliverer.findAll({
                          where: { verified: false, application_status: 'pending', isDeleted: false },
                          include: [
                              {
                                  model: User,
                                  as: 'user',
                                  attributes: ['id', 'username', 'real_name', 'college', 'student_id'],
                              },
                          ],
                          order: [['createdAt', 'DESC']],
                          limit,
                      })
                    : Promise.resolve([]),
                modules.posts
                    ? ForumPost.findAll({
                          where: { status: 'pending_review' },
                          include: [
                              {
                                  model: User,
                                  as: 'author',
                                  attributes: ['id', 'username', 'real_name', 'college'],
                              },
                          ],
                          order: [['created_at', 'DESC']],
                          limit,
                      })
                    : Promise.resolve([]),
                modules.tasks
                    ? Task.findAll({
                          where: { status: 'pending' },
                          include: [
                              {
                                  model: User,
                                  as: 'publisher',
                                  attributes: ['id', 'username', 'real_name', 'college'],
                              },
                          ],
                          order: [['created_at', 'DESC']],
                          limit,
                      })
                    : Promise.resolve([]),
                modules.reports
                    ? ContentReport.findAll({
                          where: reportWhere,
                          include: [
                              {
                                  model: User,
                                  as: 'reporter',
                                  attributes: ['id', 'username', 'real_name'],
                              },
                          ],
                          order: [['created_at', 'DESC']],
                          limit,
                      })
                    : Promise.resolve([]),
            ]);

            const [studentCount, delivererCount, postCount, taskCount, reportCount] = await Promise.all([
                modules.students ? User.count({ where: studentWhere }) : Promise.resolve(0),
                modules.deliverers
                    ? Deliverer.count({
                          where: { verified: false, application_status: 'pending', isDeleted: false },
                      })
                    : Promise.resolve(0),
                modules.posts ? ForumPost.count({ where: { status: 'pending_review' } }) : Promise.resolve(0),
                modules.tasks ? Task.count({ where: { status: 'pending' } }) : Promise.resolve(0),
                modules.reports ? ContentReport.count({ where: reportWhere }) : Promise.resolve(0),
            ]);

            const reportTargetMap = new Map();
            if (pendingReports.length) {
                const postIds = [
                    ...new Set(
                        pendingReports
                            .filter(item => item.biz_type === 'post')
                            .map(item => Number(item.biz_id))
                            .filter(Boolean)
                    ),
                ];
                const taskIds = [
                    ...new Set(
                        pendingReports
                            .filter(item => item.biz_type === 'task')
                            .map(item => Number(item.biz_id))
                            .filter(Boolean)
                    ),
                ];

                const [reportPosts, reportTasks] = await Promise.all([
                    postIds.length
                        ? ForumPost.findAll({
                              where: { id: { [Op.in]: postIds } },
                              include: [
                                  {
                                      model: User,
                                      as: 'author',
                                      attributes: ['id', 'username', 'real_name'],
                                  },
                              ],
                          })
                        : Promise.resolve([]),
                    taskIds.length
                        ? Task.findAll({
                              where: { id: { [Op.in]: taskIds } },
                              include: [
                                  {
                                      model: User,
                                      as: 'publisher',
                                      attributes: ['id', 'username', 'real_name'],
                                  },
                              ],
                          })
                        : Promise.resolve([]),
                ]);

                reportPosts.forEach(item => reportTargetMap.set(`post-${item.id}`, item));
                reportTasks.forEach(item => reportTargetMap.set(`task-${item.id}`, item));
            }

            const reportPendingCountEntries = await Promise.all(
                pendingReports.map(item =>
                    ContentReport.count({
                        where: {
                            biz_type: item.biz_type,
                            biz_id: item.biz_id,
                            status: 'pending',
                        },
                    })
                )
            );

            const postModerationPreviews = await Promise.all(
                pendingPosts.map(item => buildModerationPreview(item, 'post'))
            );
            const taskModerationPreviews = await Promise.all(
                pendingTasks.map(item => buildModerationPreview(item, 'task'))
            );

            const data = {
                modules,
                stats: {
                    totalPending: studentCount + delivererCount + postCount + taskCount + reportCount,
                    students: studentCount,
                    deliverers: delivererCount,
                    posts: postCount,
                    tasks: taskCount,
                    reports: reportCount,
                    preModeratedPosts: postModerationPreviews.filter(item => item.matchedWords.length).length,
                    preModeratedTasks: taskModerationPreviews.filter(item => item.matchedWords.length).length,
                },
                students: pendingStudents.map(user => ({
                    id: user.id,
                    username: user.username,
                    real_name: user.real_name,
                    college: user.college,
                    major: user.major,
                    student_id: user.student_id,
                    submitted_at:
                        user.verification_data?.submitted_at || user.updated_at || user.created_at,
                    verification_data: user.verification_data,
                })),
                deliverers: pendingDeliverers.map(item => ({
                    id: item.id,
                    real_name: item.real_name,
                    phone: item.phone,
                    vehicle_type: item.vehicle_type,
                    created_at: item.createdAt,
                    user: item.user,
                })),
                posts: pendingPosts.map((item, index) => ({
                    id: item.id,
                    title: item.title,
                    category: item.category,
                    reason: postModerationPreviews[index]?.reason || item.rejectReason || '',
                    matched_words: postModerationPreviews[index]?.matchedWords || [],
                    created_at: item.created_at || item.createdAt,
                    author: item.author,
                })),
                tasks: pendingTasks.map((item, index) => ({
                    id: item.id,
                    task_no: item.task_no,
                    title: item.title,
                    category: item.category,
                    price: item.price,
                    reason: taskModerationPreviews[index]?.reason || item.cancel_reason || '',
                    matched_words: taskModerationPreviews[index]?.matchedWords || [],
                    created_at: item.created_at || item.createdAt,
                    publisher: item.publisher,
                })),
                reports: pendingReports.map((item, index) => {
                        const target = reportTargetMap.get(`${item.biz_type}-${item.biz_id}`);
                        return {
                            id: item.id,
                            biz_type: item.biz_type,
                            biz_id: item.biz_id,
                            reason_type: item.reason_type,
                            reason_type_label: getReportTypeLabel(item.reason_type),
                            reason_text: item.reason_text || '',
                            created_at: item.created_at || item.createdAt,
                            pending_count: reportPendingCountEntries[index] || 1,
                            reporter: item.reporter,
                            target_title: target?.title || item.snapshot?.title || `${item.biz_type === 'post' ? '帖子' : '任务'}#${item.biz_id}`,
                            target_status: target?.status || item.snapshot?.status || '',
                            target_owner:
                                item.biz_type === 'post'
                                    ? target?.author
                                    : target?.publisher,
                        };
                    }),
            };

            return res.json(responseUtils.success(data, '获取审核工作台成功'));
        } catch (error) {
            console.error('获取审核工作台失败:', error);
            return res.status(500).json(responseUtils.error('获取审核工作台失败'));
        }
    }

    static async handleReport(req, res) {
        const dbTransaction = await ContentReport.sequelize.transaction();
        try {
            const { id } = req.params;
            const action = String(req.body?.action || '').trim();
            const handleReason = String(req.body?.reason || '').trim();
            const adminId = req.user.id;

            if (!['accept', 'dismiss'].includes(action)) {
                await dbTransaction.rollback();
                return res.status(400).json(responseUtils.error('举报处理动作不正确'));
            }

            const report = await ContentReport.findByPk(id, {
                transaction: dbTransaction,
                lock: dbTransaction.LOCK.UPDATE,
            });

            if (!report) {
                await dbTransaction.rollback();
                return res.status(404).json(responseUtils.error('举报不存在'));
            }

            if (report.status !== 'pending') {
                await dbTransaction.rollback();
                return res.status(400).json(responseUtils.error('该举报已处理'));
            }

            const canHandleReport = hasReviewAccess(req.user, ['review:report']);

            if (!canHandleReport) {
                await dbTransaction.rollback();
                return res.status(403).json(responseUtils.error('没有处理该举报的权限'));
            }

            const targetModel = report.biz_type === 'post' ? ForumPost : Task;
            const target = await targetModel.findByPk(report.biz_id, {
                transaction: dbTransaction,
                lock: dbTransaction.LOCK.UPDATE,
            });

            if (!target) {
                await dbTransaction.rollback();
                return res.status(404).json(responseUtils.error('举报内容不存在'));
            }

            const now = new Date();
            await ContentReport.update(
                {
                    status: action === 'accept' ? 'accepted' : 'dismissed',
                    handle_reason: handleReason || null,
                    handled_by: adminId,
                    handled_at: now,
                },
                {
                    where: {
                        biz_type: report.biz_type,
                        biz_id: report.biz_id,
                        status: 'pending',
                    },
                    transaction: dbTransaction,
                }
            );

            if (action === 'accept') {
                if (report.biz_type === 'post') {
                    await target.update(
                        {
                            status: 'hidden',
                            rejectReason: handleReason || '举报处理后已下架',
                        },
                        { transaction: dbTransaction }
                    );
                } else {
                    await target.update(
                        {
                            status: 'cancelled',
                            cancel_reason: handleReason || '举报处理后已下架',
                        },
                        { transaction: dbTransaction }
                    );
                }
            }

            await dbTransaction.commit();

            if (action === 'accept') {
                await AdminActionNotificationService.notifyUser({
                    userId: report.biz_type === 'post' ? target.author_id : target.publisher_id,
                    adminUser: req.user,
                    entityType: report.biz_type === 'post' ? 'forum_post' : 'task',
                    entityId: target.id,
                    entityTitle: target.title,
                    action: report.biz_type === 'post' ? 'hide' : 'cancelled',
                    reason: handleReason || '举报处理后已下架',
                });
            }

            await AdminActionNotificationService.notifyReportResult({
                reporterId: report.reporter_id,
                adminUser: req.user,
                bizType: report.biz_type,
                bizId: target.id,
                targetTitle: target.title || report.snapshot?.title,
                result: action,
                handleReason,
            });

            return res.json(responseUtils.success(null, action === 'accept' ? '举报已处理并下架内容' : '举报已忽略'));
        } catch (error) {
            await dbTransaction.rollback();
            console.error('处理举报失败:', error);
            return res.status(500).json(responseUtils.error('处理举报失败'));
        }
    }
}

module.exports = ReviewController;
