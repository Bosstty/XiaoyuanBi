import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        // 为局域网调试生成自签名证书，首次访问需要手动信任。
        basicSsl(),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5174,
        https: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            '/uploads': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
            },
            '/socket.io': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
                ws: true,
            },
        },
    },
    preview: {
        host: '0.0.0.0',
        port: 4174,
        https: true,
    },
});
