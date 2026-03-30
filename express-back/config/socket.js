const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { User, Admin, Service, ChatConversation } = require('../src/models');

const DEFAULT_SERVICE_SCOPE_ID = Number(process.env.DEFAULT_SERVICE_SCOPE_ID || 1);
const DIRECT_CHAT_TYPE = 'user_deliverer';

let ioInstance = null;

function extractToken(socket) {
    const authToken = socket.handshake.auth?.token;
    if (authToken) {
        return String(authToken).replace(/^Bearer\s+/i, '');
    }

    const headerToken = socket.handshake.headers?.authorization;
    if (headerToken) {
        return String(headerToken).replace(/^Bearer\s+/i, '');
    }

    const queryToken = socket.handshake.query?.token;
    if (queryToken) {
        return String(queryToken).replace(/^Bearer\s+/i, '');
    }

    return '';
}

async function resolveSocketUser(decoded) {
    if (decoded?.type === 'admin') {
        const admin = await Admin.findByPk(decoded.id, {
            attributes: ['id', 'username', 'status', 'role'],
        });

        if (!admin || admin.status !== 'active') {
            throw new Error('管理员账号无效');
        }

        return {
            id: admin.id,
            type: 'admin',
            userRole: 'service',
            serviceScopeId: DEFAULT_SERVICE_SCOPE_ID,
            displayName: admin.username || `admin:${admin.id}`,
        };
    }

    if (decoded?.type === 'service' || decoded?.role === 'service') {
        const service = await Service.findByPk(decoded.id, {
            attributes: ['id', 'username', 'status'],
        });

        if (!service || service.status !== 'active') {
            throw new Error('客服账号无效');
        }

        return {
            id: service.id,
            type: 'service',
            userRole: 'service',
            serviceScopeId: service.id || DEFAULT_SERVICE_SCOPE_ID,
            displayName: service.username || `service:${service.id}`,
        };
    }

    const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'username', 'email', 'status'],
    });

    if (!user || user.status !== 'active') {
        throw new Error('用户账号无效');
    }

    return {
        id: user.id,
        type: 'user',
        userRole: 'user',
        serviceScopeId: null,
        displayName: user.username || user.email || `user:${user.id}`,
    };
}

function canAccessConversation(conversation, authUser) {
    if (!conversation || !authUser) return false;

    if (authUser.userRole === 'service') {
        return (
            conversation.type === 'user_service' || conversation.type === 'deliverer_service'
        );
    }

    if (conversation.type === DIRECT_CHAT_TYPE) {
        return (
            Number(conversation.user_id) === Number(authUser.id) ||
            Number(conversation.service_id) === Number(authUser.id)
        );
    }

    return Number(conversation.user_id) === Number(authUser.id);
}

function getConversationRooms(conversation) {
    const rooms = new Set();

    if (!conversation?.id) {
        return [];
    }

    rooms.add(`conversation:${conversation.id}`);

    if (conversation.type === DIRECT_CHAT_TYPE) {
        if (conversation.user_id) {
            rooms.add(`user:${conversation.user_id}`);
        }
        if (conversation.service_id) {
            rooms.add(`user:${conversation.service_id}`);
        }
        return Array.from(rooms);
    }

    if (conversation.user_id) {
        rooms.add(`user:${conversation.user_id}`);
    }

    if (conversation.service_id) {
        rooms.add(`service:${conversation.service_id}`);
    } else {
        rooms.add(`service:${DEFAULT_SERVICE_SCOPE_ID}`);
    }

    return Array.from(rooms);
}

function emitToRooms(rooms, event, payload) {
    if (!ioInstance || !rooms?.length) return;

    let emitter = ioInstance;
    rooms.forEach(room => {
        emitter = emitter.to(room);
    });
    emitter.emit(event, payload);
}

function emitConversationEvent(conversation, event, payload) {
    emitToRooms(getConversationRooms(conversation), event, payload);
}

function getSocketServer() {
    if (!ioInstance) {
        throw new Error('Socket.IO 尚未初始化');
    }
    return ioInstance;
}

function initSocket(server) {
    if (ioInstance) {
        return ioInstance;
    }

    ioInstance = new Server(server, {
        cors: {
            origin: true,
            credentials: true,
        },
    });

    ioInstance.use(async (socket, next) => {
        try {
            const token = extractToken(socket);
            if (!token) {
                return next(new Error('未提供认证令牌'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authUser = await resolveSocketUser(decoded);
            socket.data.authUser = authUser;
            return next();
        } catch (error) {
            return next(new Error(error.message || 'Socket 鉴权失败'));
        }
    });

    ioInstance.on('connection', socket => {
        const authUser = socket.data.authUser;
        const baseRoom = authUser.type === 'admin' ? 'admin' : 'user';

        socket.join(`${baseRoom}:${authUser.id}`);
        if (authUser.userRole === 'service') {
            socket.join(`service:${authUser.serviceScopeId || DEFAULT_SERVICE_SCOPE_ID}`);
        }

        socket.on('chat:join', async payload => {
            try {
                const conversationId = Number(payload?.conversationId || payload?.conversation_id || 0);
                if (!conversationId) {
                    socket.emit('chat:error', { message: '会话ID不正确' });
                    return;
                }

                const conversation = await ChatConversation.findByPk(conversationId);
                if (!canAccessConversation(conversation, authUser)) {
                    socket.emit('chat:error', { message: '无权限加入该会话' });
                    return;
                }

                socket.join(`conversation:${conversationId}`);
                socket.emit('chat:joined', { conversation_id: conversationId });
            } catch (error) {
                socket.emit('chat:error', { message: error.message || '加入会话失败' });
            }
        });

        socket.on('chat:leave', payload => {
            const conversationId = Number(payload?.conversationId || payload?.conversation_id || 0);
            if (!conversationId) return;
            socket.leave(`conversation:${conversationId}`);
        });

        socket.on('disconnect', reason => {
            console.log(`Socket 断开: ${authUser.displayName}, reason=${reason}`);
        });
    });

    return ioInstance;
}

module.exports = {
    createHttpServer: app => http.createServer(app),
    initSocket,
    getSocketServer,
    emitConversationEvent,
    getConversationRooms,
    DEFAULT_SERVICE_SCOPE_ID,
};
