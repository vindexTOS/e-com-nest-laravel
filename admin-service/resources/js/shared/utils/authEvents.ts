export const AUTH_CHANGED_EVENT = 'auth:changed';
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

export const emitAuthChanged = () => {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const emitAuthUnauthorized = () => {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
};

