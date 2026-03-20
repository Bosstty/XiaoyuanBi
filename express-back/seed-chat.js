// 生成聊天测试数据
const { ChatConversation, ChatMessage, User, Deliverer } = require('./src/models');

async function generateTestData() {
  try {
    console.log('开始生成聊天测试数据...');

    // 查找一些用户
    const users = await User.findAll({ limit: 3 });
    const deliverers = await Deliverer.findAll({ limit: 2 });

    if (users.length === 0) {
      console.log('没有找到用户，请先创建用户数据');
      return;
    }

    const serviceId = 1; // 客服ID

    // 创建会话和消息
    const conversationsData = [];

    // 为每个用户创建会话
    for (const user of users) {
      // 创建会话
      const conversation = await ChatConversation.create({
        user_id: user.id,
        deliverer_id: null,
        service_id: serviceId,
        type: 'user_service',
        status: 'open',
        last_message: '您好，有什么可以帮助您的？',
        last_message_at: new Date()
      });

      // 创建初始消息（用户发送）
      await ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_type: 'user',
        receiver_type: 'service',
        content: '您好，我想咨询一些问题',
        type: 'text',
        is_read: true
      });

      // 创建客服回复
      await ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: serviceId,
        sender_type: 'service',
        receiver_type: 'user',
        content: '您好，请问有什么可以帮助您的？',
        type: 'text',
        is_read: false
      });

      conversationsData.push(conversation.id);
      console.log(`为用户 ${user.username} 创建会话成功，会话ID: ${conversation.id}`);
    }

    // 为配送员创建会话
    for (const deliverer of deliverers) {
      const conversation = await ChatConversation.create({
        user_id: null,
        deliverer_id: deliverer.id,
        service_id: serviceId,
        type: 'deliverer_service',
        status: 'open',
        last_message: '您好，有订单问题咨询',
        last_message_at: new Date()
      });

      await ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: deliverer.id,
        sender_type: 'deliverer',
        receiver_type: 'service',
        content: '您好，有个订单问题想咨询',
        type: 'text',
        is_read: true
      });

      conversationsData.push(conversation.id);
      console.log(`为配送员创建会话成功，会话ID: ${conversation.id}`);
    }

    // 创建一个已关闭的会话
    if (users.length > 0) {
      const closedConversation = await ChatConversation.create({
        user_id: users[0].id,
        deliverer_id: null,
        service_id: serviceId,
        type: 'user_service',
        status: 'closed',
        last_message: '感谢您的帮助',
        last_message_at: new Date(Date.now() - 86400000) // 1天前
      });

      await ChatMessage.create({
        conversation_id: closedConversation.id,
        sender_id: users[0].id,
        sender_type: 'user',
        receiver_type: 'service',
        content: '感谢您的帮助，问题已解决',
        type: 'text',
        is_read: true
      });

      console.log(`创建已关闭会话成功，会话ID: ${closedConversation.id}`);
    }

    console.log('\n测试数据生成完成！');
    console.log(`共创建 ${conversationsData.length} 个会话`);

  } catch (error) {
    console.error('生成测试数据失败:', error);
  } finally {
    process.exit(0);
  }
}

generateTestData();
