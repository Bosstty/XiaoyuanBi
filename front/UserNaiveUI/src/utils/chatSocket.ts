import { io, type Socket } from 'socket.io-client';
import { getSocketBaseUrl } from './apiBase';

const SOCKET_PATH = '/socket.io';
let socketInstance: Socket | null = null;
let socketToken = '';

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
    socketInstance = io(getSocketBaseUrl(), {
        path: SOCKET_PATH,
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        auth: {
            token: `Bearer ${token}`,
        },
    });

    socketInstance.on('disconnect', (reason: string) => {
        if (reason === 'io client disconnect') {
            return;
        }
    });

    return socketInstance;
};
