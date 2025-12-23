import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY || import.meta.env.PUSHER_APP_KEY || 'ecom-key',
    wsHost: import.meta.env.VITE_PUSHER_HOST || import.meta.env.PUSHER_HOST || window.location.hostname || 'localhost',
    wsPort: Number(import.meta.env.VITE_PUSHER_PORT || import.meta.env.PUSHER_PORT || '6001'),
    wssPort: Number(import.meta.env.VITE_PUSHER_PORT || import.meta.env.PUSHER_PORT || '6001'),
    forceTLS: false,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || import.meta.env.PUSHER_APP_CLUSTER || 'mt1',
});
