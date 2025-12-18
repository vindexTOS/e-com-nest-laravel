import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PublicRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children, redirectTo }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
            }}>
                Loading...
            </div>
        );
    }

    if (isAuthenticated && user) {
        // Redirect based on user role
        if (user.role === 'admin') {
            return <Navigate to={redirectTo || '/admin/dashboard'} replace />;
        }
        // Customer stays on products page (root)
        return <Navigate to={redirectTo || '/'} replace />;
    }

    return <>{children}</>;
};

export default PublicRoute;

