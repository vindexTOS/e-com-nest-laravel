import React, { useEffect } from 'react';
import { Layout, Typography, Button, Card, Row, Col, Empty } from 'antd';
import { ShoppingOutlined, UserOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

const { Header, Content } = Layout;
const { Title } = Typography;

const ProductsPage: React.FC = () => {
    const { logout, user, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    // Redirect admin users to admin dashboard
    useEffect(() => {
        if (!loading && isAuthenticated && user?.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [isAuthenticated, user, loading, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    // Show loading while checking auth
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <ShoppingOutlined style={{ fontSize: 24, color: '#667eea' }} />
                    <Title level={4} style={{ margin: 0 }}>
                        E-Commerce Store
                    </Title>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {isAuthenticated && user ? (
                        <>
                            <span style={{ color: '#666' }}>
                                {user.firstName} {user.lastName}
                            </span>
                            <Button
                                type="primary"
                                danger
                                onClick={handleLogout}
                            >
                                Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">
                                <Button type="text" icon={<LoginOutlined />}>
                                    Login
                                </Button>
                            </Link>
                            <Link to="/register">
                                <Button type="primary" icon={<UserOutlined />}>
                                    Sign Up
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </Header>
            <Content style={{ padding: '24px', background: '#f0f2f5' }}>
                <Title level={2} style={{ marginBottom: 24 }}>Products</Title>
                
                {isAuthenticated ? (
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={8} xl={6}>
                            <Card
                                hoverable
                                cover={
                                    <div style={{
                                        height: 200,
                                        background: '#f0f0f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Empty description="No Image" />
                                    </div>
                                }
                            >
                                <Card.Meta
                                    title="Product Name"
                                    description="Product description will appear here"
                                />
                            </Card>
                        </Col>
                    </Row>
                ) : (
                    <Card>
                        <Empty 
                            description={
                                <div>
                                    <p>Please <Link to="/login">login</Link> or <Link to="/register">register</Link> to view products</p>
                                </div>
                            }
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    </Card>
                )}
            </Content>
        </Layout>
    );
};

export default ProductsPage;

