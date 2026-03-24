const {
    sequelize,
    User,
    Deliverer,
    PickupOrder,
    Task,
    ForumPost,
    ForumComment,
    Service,
    ServiceTicket,
} = require('../models');

async function seedData() {
    try {
        console.log('🌱 开始生成测试数据...\n');

        // 1. 创建测试用户
        console.log('📦 创建测试用户...');
        const users = [];
        const userData = [
            {
                student_id: '20240001',
                username: 'zhangsan',
                email: 'zhangsan@stu.harbin.edu.cn',
                password: '123456',
                real_name: '张三',
                college: '计算机学院',
                major: '软件工程',
                grade: '2024',
            },
            {
                student_id: '20240002',
                username: 'lisi',
                email: 'lisi@stu.harbin.edu.cn',
                password: '123456',
                real_name: '李四',
                college: '信息学院',
                major: '计算机科学',
                grade: '2024',
            },
            {
                student_id: '20230003',
                username: 'wangwu',
                email: 'wangwu@stu.harbin.edu.cn',
                password: '123456',
                real_name: '王五',
                college: '理学院',
                major: '数学',
                grade: '2023',
            },
            {
                student_id: '20230004',
                username: 'zhaoliu',
                email: 'zhaoliu@stu.harbin.edu.cn',
                password: '123456',
                real_name: '赵六',
                college: '外国语学院',
                major: '英语',
                grade: '2023',
            },
            {
                student_id: '20220005',
                username: 'qianqi',
                email: 'qianqi@stu.harbin.edu.cn',
                password: '123456',
                real_name: '钱七',
                college: '艺术学院',
                major: '设计',
                grade: '2022',
            },
        ];

        for (const data of userData) {
            const user = await User.create({
                ...data,
                // 密码使用纯文本，beforeCreate钩子会自动加密
                phone: '138' + Math.floor(Math.random() * 90000000 + 10000000),
                status: 'active',
                student_verified: true,
            });
            users.push(user);
            console.log(`    用户: ${data.username}`);
        }

        // 2. 创建测试配送员
        console.log('\n🚴 创建测试配送员...');
        const deliverers = [];
        for (let i = 0; i < 3; i++) {
            const deliverer = await Deliverer.create({
                user_id: users[i].id,
                username: `deliverer${i + 1}`,
                password: '123456', // 纯文本，beforeCreate钩子会自动加密
                real_name: `配送员${i + 1}号`,
                phone: '139' + Math.floor(Math.random() * 90000000 + 10000000),
                id_card: '2301011990' + String(Math.floor(Math.random() * 900000 + 100000)),
                id_card_front: 'https://example.com/id_front_' + (i + 1) + '.jpg',
                id_card_back: 'https://example.com/id_back_' + (i + 1) + '.jpg',
                vehicle_type: ['bike', 'electric', 'walk'][Math.floor(Math.random() * 3)],
                emergency_contact_name: '紧急联系人',
                emergency_contact_phone: '150' + Math.floor(Math.random() * 90000000 + 10000000),
                application_status: 'approved',
                status: 'active',
                rating: (4 + Math.random()).toFixed(2),
            });
            deliverers.push(deliverer);
            console.log(`    配送员: ${deliverer.username}`);
        }

        // 3. 创建测试订单
        console.log('\n📦 创建测试订单...');
        const orderTypes = ['express', 'food', 'medicine', 'daily'];
        const orderStatuses = ['pending', 'accepted', 'picking', 'delivering', 'completed'];
        const locations = [
            { pickup: 'A号楼快递站', delivery: '3号楼123室' },
            { pickup: '南门食堂', delivery: '5号楼456室' },
            { pickup: '校医院', delivery: '2号楼789室' },
            { pickup: '图书馆', delivery: '7号楼101室' },
            { pickup: 'B号楼快递柜', delivery: '4号楼202室' },
        ];

        for (let i = 0; i < 10; i++) {
            const loc = locations[Math.floor(Math.random() * locations.length)];
            const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
            const order = await PickupOrder.create({
                user_id: users[i % users.length].id,
                deliverer_id:
                    status !== 'pending' ? deliverers[Math.floor(Math.random() * 3)].id : null,
                order_no: 'ORD' + Date.now() + i,
                type: orderTypes[Math.floor(Math.random() * 4)],
                title: ['快递代取', '外卖代取', '药品代购', '生活用品'][
                    Math.floor(Math.random() * 4)
                ],
                description: '测试订单描述',
                pickup_location: loc.pickup,
                delivery_location: loc.delivery,
                contact_name: '收件人' + (i + 1),
                contact_phone: '138' + String(10000000 + i),
                price: (5 + Math.random() * 20).toFixed(2),
                status: status,
                payment_status: status === 'completed' ? 'paid' : 'unpaid',
            });
            console.log(`    订单: ${order.order_no} (${order.status})`);
        }

        // 4. 创建测试任务
        console.log('\n📋 创建测试任务...');
        const taskCategories = ['study', 'design', 'tech', 'writing', 'life'];
        const taskTitles = [
            '辅导高等数学',
            '设计海报',
            '帮忙写代码',
            '文章代写',
            '代取快递',
            '帮忙排队',
            '论文格式调整',
            'PPT制作',
        ];

        for (let i = 0; i < 8; i++) {
            const task = await Task.create({
                publisher_id: users[(i + 1) % users.length].id,
                task_no: 'TASK' + Date.now() + i,
                category: taskCategories[Math.floor(Math.random() * 5)],
                title: taskTitles[i],
                description: '这是一个测试任务描述，任务详情如下...',
                price: (20 + Math.random() * 80).toFixed(2),
                deadline: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
                status: 'published',
                view_count: Math.floor(Math.random() * 100),
            });
            console.log(`    任务: ${task.title} (¥${task.price})`);
        }

        // 5. 创建测试论坛帖子
        console.log('\n📝 创建测试论坛帖子...');
        const forumCategories = ['academic', 'life', 'campus', 'task', 'skill'];
        const postTitles = [
            '求高等数学答疑',
            '二手教材转让',
            '校园樱花开了',
            '求组队参加比赛',
            '分享学习心得',
            '食堂美食推荐',
            '图书馆座位预约攻略',
            '期末复习技巧',
        ];

        for (let i = 0; i < 8; i++) {
            const post = await ForumPost.create({
                author_id: users[i % users.length].id,
                category: forumCategories[Math.floor(Math.random() * 5)],
                title: postTitles[i],
                content: `这是帖子内容，${postTitles[i]}的相关内容...`,
                status: 'published',
                view_count: Math.floor(Math.random() * 500),
                like_count: Math.floor(Math.random() * 50),
            });
            console.log(`    帖子: ${post.title}`);
        }

        // 6. 创建客服账号
        console.log('\n🎧 创建客服账号...');
        const serviceUsers = ['service1', 'service2', 'kefu01'];
        for (const username of serviceUsers) {
            await Service.create({
                username: username,
                password: '123456', // 纯文本，beforeCreate钩子会自动加密
                name:
                    username === 'service1'
                        ? '客服小一'
                        : username === 'service2'
                          ? '客服小二'
                          : '在线客服',
                phone: '180' + Math.floor(Math.random() * 90000000 + 10000000),
                role: 'service',
                status: 'active',
            });
            console.log(`    客服: ${username}`);
        }

        console.log('\n✨ 测试数据生成完成！');
        console.log('\n📋 测试账号信息:');
        console.log('  用户: zhangsan / 123456');
        console.log('  用户: lisi / 123456');
        console.log('  配送员: deliverer1 / 123456');
        console.log('  客服: service1 / 123456');
        console.log('  管理员: admin / 123456\n');
    } catch (error) {
        console.error('❌ 生成测试数据失败:', error.message);
    }
}

// 运行
seedData().then(() => {
    process.exit(0);
});
