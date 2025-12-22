import { useState, useEffect, useCallback } from 'react';
import { User } from '../types/auth.types';
import { AUTH_CHANGED_EVENT, AUTH_UNAUTHORIZED_EVENT, emitAuthChanged } from '../utils/authEvents';

export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    const checkAuth = useCallback(() => {
        const storedToken = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');

        if (storedToken && userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setIsAuthenticated(true);
                setUser(parsedUser);
                setToken(storedToken);
            } catch (error) {
                console.error('Error parsing user data:', error);
                clearAuth();
            }
        } else {
            setIsAuthenticated(false);
            setUser(null);
            setToken(null);
        }
        setLoading(false);
    }, []);

    const login = useCallback((token: string, refreshToken: string, userData: any) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData);
        emitAuthChanged();
    }, []);

    const clearAuth = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
    }, []);

    const logout = useCallback(() => {
        clearAuth();
        emitAuthChanged();
    }, [clearAuth]);

    const isAdmin = () => user?.role === 'admin';
    const isCustomer = () => user?.role === 'customer';

    useEffect(() => {
        checkAuth();

        const handleAuthChanged = () => checkAuth();
        const handleUnauthorized = () => logout();

        window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
        window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

        return () => {
            window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
            window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
        };
    }, [checkAuth, logout]);

    return {
        isAuthenticated,
        loading,
        user,
        token,
        login,
        logout,
        checkAuth,
        isAdmin,
        isCustomer,
    };
};

