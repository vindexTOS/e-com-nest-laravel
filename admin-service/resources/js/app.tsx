import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ProtectedRoute from './shared/components/ProtectedRoute';
import PublicRoute from './shared/components/PublicRoute';

// Admin pages
import AdminLogin from './admin/pages/AdminLogin';
import AdminDashboard from './admin/pages/AdminDashboard';

// User pages
import UserLogin from './user/pages/UserLogin';
import UserRegister from './user/pages/UserRegister';
import ProductsPage from './user/pages/ProductsPage';

import '../css/app.css';

const App: React.FC = () => {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#667eea',
                },
            }}
        >
            <Router basename="/">
                <Routes>
                    {/* Public Routes - Products page with navbar */}
                    <Route
                        path="/"
                        element={<ProductsPage />}
                    />
                    <Route
                        path="/login"
                        element={
                            <PublicRoute redirectTo="/">
                                <UserLogin />
                            </PublicRoute>
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <PublicRoute redirectTo="/">
                                <UserRegister />
                            </PublicRoute>
                        }
                    />

                    {/* Admin Routes */}
                    <Route
                        path="/admin"
                        element={
                            <PublicRoute redirectTo="/admin/dashboard">
                                <AdminLogin />
                            </PublicRoute>
                        }
                    />
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute requiredRole="admin" redirectTo="/admin">
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Default Routes */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </ConfigProvider>
    );
};

const rootElement = document.getElementById('app');

if (rootElement) {
    try {
        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    } catch (error) {
        console.error('Error rendering React app:', error);
        rootElement.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>React App Loading...</h1><p>If this persists, check the browser console.</p></div>';
    }
} else {
    console.error('Root element with id "app" not found');
}
