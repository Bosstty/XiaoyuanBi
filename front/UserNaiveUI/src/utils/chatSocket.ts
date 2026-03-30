import { io, type Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/user';
const SOCKET_PATH = '/socket.io';
let socketInstance: Socket | null = null;
let socketToken = '';

const resolveSocketBaseUrl = () => {
    if (/^https?:\/\//i.test(API_BASE_URL)) {
        return API_BASE_URL.replace(/\/api(?:\/.*)?$/i, '');
    }

    return window.location.origin;
};

export const createChatSocket = (): Socket | null => {
    const token = localStorage.getItem('token');
    if (!token) {
        if (socketInstance) {
            socketInstance.disconnect();
            socketInstance = null;
            socketToken = '';
        }
        return null;
    }

    if (socketInstance && socketToken === token) {
        if (!socketInstance.connected) {
            socketInstance.connect();
        }
        return socketInstance;
    }

    if (socketInstance) {
        socketInstance.disconnect();
    }

    socketToken = token;
    socketInstance = io(resolveSocketBaseUrl(), {
        path: SOCKET_PATH,
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        auth: {
            token: `Bearer ${token}`,
        },
    });

    socketInstance.on('disconnect', reason => {
        if (reason === 'io client disconnect') {
            return;
        }
    });

    return socketInstance;
};
