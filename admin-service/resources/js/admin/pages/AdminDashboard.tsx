import React from 'react';
import { Layout, Typography, Button, Card, Row, Col, Statistic } from 'antd';
import { LogoutOutlined, ShoppingOutlined, UserOutlined, DollarOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { Header, Content } = Layout;
const { Title } = Typography;

const AdminDashboard: React.FC = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/admin', { replace: true });
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
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
                
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Products"
                                value={0}
                                prefix={<ShoppingOutlined />}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Orders"
                                value={0}
                                prefix={<ShoppingCartOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Users"
                                value={0}
                                prefix={<UserOutlined />}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Revenue"
                                value={0}
                                prefix={<DollarOutlined />}
                                valueStyle={{ color: '#cf1322' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card>
                    <Title level={4}>Welcome to the Admin Dashboard</Title>
                    <p>Manage your e-commerce platform from here. Product management, order tracking, and user management features will be available soon.</p>
                </Card>
            </Content>
        </Layout>
    );
};

export default AdminDashboard;

