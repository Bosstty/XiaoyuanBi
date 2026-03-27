// 导入所有模型
// 用户相关模型
const { sequelize } = require('../config/database');
const User = require('./user/User');
const PickupOrder = require('./user/PickupOrder');
const PickupOrderItem = require('./user/PickupOrderItem');
const Task = require('./user/Task');
const TaskApplication = require('./user/TaskApplication');
const ForumPost = require('./user/ForumPost');
const ForumComment = require('./user/ForumComment');
const Wallet = require('./user/Wallet');
const Transaction = require('./user/Transaction');
const Message = require('./user/Message');
const NotificationSetting = require('./user/NotificationSetting');

// 配送员相关模型
const Deliverer = require('./deliverer/Deliverer');

// 管理员相关模型
const Admin = require('./admin/Admin');
const Role = require('./admin/Role');
const Permission = require('./admin/Permission');
const RolePermission = require('./admin/RolePermission');
const UserRole = require('./admin/UserRole');
const AuditLog = require('./admin/AuditLog');
const SystemSetting = require('./admin/SystemSetting');

// 客服相关模型
const Service = require('./service/Service');
const ServiceTicket = require('./service/ServiceTicket');
const ChatConversation = require('./service/ChatConversation');
const ChatMessage = require('./service/ChatMessage');

// 定义模型关联关系

// 用户与代取订单的关系
User.hasMany(PickupOrder, {
    foreignKey: 'user_id',
    as: 'orders',
});
PickupOrder.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});

PickupOrder.hasMany(PickupOrderItem, {
    foreignKey: 'order_id',
    as: 'items',
});
PickupOrderItem.belongsTo(PickupOrder, {
    foreignKey: 'order_id',
    as: 'order',
});

// 配送员与代取订单的关系
Deliverer.hasMany(PickupOrder, {
    foreignKey: 'deliverer_id',
    as: 'orders',
});
PickupOrder.belongsTo(Deliverer, {
    foreignKey: 'deliverer_id',
    as: 'delivererInfo',
});

// 用户与配送员的关系
User.hasOne(Deliverer, {
    foreignKey: 'user_id',
    as: 'delivererProfile',
});
Deliverer.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});

// 配送员与代取订单的关系 (原有的User关联保持兼容)
User.hasMany(PickupOrder, {
    foreignKey: 'deliverer_id',
    as: 'deliveries',
});
PickupOrder.belongsTo(User, {
    foreignKey: 'deliverer_id',
    as: 'deliverer',
});

// 用户与任务的关系 - 发布者
User.hasMany(Task, {
    foreignKey: 'publisher_id',
    as: 'publishedTasks',
});
Task.belongsTo(User, {
    foreignKey: 'publisher_id',
    as: 'publisher',
});

// 用户与任务的关系 - 接受者
User.hasMany(Task, {
    foreignKey: 'assignee_id',
    as: 'assignedTasks',
});
Task.belongsTo(User, {
    foreignKey: 'assignee_id',
    as: 'assignee',
});

// 任务与任务申请的关系
Task.hasMany(TaskApplication, {
    foreignKey: 'task_id',
    as: 'applications',
});
TaskApplication.belongsTo(Task, {
    foreignKey: 'task_id',
    as: 'task',
});

// 用户与任务申请的关系
User.hasMany(TaskApplication, {
    foreignKey: 'applicant_id',
    as: 'applications',
});
TaskApplication.belongsTo(User, {
    foreignKey: 'applicant_id',
    as: 'applicant',
});

// 任务与工单的关系
Task.hasMany(ServiceTicket, {
    foreignKey: 'task_id',
    as: 'serviceTickets',
});

// 用户与论坛帖子的关系
User.hasMany(ForumPost, {
    foreignKey: 'author_id',
    as: 'posts',
});
ForumPost.belongsTo(User, {
    foreignKey: 'author_id',
    as: 'author',
});

// 论坛帖子与评论的关系
ForumPost.hasMany(ForumComment, {
    foreignKey: 'post_id',
    as: 'comments',
});
ForumComment.belongsTo(ForumPost, {
    foreignKey: 'post_id',
    as: 'post',
});

// 用户与论坛评论的关系
User.hasMany(ForumComment, {
    foreignKey: 'author_id',
    as: 'comments',
});
ForumComment.belongsTo(User, {
    foreignKey: 'author_id',
    as: 'author',
});

// 评论的自关联 - 父子评论关系
ForumComment.hasMany(ForumComment, {
    foreignKey: 'parent_id',
    as: 'replies',
});
ForumComment.belongsTo(ForumComment, {
    foreignKey: 'parent_id',
    as: 'parent',
});

// 评论的回复目标用户关系
ForumComment.belongsTo(User, {
    foreignKey: 'reply_to_id',
    as: 'replyToUser',
});

// 用户与钱包的关系
User.hasOne(Wallet, {
    foreignKey: 'user_id',
    as: 'wallet',
});
Wallet.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});

// 用户与交易记录的关系
User.hasMany(Transaction, {
    foreignKey: 'user_id',
    as: 'transactions',
});
Transaction.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});

// 钱包与交易记录的关系
Wallet.hasMany(Transaction, {
    foreignKey: 'user_id',
    sourceKey: 'user_id',
    as: 'transactions',
});

// 用户与消息的关系
User.hasMany(Message, {
    foreignKey: 'sender_id',
    as: 'sentMessages',
});
User.hasMany(Message, {
    foreignKey: 'recipient_id',
    as: 'receivedMessages',
});
Message.belongsTo(User, {
    foreignKey: 'sender_id',
    as: 'sender',
});
Message.belongsTo(User, {
    foreignKey: 'recipient_id',
    as: 'recipient',
});

// 用户与通知设置的关系
User.hasOne(NotificationSetting, {
    foreignKey: 'user_id',
    as: 'notificationSetting',
});
NotificationSetting.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});

// 角色与权限的关系
Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions',
});
Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles',
});

// 用户与角色的关系
User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'user_id',
    otherKey: 'role_id',
    as: 'roles',
});
Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'role_id',
    otherKey: 'user_id',
    as: 'users',
});

// 审计日志与用户/管理员的关联
User.hasMany(AuditLog, {
    foreignKey: 'user_id',
    as: 'auditLogs',
});
AuditLog.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});

Admin.hasMany(AuditLog, {
    foreignKey: 'admin_id',
    as: 'auditLogs',
});
AuditLog.belongsTo(Admin, {
    foreignKey: 'admin_id',
    as: 'admin',
});

module.exports = {
    // 数据库
    sequelize,
    // 用户相关
    User,
    PickupOrder,
    PickupOrderItem,
    Task,
    TaskApplication,
    ForumPost,
    ForumComment,
    Wallet,
    Transaction,
    Message,
    NotificationSetting,
    // 配送员相关
    Deliverer,
    // 管理员相关
    Admin,
    Role,
    Permission,
    RolePermission,
    UserRole,
    AuditLog,
    SystemSetting,

    // 客服相关
    Service,
    ServiceTicket,
    ChatConversation,
    ChatMessage,
};
