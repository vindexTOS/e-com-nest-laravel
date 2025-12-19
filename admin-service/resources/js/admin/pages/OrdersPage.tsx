import React, { useEffect, useState } from 'react';
import { Layout, Table, Button, Space, Input, Select, Card, Modal, Form, message, Tag, Popconfirm, DatePicker, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, UndoOutlined, CheckCircleOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { ordersApi, Order } from '../../api';
import AdminLayout from '../components/AdminLayout';
import dayjs from 'dayjs';

const { Content } = Layout;
const { RangePicker } = DatePicker;
const { Option } = Select;

const OrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
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

    useEffect(() => {
        loadOrders();
    }, [filters, pagination.current]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const response = await ordersApi.getAll({
                ...filters,
                limit: pagination.pageSize,
            });
            setOrders(response.data.data || []);
            setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
        } catch (error) {
            message.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (order: Order) => {
        setEditingOrder(order);
        form.setFieldsValue(order);
        setModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await ordersApi.delete(id);
            message.success('Order deleted successfully');
            loadOrders();
        } catch (error) {
            message.error('Failed to delete order');
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await ordersApi.restore(id);
            message.success('Order restored successfully');
            loadOrders();
        } catch (error) {
            message.error('Failed to restore order');
        }
    };

    const handleFulfill = async (id: string) => {
        try {
            await ordersApi.fulfill(id);
            message.success('Order fulfilled successfully');
            loadOrders();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to fulfill order');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            await ordersApi.update(editingOrder!.id, values);
            message.success('Order updated successfully');
            setModalVisible(false);
            form.resetFields();
            loadOrders();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleExport = async () => {
        try {
            const blob = await ordersApi.export('csv');
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            message.success('Export started');
        } catch (error) {
            message.error('Failed to export orders');
        }
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
            render: (total: number) => `$${total.toFixed(2)}`,
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
                                onPressEnter={loadOrders}
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
                            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
                        }}
                        expandable={{
                            expandedRowRender: (record) => (
                                <div>
                                    <p><strong>Items:</strong></p>
                                    <ul>
                                        {record.items?.map((item: any) => (
                                            <li key={item.id}>
                                                {item.product_name} x{item.quantity} - ${item.total_price.toFixed(2)}
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

