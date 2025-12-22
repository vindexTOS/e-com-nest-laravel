import React, { useEffect, useState, useRef } from 'react';
import { Layout, Typography, Button, Card, Table, Tag, Space, Modal, Descriptions, Empty, message, Spin, Select } from 'antd';
import { ShoppingOutlined, UserOutlined, LoginOutlined, EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Order } from '../../types/order';
import { io, Socket } from 'socket.io-client';

const { Header, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

interface OrderDetailsModalProps {
    order: Order | null;
    visible: boolean;
    onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, visible, onClose }) => {
    if (!order) return null;

    const statusColors: Record<string, string> = {
        pending: 'orange',
        processing: 'blue',
        shipped: 'cyan',
        delivered: 'green',
        cancelled: 'red',
    };

    const fulfillmentColors: Record<string, string> = {
        unfulfilled: 'red',
        partial: 'orange',
        fulfilled: 'green',
    };

    return (
        <Modal
            title={`Order Details - ${order.orderNumber || order.order_number || order.id}`}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    Close
                </Button>,
            ]}
            width={800}
        >
            <Descriptions bordered column={2}>
                <Descriptions.Item label="Order Number">{order.orderNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Status">
                    <Tag color={statusColors[order.status || '']}>{order.status || '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Fulfillment Status">
                    <Tag color={fulfillmentColors[order.fulfillmentStatus || order.fulfillment_status || '']}>
                        {order.fulfillmentStatus || order.fulfillment_status || '-'}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Payment Status">
                    <Tag color={(order.paymentStatus || order.payment_status) === 'paid' ? 'green' : 'orange'}>
                        {order.paymentStatus || order.payment_status || '-'}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Total Amount">
                    <strong>${Number(order.total || 0).toFixed(2)}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Order Date">
                    {(order.createdAt || order.created_at) ? new Date(order.createdAt || order.created_at || '').toLocaleString() : '-'}
                </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
                <Title level={5}>Order Items</Title>
                <Table
                    dataSource={order.items || []}
                    rowKey="id"
                    pagination={false}
                    columns={[
                        {
                            title: 'Product Name',
                            key: 'productName',
                            render: (_: any, item: any) => item.productName || item.product_name || '-',
                        },
                        {
                            title: 'SKU',
                            key: 'productSku',
                            render: (_: any, item: any) => item.productSku || item.product_sku || '-',
                        },
                        {
                            title: 'Quantity',
                            dataIndex: 'quantity',
                            key: 'quantity',
                            align: 'center',
                        },
                        {
                            title: 'Unit Price',
                            key: 'unitPrice',
                            render: (_: any, item: any) => {
                                const price = item.unitPrice || item.unit_price;
                                return `$${Number(price || 0).toFixed(2)}`;
                            },
                        },
                        {
                            title: 'Total Price',
                            key: 'totalPrice',
                            render: (_: any, item: any) => {
                                const price = item.totalPrice || item.total_price;
                                return `$${Number(price || 0).toFixed(2)}`;
                            },
                        },
                    ]}
                />
            </div>
        </Modal>
    );
};

const UserOrdersPage: React.FC = () => {
    const { logout, user, isAuthenticated, loading, token } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('');
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!loading && isAuthenticated && user?.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [isAuthenticated, user, loading, navigate]);

    const requestOrders = () => {
        if (!socketRef.current) return;
        setOrdersLoading(true);
        socketRef.current.emit('orders:getMyOrders', {
            status: statusFilter || undefined,
            fulfillmentStatus: fulfillmentFilter || undefined,
                limit: 100,
        });
    };

    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const envUrl = (import.meta as any).env?.VITE_SOCKET_URL;
        const defaultUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const socketUrl = (envUrl || defaultUrl).replace(/\/+$/, '');
        const socket = io(`${socketUrl}/ws`, {
            path: '/socket.io',
            transports: ['websocket'],
            auth: { token: `Bearer ${token}` },
            });
        socketRef.current = socket;

        const handleOrdersList = (payload: { success?: boolean; data?: Order[]; total?: number; error?: string }) => {
            if (payload.success !== false) {
                setOrders(Array.isArray(payload?.data) ? payload.data : []);
            } else {
                message.error(payload.error || 'Failed to load orders');
            }
            setOrdersLoading(false);
        };

        socket.on('connect', () => {
            requestOrders();
        });
        socket.on('orders:myList', handleOrdersList);
        socket.on('connect_error', (err) => {
            console.error('Socket connection error', err);
            setOrdersLoading(false);
        });

        return () => {
            socket.off('orders:myList', handleOrdersList);
            socket.disconnect();
            socketRef.current = null;
    };
    }, [isAuthenticated, token]);

    useEffect(() => {
        if (socketRef.current?.connected) {
            requestOrders();
        }
    }, [statusFilter, fulfillmentFilter]);

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setModalVisible(true);
    };

    const statusColors: Record<string, string> = {
        pending: 'orange',
        processing: 'blue',
        shipped: 'cyan',
        delivered: 'green',
        cancelled: 'red',
    };

    const fulfillmentColors: Record<string, string> = {
        unfulfilled: 'red',
        partial: 'orange',
        fulfilled: 'green',
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
            }}>
                <Spin size="large" />
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
                            <Link to="/">
                                <Button type="text" icon={<ArrowLeftOutlined />}>
                                    Back to Products
                                </Button>
                            </Link>
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
                <Title level={2} style={{ marginBottom: 24 }}>My Orders</Title>

                {isAuthenticated ? (
                    <Card>
                        <Space style={{ marginBottom: 16 }} wrap>
                            <Select
                                placeholder="Filter by Status"
                                allowClear
                                style={{ width: 200 }}
                                value={statusFilter}
                                onChange={setStatusFilter}
                            >
                                <Option value="pending">Pending</Option>
                                <Option value="processing">Processing</Option>
                                <Option value="shipped">Shipped</Option>
                                <Option value="delivered">Delivered</Option>
                                <Option value="cancelled">Cancelled</Option>
                            </Select>
                            <Select
                                placeholder="Filter by Fulfillment"
                                allowClear
                                style={{ width: 200 }}
                                value={fulfillmentFilter}
                                onChange={setFulfillmentFilter}
                            >
                                <Option value="unfulfilled">Unfulfilled</Option>
                                <Option value="partial">Partial</Option>
                                <Option value="fulfilled">Fulfilled</Option>
                            </Select>
                        </Space>

                        {ordersLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Spin size="large" />
                            </div>
                        ) : orders.length ? (
                            <Table
                                dataSource={orders}
                                rowKey="id"
                                columns={[
                                    {
                                        title: 'Order Number',
                                        key: 'orderNumber',
                                        render: (_: any, record: Order) => record.orderNumber || record.order_number || '-',
                                    },
                                    {
                                        title: 'Status',
                                        dataIndex: 'status',
                                        key: 'status',
                                        render: (status: string) => (
                                            <Tag color={statusColors[status || '']}>{status || '-'}</Tag>
                                        ),
                                    },
                                    {
                                        title: 'Fulfillment',
                                        dataIndex: 'fulfillmentStatus',
                                        key: 'fulfillmentStatus',
                                        render: (_: any, record: Order) => {
                                            const status = record.fulfillmentStatus || record.fulfillment_status;
                                            return <Tag color={fulfillmentColors[status || '']}>{status || '-'}</Tag>;
                                        },
                                    },
                                    {
                                        title: 'Payment Status',
                                        dataIndex: 'paymentStatus',
                                        key: 'paymentStatus',
                                        render: (status: string) => (
                                            <Tag color={status === 'paid' ? 'green' : 'orange'}>
                                                {status || 'pending'}
                                            </Tag>
                                        ),
                                    },
                                    {
                                        title: 'Total',
                                        dataIndex: 'total',
                                        key: 'total',
                                        render: (total: any) => `$${Number(total ?? 0).toFixed(2)}`,
                                    },
                                    {
                                        title: 'Items',
                                        key: 'items',
                                        render: (_: any, record: Order) => (
                                            <div>
                                                {record.items?.length || 0} item(s)
                                            </div>
                                        ),
                                    },
                                    {
                                        title: 'Date',
                                        key: 'createdAt',
                                        render: (_: any, record: Order) => {
                                            const date = record.createdAt || record.created_at;
                                            return date ? new Date(date).toLocaleDateString() : '-';
                                        },
                                    },
                                    {
                                        title: 'Actions',
                                        key: 'actions',
                                        render: (_: any, record: Order) => (
                                            <Button
                                                type="link"
                                                icon={<EyeOutlined />}
                                                onClick={() => handleViewOrder(record)}
                                            >
                                                View Details
                                            </Button>
                                        ),
                                    },
                                ]}
                                pagination={{ pageSize: 10 }}
                            />
                        ) : (
                            <Empty description="No orders found" />
                        )}
                    </Card>
                ) : (
                    <Card>
                        <Empty description="Please login to view your orders">
                            <Link to="/login">
                                <Button type="primary">Login</Button>
                            </Link>
                        </Empty>
                    </Card>
                )}

                <OrderDetailsModal
                    order={selectedOrder}
                    visible={modalVisible}
                    onClose={() => {
                        setModalVisible(false);
                        setSelectedOrder(null);
                    }}
                />
            </Content>
        </Layout>
    );
};

export default UserOrdersPage;

