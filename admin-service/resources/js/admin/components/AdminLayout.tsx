import React, { useEffect, useRef, useState } from 'react';
import { Layout, Typography, Button, Menu, Badge, Dropdown, List, Empty, Spin, message } from 'antd';
import { LogoutOutlined, AppstoreOutlined, ShoppingOutlined, FolderOutlined, ShoppingCartOutlined, UserOutlined, FileTextOutlined, BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nestjsNotificationsApi, Notification } from '../../api';

declare global {
    interface Window {
        Echo: any;
    }
}

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { logout, user, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const echoChannelRef = useRef<any>(null);

    const handleLogout = () => {
        logout();
        navigate('/admin', { replace: true });
    };

    // TanStack Query for fetching notifications
    const {
        data: notificationsData,
        isLoading: notificationsLoading,
        refetch: refetchNotifications,
    } = useQuery({
        queryKey: ['notifications', token],
        queryFn: async () => {
            if (!token) throw new Error('No token');
            return await nestjsNotificationsApi.getAll(1, 10, false);
        },
        enabled: !!token,
        refetchInterval: 30000, // Refetch every 30 seconds as fallback
        staleTime: 10000, // Consider data stale after 10 seconds
    });

    const notifications = notificationsData?.data || [];
    const unreadCount = notificationsData?.unreadCount || 0;

    // Mutations for marking notifications as read
    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => nestjsNotificationsApi.markAsRead(id),
        onSuccess: () => {
            // Invalidate and refetch notifications
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onError: (err: any) => {
            console.error('Failed to mark as read', err);
            message.error('Failed to mark notification as read');
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => nestjsNotificationsApi.markAllAsRead(),
        onSuccess: () => {
            // Invalidate and refetch notifications
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            message.success('All notifications marked as read');
        },
        onError: (err: any) => {
            console.error('Failed to mark all as read', err);
            message.error('Failed to mark all notifications as read');
        },
    });

    useEffect(() => {
        if (!token || !window.Echo) {
            console.log('Echo not available or no token');
            return;
        }

        const echo = window.Echo;
        
        console.log('Setting up Laravel Echo listener for admin-notifications');
        
        const channel = echo.channel('admin-notifications');
        echoChannelRef.current = channel;
        
        channel
            .subscribed(() => {
                console.log('Successfully subscribed to admin-notifications channel');
            })
            .error((error: any) => {
                console.error('Error subscribing to admin-notifications channel:', error);
            });
        
        const handleNotification = (data: Notification) => {
            console.log('New notification received via Laravel Echo:', data);
            
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            
            message.info({
                content: (
                    <div>
                        <strong>{data.title}</strong>
                        <div style={{ fontSize: 12 }}>{data.message}</div>
                    </div>
                ),
                duration: 5,
                icon: <BellOutlined style={{ color: '#1890ff' }} />,
            });
        };

        channel.listen('new-notification', handleNotification);
        
        channel.listen('.new-notification', handleNotification);
        
        channel.listen('App\\Events\\NewOrderNotification', handleNotification);

        const pusher = echo.connector.pusher;
        pusher.connection.bind('connected', () => {
            console.log('Pusher/Echo connected successfully');
        });

        pusher.connection.bind('disconnected', () => {
            console.log('Pusher/Echo disconnected');
        });

        pusher.connection.bind('error', (err: any) => {
            console.error('Pusher/Echo connection error:', err);
        });

        return () => {
            console.log('Cleaning up Echo listener');
            if (channel) {
                channel.stopListening('new-notification');
                channel.stopListening('.new-notification');
                channel.stopListening('App\\Events\\NewOrderNotification');
                echo.leave('admin-notifications');
            }
            echoChannelRef.current = null;
        };
    }, [token, queryClient]);

    const handleMarkAsRead = (id: string) => {
        markAsReadMutation.mutate(id);
    };

    const handleMarkAllAsRead = () => {
        markAllAsReadMutation.mutate();
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'order_created':
                return <ShoppingCartOutlined style={{ color: '#52c41a' }} />;
            case 'low_stock':
                return <ShoppingOutlined style={{ color: '#faad14' }} />;
            case 'user_registered':
                return <UserOutlined style={{ color: '#1890ff' }} />;
            default:
                return <BellOutlined style={{ color: '#1890ff' }} />;
        }
    };

    const notificationMenu = (
        <div style={{ 
            width: 360, 
            maxHeight: 450, 
            background: '#fff', 
            borderRadius: 8, 
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
            overflow: 'hidden'
        }}>
            <div style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Text strong>Notifications</Text>
                {unreadCount > 0 && (
                    <Button 
                        type="link" 
                        size="small" 
                        onClick={handleMarkAllAsRead}
                        icon={<CheckOutlined />}
                    >
                        Mark all read
                    </Button>
                )}
            </div>
            <div style={{ maxHeight: 380, overflow: 'auto' }}>
                {notificationsLoading ? (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                        <Spin />
                    </div>
                ) : notifications.length > 0 ? (
                    <List
                        dataSource={notifications}
                        renderItem={(item) => (
                            <List.Item
                                style={{ 
                                    padding: '12px 16px',
                                    background: item.read_at ? '#fff' : '#f6ffed',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f0f0f0'
                                }}
                                onClick={() => {
                                    if (!item.read_at) {
                                        handleMarkAsRead(item.id);
                                    }
                                    if (item.type === 'order_created' && item.data?.order_id) {
                                        navigate('/admin/orders');
                                        setDropdownOpen(false);
                                    }
                                }}
                            >
                                <List.Item.Meta
                                    avatar={getNotificationIcon(item.type)}
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text strong={!item.read_at}>{item.title}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {formatTime(item.created_at)}
                                            </Text>
                                        </div>
                                    }
                                    description={
                                        <Text 
                                            type="secondary" 
                                            style={{ fontSize: 13 }}
                                        >
                                            {item.message}
                                        </Text>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty 
                        description="No notifications" 
                        style={{ padding: 24 }}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                )}
            </div>
        </div>
    );

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
                        {/* Notification Bell */}
                        <Dropdown
                            dropdownRender={() => notificationMenu}
                            trigger={['click']}
                            placement="bottomRight"
                            open={dropdownOpen}
                            onOpenChange={(open) => {
                                setDropdownOpen(open);
                                // Refetch notifications when dropdown opens
                                if (open) {
                                    refetchNotifications();
                                }
                            }}
                        >
                            <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                                <Button
                                    type="text"
                                    icon={<BellOutlined style={{ fontSize: 20 }} />}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        width: 40,
                                        height: 40
                                    }}
                                />
                            </Badge>
                        </Dropdown>
                        
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
