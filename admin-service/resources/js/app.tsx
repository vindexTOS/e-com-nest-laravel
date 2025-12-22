import './bootstrap';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './shared/components/ProtectedRoute';
import PublicRoute from './shared/components/PublicRoute';

// Admin pages
import AdminLogin from './admin/pages/AdminLogin';
import AdminDashboard from './admin/pages/AdminDashboard';
import ProductsPage from './admin/pages/ProductsPage';
import CategoriesPage from './admin/pages/CategoriesPage';
import OrdersPage from './admin/pages/OrdersPage';
import UsersPage from './admin/pages/UsersPage';
import ReportsPage from './admin/pages/ReportsPage';

// User pages
import UserLogin from './user/pages/UserLogin';
import UserRegister from './user/pages/UserRegister';
import UserProductsPage from './user/pages/UserProductPage';
import UserOrdersPage from './user/pages/UserOrdersPage';

import '../css/app.css';

const queryClient = new QueryClient();

const App: React.FC = () => {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#667eea',
                },
            }}
        >
            <QueryClientProvider client={queryClient}>
                <Router basename="/">
                    <Routes>
                        {/* Public Routes - Products page with navbar */}
                        <Route
                            path="/"
                            element={<UserProductsPage />}
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
                        <Route
                            path="/orders"
                            element={<UserOrdersPage />}
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
                        <Route
                            path="/admin/products"
                            element={
                                <ProtectedRoute requiredRole="admin" redirectTo="/admin">
                                    <ProductsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/categories"
                            element={
                                <ProtectedRoute requiredRole="admin" redirectTo="/admin">
                                    <CategoriesPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/orders"
                            element={
                                <ProtectedRoute requiredRole="admin" redirectTo="/admin">
                                    <OrdersPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/users"
                            element={
                                <ProtectedRoute requiredRole="admin" redirectTo="/admin">
                                    <UsersPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/reports"
                            element={
                                <ProtectedRoute requiredRole="admin" redirectTo="/admin">
                                    <ReportsPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Default Routes */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </QueryClientProvider>
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
