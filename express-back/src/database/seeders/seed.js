const {
    Admin,
    User,
    Deliverer,
    PickupOrder,
    Task,
    TaskApplication,
    ForumPost,
    ForumComment,
    Wallet,
    Transaction,
    Message,
    NotificationSetting,
    Role,
    Permission,
    RolePermission,
    UserRole,
    AuditLog,
} = require('@/models');

// 为空表生成示例数据，避免重复插入
async function seedAdmins() {
    console.log('检查管理员数据...');
    const adminExists = await Admin.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
        await Admin.create({
            username: 'admin',
            email: 'admin@campus.com',
            password: 'admin123456',
            name: '超级管理员',
            role: 'super_admin',
            permissions: ['all'],
            status: 'active',
        });
        console.log('  创建默认超级管理员 admin');
    }

    const moderatorExists = await Admin.findOne({ where: { username: 'moderator' } });
    if (!moderatorExists) {
        await Admin.create({
            username: 'moderator',
            email: 'moderator@campus.com',
            password: 'mod123456',
            name: '版主',
            role: 'moderator',
            permissions: ['forum_manage', 'user_manage'],
            status: 'active',
        });
        console.log('  创建默认版主 moderator');
    }
}

async function seedRolesAndPermissions() {
    console.log('检查角色/权限...');
    const roleCount = await Role.count();
    const permCount = await Permission.count();

    if (permCount === 0) {
        const permissions = await Permission.bulkCreate(
            [
                {
                    name: '用户管理',
                    code: 'user_manage',
                    resource: 'user',
                    action: 'manage',
                    group: 'admin',
                    is_system: true,
                },
                {
                    name: '订单管理',
                    code: 'order_manage',
                    resource: 'order',
                    action: 'manage',
                    group: 'admin',
                    is_system: true,
                },
                {
                    name: '任务管理',
                    code: 'task_manage',
                    resource: 'task',
                    action: 'manage',
                    group: 'admin',
                    is_system: true,
                },
                {
                    name: '论坛管理',
                    code: 'forum_manage',
                    resource: 'forum',
                    action: 'manage',
                    group: 'admin',
                    is_system: true,
                },
                {
                    name: '查看审计',
                    code: 'audit_view',
                    resource: 'audit_log',
                    action: 'view',
                    group: 'admin',
                    is_system: true,
                },
            ],
            { returning: true }
        );
        console.log(`  创建权限 ${permissions.length} 条`);
    }

    if (roleCount === 0) {
        const roles = await Role.bulkCreate(
            [
                {
                    name: '超级管理员',
                    code: 'super_admin',
                    description: '系统内置最高权限',
                    level: 10,
                    is_system: true,
                },
                {
                    name: '版主',
                    code: 'moderator',
                    description: '论坛/用户管理',
                    level: 5,
                    is_system: true,
                },
                {
                    name: '普通用户',
                    code: 'user',
                    description: '默认用户角色',
                    level: 1,
                    is_system: true,
                },
            ],
            { returning: true }
        );
        console.log(`  创建角色 ${roles.length} 条`);
    }

    // 绑定角色与权限（如果表为空）
    if ((await RolePermission.count()) === 0) {
        const perms = await Permission.findAll();
        const roles = await Role.findAll();

        const superAdmin = roles.find(r => r.code === 'super_admin');
        const moderator = roles.find(r => r.code === 'moderator');

        const records = [];
        if (superAdmin) {
            perms.forEach(p => records.push({ role_id: superAdmin.id, permission_id: p.id }));
        }
        if (moderator) {
            perms
                .filter(p => ['forum_manage', 'user_manage', 'audit_view'].includes(p.code))
                .forEach(p => records.push({ role_id: moderator.id, permission_id: p.id }));
        }

        if (records.length > 0) {
            await RolePermission.bulkCreate(records);
            console.log(`  角色权限绑定 ${records.length} 条`);
        }
    }
}

async function seedUsers() {
    console.log('检查用户数据...');
    const userCount = await User.count();
    if (userCount > 0) return null;

    const users = [
        {
            student_id: '20250001',
            username: 'alice',
            email: 'alice@example.com',
            password: 'password123',
            phone: '13800000001',
            real_name: 'Alice Chen',
            gender: 'female',
            college: '计算机学院',
            major: '软件工程',
            status: 'active',
        },
        {
            student_id: '20250002',
            username: 'bob',
            email: 'bob@example.com',
            password: 'password123',
            phone: '13800000002',
            real_name: 'Bob Li',
            gender: 'male',
            college: '信息学院',
            major: '网络工程',
            status: 'active',
        },
    ];

    const createdUsers = [];
    for (const u of users) {
        const created = await User.create(u);
        createdUsers.push(created);
    }
    console.log(`  创建用户 ${createdUsers.length} 个`);

    // 默认通知设置 & 钱包
    for (const user of createdUsers) {
        await NotificationSetting.create({ user_id: user.id });
        await Wallet.create({
            user_id: user.id,
            balance: user.id === createdUsers[0].id ? 200 : 80,
            total_income: 200,
            total_expense: user.id === createdUsers[0].id ? 0 : 20,
        });
    }

    return createdUsers;
}

async function seedDeliverers(users) {
    console.log('检查配送员数据...');
    if (await Deliverer.count()) return null;
    const delivererUser = users?.[1];
    if (!delivererUser) return null;

    const deliverer = await Deliverer.create({
        user_id: delivererUser.id,
        real_name: delivererUser.real_name,
        phone: delivererUser.phone,
        id_card: '110101199001011234',
        vehicle_type: 'electric',
        vehicle_number: '辽A12345',
        emergency_contact_name: '张三',
        emergency_contact_phone: '13900000000',
        service_areas: ['东校区', '西校区'],
        available_hours: ['08:00-12:00', '14:00-18:00'],
        id_card_front: 'https://example.com/id_front.jpg',
        id_card_back: 'https://example.com/id_back.jpg',
        health_certificate: 'https://example.com/health.jpg',
        vehicle_license: 'https://example.com/license.jpg',
        application_status: 'approved',
        approval_time: new Date(),
        approval_admin_id: 1,
        rating: 4.9,
        total_orders: 5,
        completed_orders: 5,
        status: 'active',
        is_online: true,
    });
    console.log('  创建配送员示例 1 个');
    return deliverer;
}

async function seedPickupOrders(users, deliverer) {
    console.log('检查代取订单数据...');
    if (await PickupOrder.count()) return;
    if (!users?.length) return;

    const order = await PickupOrder.create({
        order_no: 'PO20241217001',
        user_id: users[0].id,
        deliverer_id: deliverer?.id || null,
        type: 'express',
        title: '帮忙取一个快递',
        description: '菜鸟驿站取件，偏重，需小心',
        pickup_location: '菜鸟驿站3号柜',
        delivery_location: '东区5舍101',
        pickup_time: new Date(),
        delivery_time: new Date(Date.now() + 60 * 60 * 1000),
        contact_name: 'Alice',
        contact_phone: '13800000001',
        pickup_code: 'A1234',
        weight: 3.2,
        size: '中等',
        price: 25.5,
        tip: 5,
        urgent: true,
        fragile: false,
        status: deliverer ? 'accepted' : 'pending',
        payment_status: 'paid',
        images: ['https://example.com/order.jpg'],
        notes: '尽量快一些，谢谢！',
    });
    console.log(`  创建代取订单 ${order.order_no}`);
}

async function seedTasks(users) {
    console.log('检查任务数据...');
    if (await Task.count()) return;
    if (!users?.length) return;

    const task = await Task.create({
        task_no: 'TK20241217001',
        publisher_id: users[0].id,
        assignee_id: users[1]?.id || null,
        category: 'study',
        title: '帮忙整理一份PPT',
        description: '根据提纲整理10页PPT，今晚前完成',
        requirements: '需要基础的排版能力',
        tags: ['PPT', '整理'],
        skills_required: ['office'],
        price: 120,
        location: '线上',
        start_time: new Date(),
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        estimated_duration: 4,
        max_applicants: 1,
        urgent: true,
        remote_work: true,
        status: 'in_progress',
        payment_status: 'paid',
        images: [],
        attachments: [],
        accept_time: new Date(),
    });

    await TaskApplication.create({
        task_id: task.id,
        applicant_id: users[1]?.id || users[0].id,
        message: '我有丰富的PPT经验，可以快速完成',
        proposed_price: 120,
        status: 'accepted',
    });

    console.log(`  创建任务 ${task.task_no} 以及一条申请`);
}

async function seedForum(users) {
    console.log('检查论坛数据...');
    if (await ForumPost.count()) return;
    if (!users?.length) return;

    const post = await ForumPost.create({
        author_id: users[0].id,
        category: 'campus',
        title: '期末复习资料分享',
        content: '这里有计算机网络和操作系统的复习资料，欢迎互补。',
        summary: '分享复习资料',
        tags: ['复习', '资料'],
        is_hot: true,
    });

    await ForumComment.create({
        post_id: post.id,
        author_id: users[1]?.id || users[0].id,
        content: '感谢分享！有无数据库的资料？',
        is_anonymous: false,
    });

    console.log('  创建论坛帖子与评论各 1 条');
}

async function seedTransactions(users) {
    console.log('检查交易记录...');
    if (await Transaction.count()) return;
    if (!users?.length) return;

    await Transaction.create({
        transaction_no: 'TX20241217001',
        user_id: users[0].id,
        type: 'recharge',
        amount: 200,
        direction: 'in',
        balance_before: 0,
        balance_after: 200,
        status: 'success',
        payment_method: 'wechat',
        description: '账户充值',
        completed_at: new Date(),
    });

    console.log('  创建交易记录 1 条');
}

async function seedMessages(users) {
    console.log('检查消息数据...');
    if (await Message.count()) return;
    if (!users?.length) return;

    await Message.bulkCreate([
        {
            sender_id: null,
            receiver_id: users[0].id,
            type: 'system',
            title: '欢迎加入校园平台',
            content: '这是系统发送的欢迎消息。',
            status: 'active',
        },
        {
            sender_id: users[0].id,
            receiver_id: users[1]?.id || users[0].id,
            type: 'chat',
            title: '任务沟通',
            content: 'PPT格式有偏好吗？',
            status: 'active',
        },
    ]);

    console.log('  创建消息 2 条');
}

async function seedAuditLogs(users) {
    console.log('检查审计日志数据...');
    if (await AuditLog.count()) return;
    const userId = users?.[0]?.id || null;

    await AuditLog.create({
        user_id: userId,
        admin_id: null,
        action: 'GET /api/health',
        resource_type: 'system',
        resource_id: null,
        method: 'GET',
        url: '/api/health',
        ip_address: '127.0.0.1',
        user_agent: 'seed-script',
        request_body: null,
        response_status: 200,
        response_body: { message: 'ok' },
        duration: 12,
        risk_level: 'low',
        success: true,
        extra_data: { note: '示例审计日志' },
    });
    console.log('  创建审计日志 1 条');
}

async function createInitialData() {
    try {
        console.log('开始创建初始数据...');

        await seedAdmins();
        await seedRolesAndPermissions();

        const users = await seedUsers();
        const deliverer = await seedDeliverers(users);
        await seedPickupOrders(users, deliverer);
        await seedTasks(users);
        await seedForum(users);
        await seedTransactions(users);
        await seedMessages(users);
        await seedAuditLogs(users);

        console.log('初始数据创建完成！');
    } catch (error) {
        console.error('创建初始数据失败:', error);
        throw error;
    }
}

// 如果直接运行此文件，执行种子
if (require.main === module) {
    createInitialData()
        .then(() => {
            console.log('种子数据创建成功');
            process.exit(0);
        })
        .catch(error => {
            console.error('种子数据创建失败:', error);
            process.exit(1);
        });
}

module.exports = createInitialData;
