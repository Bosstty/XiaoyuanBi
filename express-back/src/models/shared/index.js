// 导入所有模型
const User = require('./User');
const Admin = require('./admin/Admin');
const PickupOrder = require('./PickupOrder');
const Task = require('./Task');
const TaskApplication = require('./TaskApplication');
const ForumPost = require('./ForumPost');
const ForumComment = require('./ForumComment');
const Deliverer = require('./Deliverer');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');

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

module.exports = {
    User,
    Admin,
    PickupOrder,
    Task,
    TaskApplication,
    ForumPost,
    ForumComment,
    Deliverer,
    Wallet,
    Transaction,
};
