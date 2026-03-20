/**
 * 数据种子脚本 - 为分析功能生成测试数据（不删除原有数据）
 * 运行方式: node seedAnalyticsData.js
 */
const { sequelize } = require('./src/config/database');
const {
    User,
    Deliverer,
    PickupOrder,
    Transaction,
    Task,
    AuditLog,
    Message,
} = require('./src/models');
const bcrypt = require('bcryptjs');

async function seedAnalyticsData() {
    try {
        console.log('开始生成测试数据...');

        // 连接数据库
        await sequelize.authenticate();
        console.log('数据库连接成功');

        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

        // 获取现有用户，如果没有则创建
        let userRecords = await User.findAll({ limit: 50 });
        if (userRecords.length < 10) {
            console.log('创建测试用户...');
            const users = [];
            for (let i = 1; i <= 50; i++) {
                const createdAt = new Date(
                    threeMonthsAgo.getTime() +
                        Math.random() * (now.getTime() - threeMonthsAgo.getTime())
                );
                users.push({
                    student_id: `2021${String(i).padStart(4, '0')}`,
                    username: `用户${i}`,
                    email: `user${i}@stu.hrbcu.edu.cn`,
                    password: bcrypt.hashSync('123456', 10),
                    phone: `138${String(i).padStart(8, '0')}`,
                    real_name: `张三${i}`,
                    gender: i % 2 === 0 ? 'male' : 'female',
                    college: ['计算机学院', '软件学院', '信息学院', '机电学院'][i % 4],
                    major: ['计算机科学与技术', '软件工程', '物联网工程', '数据科学与大数据技术'][
                        i % 4
                    ],
                    grade: ['2021', '2022', '2023'][i % 3],
                    status: 'active',
                    email_verified: true,
                    phone_verified: true,
                    student_verified: true,
                    credits: 100 + Math.floor(Math.random() * 900),
                    created_at: createdAt,
                    updated_at: createdAt,
                });
            }
            userRecords = await User.bulkCreate(users);
            console.log(`已创建 ${userRecords.length} 个用户`);
        } else {
            console.log(`已有 ${userRecords.length} 个用户，跳过创建`);
        }

        // 获取现有配送员，如果没有则创建
        let delivererRecords = await Deliverer.findAll();
        if (delivererRecords.length < 10) {
            console.log('创建测试配送员...');
            const deliverers = [];
            for (let i = 1; i <= 20; i++) {
                const userId = userRecords[i - 1]?.id;
                if (userId) {
                    deliverers.push({
                        user_id: userId,
                        real_name: `配送员${i}`,
                        phone: `139${String(i).padStart(8, '0')}`,
                        id_card: `${210000000000000000 + i}`,
                        vehicle_type: ['bike', 'electric', 'walk', 'car'][i % 4],
                        vehicle_number: `黑A${String(i).padStart(5, '0')}`,
                        emergency_contact_name: `紧急联系人${i}`,
                        emergency_contact_phone: `138${String(i).padStart(8, '0')}`,
                        service_areas: JSON.stringify(['哈尔滨市南岗区', '哈尔滨市香坊区']),
                        available_hours: JSON.stringify({ start: '08:00', end: '22:00' }),
                        id_card_front: 'https://example.com/id_front.jpg',
                        id_card_back: 'https://example.com/id_back.jpg',
                        application_status: 'approved',
                        verified: true,
                        verifiedAt: new Date(),
                        verifiedBy: 1,
                        approval_time: new Date(),
                        approval_admin_id: 1,
                        rating: (4 + Math.random()).toFixed(2),
                        total_orders: Math.floor(Math.random() * 200),
                        completed_orders: Math.floor(Math.random() * 180),
                        cancelled_orders: Math.floor(Math.random() * 20),
                        total_earnings: (Math.random() * 10000).toFixed(2),
                        is_online: Math.random() > 0.5,
                        last_online_at: new Date(),
                        status: 'active',
                        isDeleted: false,
                        created_at: sixMonthsAgo,
                        updated_at: now,
                    });
                }
            }
            delivererRecords = await Deliverer.bulkCreate(deliverers);
            console.log(`已创建 ${delivererRecords.length} 个配送员`);
        } else {
            console.log(`已有 ${delivererRecords.length} 个配送员，跳过创建`);
        }

        // 生成订单数据
        const orderCount = await PickupOrder.count();
        if (orderCount < 50) {
            console.log('创建测试订单...');
            const orders = [];
            const orderStatuses = [
                'pending',
                'accepted',
                'picking',
                'delivering',
                'completed',
                'cancelled',
            ];
            const orderTypes = ['express', 'food', 'medicine', 'daily'];
            const pickupLocations = ['菜鸟驿站', '顺丰快递', '京东快递', '美团外卖', '饿了么'];
            const deliveryLocations = [
                '1号楼',
                '2号楼',
                '3号楼',
                '4号楼',
                '5号楼',
                '6号楼',
                '7号楼',
                '8号楼',
            ];

            for (let i = 1; i <= 200; i++) {
                const userIndex = Math.floor(Math.random() * userRecords.length);
                const delivererIndex = Math.floor(Math.random() * delivererRecords.length);
                const createdAt = new Date(
                    threeMonthsAgo.getTime() +
                        Math.random() * (now.getTime() - threeMonthsAgo.getTime())
                );
                const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
                const type = orderTypes[Math.floor(Math.random() * orderTypes.length)];

                orders.push({
                    user_id: userRecords[userIndex].id,
                    deliverer_id:
                        status !== 'pending' ? delivererRecords[delivererIndex]?.id : null,
                    order_no: `ORD${Date.now()}${String(i).padStart(4, '0')}`,
                    type: type,
                    title: `${type === 'express' ? '快递代取' : type === 'food' ? '外卖代取' : type === 'medicine' ? '药品代购' : '生活用品代购'}${i}`,
                    pickup_location:
                        pickupLocations[Math.floor(Math.random() * pickupLocations.length)],
                    delivery_location:
                        deliveryLocations[Math.floor(Math.random() * deliveryLocations.length)],
                    pickup_code: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
                    contact_name: userRecords[userIndex].real_name || '用户',
                    contact_phone: userRecords[userIndex].phone,
                    description: `订单描述${i}`,
                    weight: Math.floor(Math.random() * 10) + 1,
                    price: (Math.random() * 50 + 5).toFixed(2),
                    delivery_fee: (Math.random() * 10 + 2).toFixed(2),
                    status: status,
                    payment_status: status === 'cancelled' ? 'refunded' : 'paid',
                    payment_method: 'balance',
                    is_fragile: Math.random() > 0.7,
                    delivery_time: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
                    completed_at:
                        status === 'completed'
                            ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
                            : null,
                    delivery_complete_time:
                        status === 'completed'
                            ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
                            : null,
                    rating: status === 'completed' ? (Math.random() * 2 + 3).toFixed(1) : null,
                    created_at: createdAt,
                    updated_at: createdAt,
                });
            }

            // 超时未完成订单
            for (let i = 0; i < 5; i++) {
                const userIndex = Math.floor(Math.random() * userRecords.length);
                const delivererIndex = Math.floor(Math.random() * delivererRecords.length);
                orders.push({
                    user_id: userRecords[userIndex].id,
                    deliverer_id: delivererRecords[delivererIndex]?.id,
                    order_no: `ORD_OVERDUE${Date.now()}${i}`,
                    type: 'express',
                    title: '快递代取-超时订单',
                    pickup_location: '菜鸟驿站',
                    delivery_location: '1号楼',
                    pickup_code: '1234',
                    contact_name: '用户',
                    contact_phone: '13800000000',
                    description: '超时订单',
                    weight: 2,
                    price: '10.00',
                    delivery_fee: '3.00',
                    status: ['accepted', 'picking', 'delivering'][Math.floor(Math.random() * 3)],
                    payment_status: 'paid',
                    payment_method: 'balance',
                    is_fragile: false,
                    delivery_time: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                    completed_at: null,
                    delivery_complete_time: null,
                    rating: null,
                    created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
                    updated_at: now,
                });
            }

            // 低评分订单
            for (let i = 0; i < 3; i++) {
                const userIndex = Math.floor(Math.random() * userRecords.length);
                const delivererIndex = Math.floor(Math.random() * delivererRecords.length);
                orders.push({
                    user_id: userRecords[userIndex].id,
                    deliverer_id: delivererRecords[delivererIndex]?.id,
                    order_no: `ORD_LOW${Date.now()}${i}`,
                    type: 'express',
                    title: '快递代取-低评分订单',
                    pickup_location: '顺丰快递',
                    delivery_location: '2号楼',
                    pickup_code: '5678',
                    contact_name: '用户',
                    contact_phone: '13800000000',
                    description: '低评分订单',
                    weight: 1,
                    price: '8.00',
                    delivery_fee: '3.00',
                    status: 'completed',
                    payment_status: 'paid',
                    payment_method: 'balance',
                    is_fragile: false,
                    delivery_time: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                    completed_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                    delivery_complete_time: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                    rating: (Math.random() * 1.5).toFixed(1),
                    created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000),
                    updated_at: now,
                });
            }

            // 高价值订单
            for (let i = 0; i < 2; i++) {
                const userIndex = Math.floor(Math.random() * userRecords.length);
                orders.push({
                    user_id: userRecords[userIndex].id,
                    deliverer_id: null,
                    order_no: `ORD_HIGH${Date.now()}${i}`,
                    type: 'daily',
                    title: '生活用品代购-高价值订单',
                    pickup_location: '京东商城',
                    delivery_location: '3号楼',
                    pickup_code: '9999',
                    contact_name: '用户',
                    contact_phone: '13800000000',
                    description: '高价值商品',
                    weight: 5,
                    price: (500 + Math.random() * 300).toFixed(2),
                    delivery_fee: '5.00',
                    status: 'pending',
                    payment_status: 'unpaid',
                    payment_method: null,
                    is_fragile: true,
                    delivery_time: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                    completed_at: null,
                    delivery_complete_time: null,
                    rating: null,
                    created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
                    updated_at: now,
                });
            }

            await PickupOrder.bulkCreate(orders);
            console.log(`已创建 ${orders.length} 个订单`);
        } else {
            console.log(`已有 ${orderCount} 个订单，跳过创建`);
        }

        // 生成交易数据
        const transactionCount = await Transaction.count();
        if (transactionCount < 50) {
            console.log('创建测试交易...');
            const transactions = [];
            const transactionTypes = [
                'recharge',
                'payment',
                'earn_pickup',
                'earn_task',
                'commission_deduct',
                'refund',
            ];
            const paymentMethods = ['balance', 'wechat', 'alipay'];

            for (let i = 1; i <= 300; i++) {
                const userIndex = Math.floor(Math.random() * userRecords.length);
                const createdAt = new Date(
                    threeMonthsAgo.getTime() +
                        Math.random() * (now.getTime() - threeMonthsAgo.getTime())
                );
                const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
                const direction = type === 'payment' || type === 'commission_deduct' ? 'out' : 'in';
                const status =
                    Math.random() > 0.1 ? 'success' : Math.random() > 0.5 ? 'pending' : 'failed';
                const amount = (Math.random() * 200 + 10).toFixed(2);

                transactions.push({
                    transaction_no: `TXN${Date.now()}${String(i).padStart(4, '0')}`,
                    user_id: userRecords[userIndex].id,
                    type: type,
                    amount: amount,
                    direction: direction,
                    balance_before: (Math.random() * 1000).toFixed(2),
                    balance_after:
                        direction === 'out'
                            ? (
                                  parseFloat((Math.random() * 1000).toFixed(2)) - parseFloat(amount)
                              ).toFixed(2)
                            : (
                                  parseFloat((Math.random() * 1000).toFixed(2)) + parseFloat(amount)
                              ).toFixed(2),
                    status: status,
                    related_type: ['pickup_order', 'task'][Math.floor(Math.random() * 2)],
                    related_id: Math.floor(Math.random() * 200) + 1,
                    payment_method:
                        paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                    commission_rate: type === 'commission_deduct' ? '0.10' : null,
                    commission_amount:
                        type === 'commission_deduct' ? (parseFloat(amount) * 0.1).toFixed(2) : null,
                    created_at: createdAt,
                    updated_at: createdAt,
                });
            }

            await Transaction.bulkCreate(transactions);
            console.log(`已创建 ${transactions.length} 个交易`);
        } else {
            console.log(`已有 ${transactionCount} 个交易，跳过创建`);
        }

        // 生成任务数据
        const taskCount = await Task.count();
        if (taskCount < 30) {
            console.log('创建测试任务...');
            const tasks = [];
            const taskCategories = ['study', 'design', 'tech', 'writing', 'life'];
            const taskStatuses = ['published', 'in_progress', 'completed', 'cancelled', 'expired'];
            const taskTitles = [
                'Java编程作业辅导',
                '海报设计',
                '网站开发',
                '论文撰写',
                '代取快递',
                '教室占座',
                '资料打印',
                '英语四级辅导',
                'Python数据分析',
                '视频剪辑',
            ];

            for (let i = 1; i <= 100; i++) {
                const userIndex = Math.floor(Math.random() * userRecords.length);
                const createdAt = new Date(
                    threeMonthsAgo.getTime() +
                        Math.random() * (now.getTime() - threeMonthsAgo.getTime())
                );
                const category = taskCategories[Math.floor(Math.random() * taskCategories.length)];
                const status = taskStatuses[Math.floor(Math.random() * taskStatuses.length)];

                tasks.push({
                    task_no: `TASK${Date.now()}${String(i).padStart(4, '0')}`,
                    publisher_id: userRecords[userIndex].id,
                    assignee_id:
                        status !== 'published'
                            ? userRecords[Math.floor(Math.random() * userRecords.length)].id
                            : null,
                    category: category,
                    title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
                    description: `任务描述${i}`,
                    requirements: `任务要求${i}`,
                    price: (Math.random() * 500 + 50).toFixed(2),
                    deadline: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
                    status: status,
                    created_at: createdAt,
                    updated_at: createdAt,
                });
            }

            await Task.bulkCreate(tasks);
            console.log(`已创建 ${tasks.length} 个任务`);
        } else {
            console.log(`已有 ${taskCount} 个任务，跳过创建`);
        }

        // 生成审计日志
        const auditCount = await AuditLog.count();
        if (auditCount < 100) {
            console.log('创建测试审计日志...');
            const auditLogs = [];
            const actions = [
                'user.login',
                'user.logout',
                'user.register',
                'order.create',
                'order.update',
                'order.cancel',
                'order.complete',
                'task.create',
                'task.accept',
                'task.complete',
                'payment.create',
                'recharge.create',
                'forum.post.create',
                'forum.comment.create',
            ];

            for (let i = 1; i <= 500; i++) {
                const userIndex = Math.floor(Math.random() * userRecords.length);
                const createdAt = new Date(
                    sixMonthsAgo.getTime() +
                        Math.random() * (now.getTime() - sixMonthsAgo.getTime())
                );

                auditLogs.push({
                    user_id: userRecords[userIndex].id,
                    action: actions[Math.floor(Math.random() * actions.length)],
                    resource_type: 'user',
                    resource_id: userRecords[userIndex].id,
                    ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    method: 'GET',
                    url: '/api/user/profile',
                    status: 200,
                    created_at: createdAt,
                });
            }

            await AuditLog.bulkCreate(auditLogs);
            console.log(`已创建 ${auditLogs.length} 条审计日志`);
        } else {
            console.log(`已有 ${auditCount} 条审计日志，跳过创建`);
        }

        // 生成消息
        const messageCount = await Message.count();
        if (messageCount < 20) {
            console.log('创建测试消息...');
            const messages = [];
            const messageTypes = [
                'system',
                'order',
                'task',
                'payment',
                'verification',
                'forum',
                'notice',
                'reminder',
            ];

            for (let i = 1; i <= 50; i++) {
                const senderIndex = Math.floor(Math.random() * userRecords.length);
                const receiverIndex = Math.floor(Math.random() * userRecords.length);
                const createdAt = new Date(
                    threeMonthsAgo.getTime() +
                        Math.random() * (now.getTime() - threeMonthsAgo.getTime())
                );
                const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];

                messages.push({
                    sender_id: userRecords[senderIndex].id,
                    receiver_id: userRecords[receiverIndex].id,
                    type: type,
                    title: `消息标题${i}`,
                    content: `消息内容${i}`,
                    is_read: Math.random() > 0.5,
                    created_at: createdAt,
                    updated_at: createdAt,
                });
            }

            // 添加系统公告
            for (let i = 0; i < 5; i++) {
                const receiverIndex = Math.floor(Math.random() * userRecords.length);
                messages.push({
                    sender_id: null,
                    receiver_id: userRecords[receiverIndex].id,
                    type: 'notice',
                    title: `系统公告${i + 1}`,
                    content: `这是系统公告内容${i + 1}`,
                    is_read: false,
                    created_at: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                    updated_at: now,
                });
            }

            await Message.bulkCreate(messages);
            console.log(`已创建 ${messages.length} 条消息`);
        } else {
            console.log(`已有 ${messageCount} 条消息，跳过创建`);
        }

        console.log('\n=== 测试数据生成完成 ===');
        console.log('测试账号: 学号 20210001, 密码 123456');

        process.exit(0);
    } catch (error) {
        console.error('生成测试数据失败:', error);
        process.exit(1);
    }
}

seedAnalyticsData();
