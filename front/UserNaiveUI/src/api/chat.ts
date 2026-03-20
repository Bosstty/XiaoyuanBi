// 聊天 API
import { apiClient } from './client';

// 聊天相关接口
export const chatApi = {
  // 获取我的会话列表
  getConversations: () => apiClient.get('/chat/my/conversations'),

  // 创建会话
  createConversation: (data: {
    user_id?: number;
    deliverer_id?: number;
    order_id?: number;
    type?: string;
    initial_message?: string;
  }) => apiClient.post('/chat/conversations', data),

  // 获取会话详情
  getConversationDetail: (id: number) => apiClient.get(`/chat/conversations/${id}`),

  // 获取消息列表
  getMessages: (params: { conversation_id: number; page?: number; limit?: number }) =>
    apiClient.get('/chat/messages', { params }),

  // 发送消息
  sendMessage: (data: { conversation_id: number; content: string; receiver_type?: string }) =>
    apiClient.post('/chat/messages', data),

  // 标记消息已读
  markAsRead: (conversation_id: number) =>
    apiClient.post('/chat/messages/read', { conversation_id }),
};
