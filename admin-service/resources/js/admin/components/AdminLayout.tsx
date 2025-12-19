import React from 'react';
import { Layout, Typography, Button, Menu } from 'antd';
import { LogoutOutlined, AppstoreOutlined, ShoppingOutlined, FolderOutlined, ShoppingCartOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider width={200} theme="light">
                <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
                    <Title level={4} style={{ margin: 0 }}>Admin Panel</Title>
                </div>
                <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} />
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
                {children}
            </Layout>
        </Layout>
    );
};

export default AdminLayout;

