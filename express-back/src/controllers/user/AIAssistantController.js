const AIAssistantService = require('@/ai/services/AIAssistantService');

class AIAssistantController {
    async getMeta(req, res) {
        try {
            const data = AIAssistantService.getMeta('user');
            res.json({
                success: true,
                data,
            });
        } catch (error) {
            console.error('获取 AI 助手配置失败:', error);
            res.status(500).json({
                success: false,
                message: '获取 AI 助手配置失败',
                error: error.message,
            });
        }
    }

    async chat(req, res) {
        try {
            const userId = Number(req.user?.id || 0);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: '未登录',
                });
            }

            const result = await AIAssistantService.chat({
                userId,
                input: req.body?.input,
                messages: req.body?.messages,
                scope: 'user',
            });

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('AI 助手回复失败:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'AI 助手回复失败',
            });
        }
    }

    async chatStream(req, res) {
        const userId = Number(req.user?.id || 0);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '未登录',
            });
        }

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const sendEvent = (event, payload) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        };

        try {
            await AIAssistantService.chatStream({
                userId,
                input: req.body?.input,
                messages: req.body?.messages,
                scope: 'user',
                onEvent: payload => {
                    const eventType = payload?.type || 'message';
                    sendEvent(eventType, payload);
                },
            });

            res.end();
        } catch (error) {
            console.error('AI 助手流式回复失败:', error);
            sendEvent('error', {
                type: 'error',
                message: error.message || 'AI 助手回复失败',
            });
            res.end();
        }
    }
}

module.exports = new AIAssistantController();
