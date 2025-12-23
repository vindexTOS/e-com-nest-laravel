import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    // Load env vars from root .env and admin-service/.env
    const rootEnv = loadEnv(mode, resolve(__dirname, '../'), '');
    const localEnv = loadEnv(mode, __dirname, '');
    
    // Merge: root env takes precedence, then local
    const env = { ...localEnv, ...rootEnv };
    
    return {
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                refresh: true,
            }),
            react(),
            tailwindcss(),
        ],
        server: {
            watch: {
                ignored: ['**/storage/framework/views/**'],
            },
        },
        define: {
            // Make env vars available to frontend (VITE_ prefix)
            'import.meta.env.VITE_PUSHER_APP_KEY': JSON.stringify(env.VITE_PUSHER_APP_KEY || env.PUSHER_APP_KEY || 'ecom-key'),
            'import.meta.env.VITE_PUSHER_HOST': JSON.stringify(env.VITE_PUSHER_HOST || env.PUSHER_HOST || 'localhost'),
            'import.meta.env.VITE_PUSHER_PORT': JSON.stringify(env.VITE_PUSHER_PORT || env.PUSHER_PORT || '6001'),
            'import.meta.env.VITE_PUSHER_APP_CLUSTER': JSON.stringify(env.VITE_PUSHER_APP_CLUSTER || env.PUSHER_APP_CLUSTER || 'mt1'),
            'import.meta.env.VITE_SOCKET_URL': JSON.stringify(env.VITE_SOCKET_URL || env.APP_URL || 'http://localhost'),
        },
    };
});
