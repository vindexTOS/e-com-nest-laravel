import React, { useState } from 'react';
import { Typography, Card, Row, Col, Statistic, Tabs } from 'antd';
import { ShoppingOutlined, UserOutlined, DollarOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { nestjsProductsApi, nestjsOrdersApi, nestjsUserApi } from '../../api';
import ProductManagement from '../components/ProductManagement';
import UserManagement from '../components/UserManagement';
import CategoryManagement from '../components/CategoryManagement';
import AdminLayout from '../components/AdminLayout';

const { Title } = Typography;

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('products');

    const statsQuery = useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
            const [productsRes, ordersRes, usersRes] = await Promise.all([
                nestjsProductsApi.getAll({ limit: 1, page: 1 }).catch(() => ({ data: { total: 0 } } as any)),
                nestjsOrdersApi.getAll({ limit: 1, offset: 0 }),
                nestjsUserApi.getUsers({ page: 1, limit: 1 }),
            ]);

            const productsTotal = (productsRes as any)?.data?.total ?? 0;
            const ordersTotal = (ordersRes as any)?.data?.total ?? 0;
            const usersTotal = (usersRes as any)?.total ?? (usersRes as any)?.data?.total ?? 0;

            return {
                products: productsTotal,
                orders: ordersTotal,
                users: usersTotal,
                revenue: 0,
            };
        },
    });
    const stats = statsQuery.data ?? { products: 0, orders: 0, users: 0, revenue: 0 };
    const loading = statsQuery.isFetching;

    const tabItems = [
        {
            key: 'products',
            label: 'Products',
            children: <ProductManagement />,
        },
        {
            key: 'users',
            label: 'Users',
            children: <UserManagement />,
        },
        {
            key: 'categories',
            label: 'Categories',
            children: <CategoryManagement />,
        },
    ];

    return (
        <AdminLayout>
            <div style={{ padding: '24px', background: '#f0f2f5' }}>
                    <Title level={2} style={{ marginBottom: 24 }}>Dashboard</Title>
                    
                    {/* Statistics Cards */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="Total Products"
                                    value={stats.products}
                                    prefix={<ShoppingOutlined />}
                                    valueStyle={{ color: '#3f8600' }}
                                    loading={loading}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="Total Orders"
                                    value={stats.orders}
                                    prefix={<ShoppingCartOutlined />}
                                    valueStyle={{ color: '#1890ff' }}
                                    loading={loading}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="Total Users"
                                    value={stats.users}
                                    prefix={<UserOutlined />}
                                    valueStyle={{ color: '#722ed1' }}
                                    loading={loading}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="Revenue (Monthly)"
                                    value={stats.revenue}
                                    prefix={<DollarOutlined />}
                                    precision={2}
                                    valueStyle={{ color: '#cf1322' }}
                                    loading={loading}
                                />
                            </Card>
                        </Col>
                    </Row>

                    {/* Management Tabs */}
                    <Card>
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            items={tabItems}
                        />
                    </Card>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
