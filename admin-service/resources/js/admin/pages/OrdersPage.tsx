import React, { useEffect, useRef, useState } from 'react';
import { Layout, Table, Button, Space, Input, Select, Card, Modal, Form, message, Tag, Popconfirm, DatePicker, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, UndoOutlined, CheckCircleOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersGql } from '../../graphql';
import { io, Socket } from 'socket.io-client';
import AdminLayout from '../components/AdminLayout';
import dayjs from 'dayjs';

const { Content } = Layout;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface Order {
    id: string;
    order_number?: string;
    orderNumber?: string;
    user?: { email?: string };
    status?: string;
    fulfillment_status?: string;
    fulfillmentStatus?: string;
    total?: number;
    created_at?: string;
    createdAt?: string;
    deleted_at?: string;
    deletedAt?: string;
    items?: any[];
}

const OrdersPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [form] = Form.useForm();
    const [filters, setFilters] = useState({
        status: '',
        fulfillment_status: '',
        order_number: '',
        date_from: '',
        date_to: '',
        trashed: false,
    });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const requestOrders = (emitFilters = filters, emitPagination = pagination) => {
        if (!socketRef.current) return;
        setLoading(true);
        socketRef.current.emit('orders:get', {
            status: emitFilters.status || undefined,
            fulfillmentStatus: emitFilters.fulfillment_status || undefined,
            orderNumber: emitFilters.order_number || undefined,
            page: emitPagination.current,
            limit: emitPagination.pageSize,
            withDeleted: emitFilters.trashed || undefined,
        });
    };

    useEffect(() => {
        const envUrl = (import.meta as any).env?.VITE_SOCKET_URL;
        const defaultUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const socketUrl = (envUrl || defaultUrl).replace(/\/+$/, '');
        const socket = io(`${socketUrl}/ws`, {
            path: '/socket.io',
            transports: ['websocket'],
        });
        socketRef.current = socket;

        const handleOrdersList = (payload: { success?: boolean; data?: Order[]; total?: number }) => {
            if (payload.success !== false) {
                const normalizedOrders = (payload?.data || []).map(order => ({
                    ...order,
                    order_number: order.order_number || order.orderNumber,
                    fulfillment_status: order.fulfillment_status || order.fulfillmentStatus,
                    created_at: order.created_at || order.createdAt,
                    deleted_at: order.deleted_at || order.deletedAt,
                }));
                setOrders(normalizedOrders);
                setPagination(prev => ({ ...prev, total: payload?.total ?? prev.total }));
            }
            setLoading(false);
        };

        const handleOrderUpdated = () => {
            requestOrders();
        };

        socket.on('connect', () => {
            requestOrders();
        });
        socket.on('orders:list', handleOrdersList);
        socket.on('orders:updated', handleOrderUpdated);
        socket.on('connect_error', (err) => {
            console.error('Socket connection error', err);
            setLoading(false);
        });

        return () => {
            socket.off('orders:list', handleOrdersList);
            socket.off('orders:updated', handleOrderUpdated);
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    useEffect(() => {
        requestOrders();
    }, [filters, pagination.current, pagination.pageSize]);

    const handleEdit = (order: Order) => {
        setEditingOrder(order);
        form.setFieldsValue({
            status: order.status,
            fulfillment_status: order.fulfillment_status,
        });
        setModalVisible(true);
    };

    const deleteOrder = useMutation({
        mutationFn: (id: string) => ordersGql.delete(id),
        onSuccess: async () => {
            message.success('Order deleted successfully');
            requestOrders();
        },
        onError: () => message.error('Failed to delete order'),
    });

    const restoreOrder = useMutation({
        mutationFn: (id: string) => ordersGql.restore(id),
        onSuccess: async () => {
            message.success('Order restored successfully');
            requestOrders();
        },
        onError: () => message.error('Failed to restore order'),
    });

    const fulfillOrder = useMutation({
        mutationFn: (id: string) => ordersGql.fulfill(id),
        onSuccess: async () => {
            message.success('Order fulfilled successfully');
            requestOrders();
        },
        onError: (error: any) => message.error(error.response?.data?.message || 'Failed to fulfill order'),
    });

    const updateOrder = useMutation({
        mutationFn: ({ id, values }: { id: string; values: any }) => ordersGql.update(id, values),
        onSuccess: async () => {
            message.success('Order updated successfully');
            setModalVisible(false);
            form.resetFields();
            requestOrders();
        },
        onError: (error: any) => message.error(error.response?.data?.message || 'Operation failed'),
    });

    const handleDelete = (id: string) => deleteOrder.mutate(id);
    const handleRestore = (id: string) => restoreOrder.mutate(id);
    const handleFulfill = (id: string) => fulfillOrder.mutate(id);
    const handleSubmit = (values: any) => updateOrder.mutate({ id: editingOrder!.id, values });

    const handleExport = async () => {
        message.warning('Export is not available for the socket backend');
    };

    const columns = [
        {
            title: 'Order Number',
            dataIndex: 'order_number',
            key: 'order_number',
        },
        {
            title: 'User',
            dataIndex: 'user',
            key: 'user',
            render: (user: any) => user?.email || '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, string> = {
                    pending: 'orange',
                    processing: 'blue',
                    shipped: 'cyan',
                    delivered: 'green',
                    cancelled: 'red',
                };
                return <Tag color={colors[status]}>{status}</Tag>;
            },
        },
        {
            title: 'Fulfillment',
            dataIndex: 'fulfillment_status',
            key: 'fulfillment_status',
            render: (status: string) => {
                const colors: Record<string, string> = {
                    unfulfilled: 'red',
                    partial: 'orange',
                    fulfilled: 'green',
                };
                return <Tag color={colors[status]}>{status}</Tag>;
            },
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (total: any) => `$${Number(total ?? 0).toFixed(2)}`,
        },
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Order) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    {record.status === 'processing' && record.fulfillment_status !== 'fulfilled' && (
                        <Popconfirm title="Fulfill this order?" onConfirm={() => handleFulfill(record.id)}>
                            <Button icon={<CheckCircleOutlined />} type="primary">Fulfill</Button>
                        </Popconfirm>
                    )}
                    {record.deleted_at ? (
                        <Popconfirm title="Restore this order?" onConfirm={() => handleRestore(record.id)}>
                            <Button icon={<UndoOutlined />} />
                        </Popconfirm>
                    ) : (
                        <Popconfirm title="Delete this order?" onConfirm={() => handleDelete(record.id)}>
                            <Button danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <AdminLayout>
            <Content style={{ padding: '24px', background: '#f0f2f5' }}>
                <Card>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                        <Col xs={24} sm={12} md={6}>
                            <Input
                                placeholder="Search by order number"
                                prefix={<SearchOutlined />}
                                value={filters.order_number}
                                onChange={(e) => setFilters({ ...filters, order_number: e.target.value })}
                                onPressEnter={() => requestOrders()}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Select
                                placeholder="Status"
                                allowClear
                                value={filters.status || undefined}
                                onChange={(value) => setFilters({ ...filters, status: value || '' })}
                                style={{ width: '100%' }}
                            >
                                <Option value="pending">Pending</Option>
                                <Option value="processing">Processing</Option>
                                <Option value="shipped">Shipped</Option>
                                <Option value="delivered">Delivered</Option>
                                <Option value="cancelled">Cancelled</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Select
                                placeholder="Fulfillment"
                                allowClear
                                value={filters.fulfillment_status || undefined}
                                onChange={(value) => setFilters({ ...filters, fulfillment_status: value || '' })}
                                style={{ width: '100%' }}
                            >
                                <Option value="unfulfilled">Unfulfilled</Option>
                                <Option value="partial">Partial</Option>
                                <Option value="fulfilled">Fulfilled</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <RangePicker
                                style={{ width: '100%' }}
                                onChange={(dates) => {
                                    if (dates) {
                                        setFilters({
                                            ...filters,
                                            date_from: dates[0]?.format('YYYY-MM-DD') || '',
                                            date_to: dates[1]?.format('YYYY-MM-DD') || '',
                                        });
                                    } else {
                                        setFilters({ ...filters, date_from: '', date_to: '' });
                                    }
                                }}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Space>
                                <Button icon={<DownloadOutlined />} onClick={handleExport}>
                                    Export
                                </Button>
                                <Button onClick={() => setFilters({ ...filters, trashed: !filters.trashed })}>
                                    {filters.trashed ? 'Show Active' : 'Show Deleted'}
                                </Button>
                            </Space>
                        </Col>
                    </Row>

                    <Table
                        columns={columns}
                        dataSource={orders}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            ...pagination,
                            total: pagination.total,
                            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
                        }}
                        expandable={{
                            expandedRowRender: (record) => (
                                <div>
                                    <p><strong>Items:</strong></p>
                                    <ul>
                                        {record.items?.map((item: any) => (
                                            <li key={item.id}>
                                                {item.product_name || item.productName} x{item.quantity} - ${Number(item.total_price || item.totalPrice || 0).toFixed(2)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ),
                        }}
                    />
                </Card>

                <Modal
                    title="Edit Order"
                    open={modalVisible}
                    onCancel={() => {
                        setModalVisible(false);
                        form.resetFields();
                    }}
                    onOk={() => form.submit()}
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item name="status" label="Status">
                            <Select>
                                <Option value="pending">Pending</Option>
                                <Option value="processing">Processing</Option>
                                <Option value="shipped">Shipped</Option>
                                <Option value="delivered">Delivered</Option>
                                <Option value="cancelled">Cancelled</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="fulfillment_status" label="Fulfillment Status">
                            <Select>
                                <Option value="unfulfilled">Unfulfilled</Option>
                                <Option value="partial">Partial</Option>
                                <Option value="fulfilled">Fulfilled</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="payment_status" label="Payment Status">
                            <Input />
                        </Form.Item>
                        <Form.Item name="notes" label="Notes">
                            <Input.TextArea rows={4} />
                        </Form.Item>
                    </Form>
                </Modal>
            </Content>
        </AdminLayout>
    );
};

export default OrdersPage;
