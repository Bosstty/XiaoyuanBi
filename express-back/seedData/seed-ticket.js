// 生成售后工单测试数据
const { ServiceTicket, User, Deliverer, PickupOrder } = require('../src/models');

async function generateTestData() {
    try {
        console.log('开始生成售后工单测试数据...');

        // 查找一些用户和配送员
        const users = await User.findAll({ limit: 5 });
        const deliverers = await Deliverer.findAll({ limit: 3 });
        const orders = await PickupOrder.findAll({ limit: 5 });

        if (users.length === 0) {
            console.log('没有找到用户，请先创建用户数据');
            return;
        }

        const serviceId = 1; // 客服ID

        const ticketTypes = ['complaint', 'refund', 'dispute', 'suggestion', 'other'];
        const priorities = ['low', 'medium', 'high', 'urgent'];
        const statuses = ['pending', 'processing', 'resolved', 'closed'];

        const ticketData = [
            {
                type: 'complaint',
                title: '配送员态度恶劣',
                description: '配送员在送餐时语言不友好，甚至有辱骂行为，希望能严肃处理。',
                priority: 'high',
                content:
                    '今天下午点了一份外卖，配送员到达后态度非常差，还说了脏话，希望平台能重视这个问题。',
            },
            {
                type: 'refund',
                title: '订单退款申请',
                description: '商品已损坏，申请全额退款。',
                priority: 'medium',
                content: '收到的外卖包装破损，食物洒落，无法食用，申请退款。',
            },
            {
                type: 'dispute',
                title: '配送费用争议',
                description: '实际配送费与显示费用不符。',
                priority: 'low',
                content: '订单显示配送费3元，但实际收取了5元，请求核实。',
            },
            {
                type: 'suggestion',
                title: '建议增加夜间配送服务',
                description: '希望平台能提供24小时配送服务。',
                priority: 'low',
                content:
                    '晚上学习到很晚有时候需要点外卖，但很多店夜间不配送，建议平台能解决这个问题。',
            },
            {
                type: 'complaint',
                title: '快递丢失',
                description: '代取的快递丢失了。',
                priority: 'urgent',
                content: '请配送员帮忙代取的快递已经显示签收，但我并没有收到货物，物流显示已签收。',
            },
            {
                type: 'refund',
                title: '商品质量问题',
                description: '购买的商品与描述不符。',
                priority: 'medium',
                content: '在平台购买的生活用品与商家描述的质量相差很大，要求退货退款。',
            },
            {
                type: 'dispute',
                title: '订单取消争议',
                description: '用户和配送员对订单取消责任存在分歧。',
                priority: 'medium',
                content: '我已经到达取餐地点，但配送员说订单已被取消，要求平台介入处理。',
            },
            {
                type: 'other',
                title: '账户问题咨询',
                description: '无法登录账户。',
                priority: 'high',
                content: '我的账号突然无法登录，提示密码错误，但密码应该是正确的。',
            },
            {
                type: 'suggestion',
                title: '建议优化配送路线',
                description: '希望配送员能更高效地配送。',
                priority: 'low',
                content: '建议平台能优化配送员的配送路线，减少配送时间。',
            },
            {
                type: 'complaint',
                title: '配送超时',
                description: '配送时间过长，影响使用。',
                priority: 'medium',
                content: '订单预计30分钟送达，但实际等了1个小时，食物都凉了。',
            },
        ];

        const ticketsCreated = [];

        for (let i = 0; i < ticketData.length; i++) {
            const data = ticketData[i];
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomDeliverer =
                deliverers.length > 0
                    ? deliverers[Math.floor(Math.random() * deliverers.length)]
                    : null;
            const randomOrder =
                orders.length > 0 ? orders[Math.floor(Math.random() * orders.length)] : null;

            // 随机状态（已解决或已关闭的会有solution和resolved_at）
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const resolvedAt =
                status === 'resolved' || status === 'closed'
                    ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
                    : null;

            const ticket = await ServiceTicket.create({
                ticket_no: `TK${Date.now()}${i.toString().padStart(3, '0')}`,
                type: data.type,
                title: data.title,
                description: data.description,
                priority: data.priority,
                status: status,
                order_id: randomOrder?.id || null,
                user_id: randomUser.id,
                deliverer_id: randomDeliverer?.id || null,
                service_id: serviceId,
                solution: resolvedAt ? `已处理：${data.title}的问题已解决，感谢您的反馈。` : null,
                resolved_at: resolvedAt,
            });

            ticketsCreated.push(ticket.id);
            console.log(
                `创建工单成功: ${data.title}, 工单号: ${ticket.ticket_no}, 状态: ${status}`
            );
        }

        // 再创建一些不同状态的工单
        const extraTickets = [
            { type: 'complaint', title: '包装破损', priority: 'high', status: 'pending' },
            { type: 'refund', title: '商品缺货', priority: 'medium', status: 'processing' },
            { type: 'complaint', title: '配送员迟到', priority: 'medium', status: 'resolved' },
            { type: 'suggestion', title: '希望有更多优惠', priority: 'low', status: 'closed' },
            { type: 'dispute', title: '赔偿问题', priority: 'urgent', status: 'pending' },
        ];

        for (let i = 0; i < extraTickets.length; i++) {
            const data = extraTickets[i];
            const randomUser = users[Math.floor(Math.random() * users.length)];

            const ticket = await ServiceTicket.create({
                ticket_no: `TK${Date.now()}${10 + i}`,
                type: data.type,
                title: data.title,
                description: `${data.title}的详细描述`,
                priority: data.priority,
                status: data.status,
                user_id: randomUser.id,
                service_id: serviceId,
                solution:
                    data.status === 'resolved' || data.status === 'closed' ? '已处理完成' : null,
                resolved_at:
                    data.status === 'resolved' || data.status === 'closed' ? new Date() : null,
            });

            ticketsCreated.push(ticket.id);
            console.log(`创建额外工单: ${data.title}, 状态: ${data.status}`);
        }

        console.log('\n测试数据生成完成！');
        console.log(`共创建 ${ticketsCreated.length} 个售后工单`);

        // 打印统计
        const stats = await Promise.all(
            ticketTypes.map(async type => {
                const count = await ServiceTicket.count({ where: { type } });
                return { type, count };
            })
        );
        console.log('\n工单类型统计:');
        stats.forEach(s => console.log(`  ${s.type}: ${s.count}个`));
    } catch (error) {
        console.error('生成测试数据失败:', error);
    } finally {
        process.exit(0);
    }
}

generateTestData();
