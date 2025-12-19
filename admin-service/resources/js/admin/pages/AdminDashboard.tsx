import React, { useEffect, useState } from 'react';
import { Layout, Typography, Button, Card, Row, Col, Statistic, Menu, Space, Tabs } from 'antd';
import { LogoutOutlined, ShoppingOutlined, UserOutlined, DollarOutlined, ShoppingCartOutlined, AppstoreOutlined, FolderOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { productsApi, ordersApi, usersApi } from '../../api';
import ProductManagement from '../components/ProductManagement';
import UserManagement from '../components/UserManagement';
import CategoryManagement from '../components/CategoryManagement';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const AdminDashboard: React.FC = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        products: 0,
        orders: 0,
        users: 0,
        revenue: 0,
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('products');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [productsRes, ordersRes, usersRes, reportsRes] = await Promise.all([
                productsApi.getAll({ per_page: 1 }),
                ordersApi.getAll({ limit: 1 }),
                usersApi.getAll({ per_page: 1 }),
                ordersApi.getReports('monthly'),
            ]);

            setStats({
                products: productsRes.data.total || 0,
                orders: ordersRes.data.total || 0,
                users: usersRes.data.total || 0,
                revenue: reportsRes.data.total_revenue || 0,
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/admin', { replace: true });
    };

    const menuItems = [
        { key: '/admin/dashboard', icon: <AppstoreOutlined />, label: <Link to="/admin/dashboard">Dashboard</Link> },
        { key: '/admin/products', icon: <ShoppingOutlined />, label: <Link to="/admin/products">Products</Link> },
        { key: '/admin/categories', icon: <FolderOutlined />, label: <Link to="/admin/categories">Categories</Link> },
        { key: '/admin/orders', icon: <ShoppingCartOutlined />, label: <Link to="/admin/orders">Orders</Link> },
        { key: '/admin/users', icon: <UserOutlined />, label: <Link to="/admin/users">Users</Link> },
        { key: '/admin/reports', icon: <FileTextOutlined />, label: <Link to="/admin/reports">Reports</Link> },
    ];

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
        <Layout style={{ minHeight: '100vh' }}>
            <Sider width={200} theme="light" style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
                    <Title level={4} style={{ margin: 0 }}>Admin Panel</Title>
                </div>
                <Menu 
                    mode="inline" 
                    selectedKeys={[window.location.pathname]} 
                    items={menuItems}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <Layout>
                <Header style={{
                    background: '#fff',
                    padding: '0 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <Title level={4} style={{ margin: 0 }}>
                        E-Commerce Admin Panel
                    </Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {user && (
                            <span style={{ color: '#666' }}>
                                {user.firstName} {user.lastName}
                            </span>
                        )}
                        <Button
                            type="primary"
                            danger
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                        >
                            Logout
                        </Button>
                    </div>
                </Header>
                <Content style={{ padding: '24px', background: '#f0f2f5' }}>
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
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminDashboard;
