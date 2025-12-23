import React, { useEffect, useRef, useState } from 'react';
import { Layout, Table, Button, Space, Input, Select, Card, Modal, Form, message, Tag, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UndoOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersGql } from '../../graphql';
import { User } from '../../types';
import { io, Socket } from 'socket.io-client';
import AdminLayout from '../components/AdminLayout';

const { Content } = Layout;
const { Option } = Select;

const UsersPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form] = Form.useForm();
    const [filters, setFilters] = useState({ search: '', role: '', is_active: undefined, showDeleted: false });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const total = pagination.total;

    const requestUsers = (emitFilters = filters, emitPagination = pagination) => {
        if (!socketRef.current) return;
        setLoading(true);
        socketRef.current.emit('users:get', {
            search: emitFilters.search || undefined,
            role: emitFilters.role || undefined,
            page: emitPagination.current,
            limit: emitPagination.pageSize,
            withDeleted: emitFilters.showDeleted || undefined,
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

        const handleUsersList = (payload: { data?: User[]; total?: number }) => {
            setUsers(Array.isArray(payload?.data) ? payload.data : []);
            setPagination(prev => ({ ...prev, total: payload?.total ?? prev.total }));
            setLoading(false);
        };

        const handleUsersUpdated = () => {
            requestUsers();
        };

        socket.on('connect', () => {
            requestUsers();
        });
        socket.on('users:list', handleUsersList);
        socket.on('users:updated', handleUsersUpdated);
        socket.on('connect_error', (err) => {
            console.error('Socket connection error', err);
            setLoading(false);
        });

        return () => {
            socket.off('users:list', handleUsersList);
            socket.off('users:updated', handleUsersUpdated);
            socket.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        requestUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, pagination.current, pagination.pageSize]);

    const handleCreate = () => {
        setEditingUser(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        form.setFieldsValue({ ...user, firstName: user.firstName, lastName: user.lastName });
        setModalVisible(true);
    };

    const deleteUser = useMutation({
        mutationFn: (id: string) => usersGql.delete(id),
        onSuccess: async () => {
            message.success('User deleted successfully');
            requestUsers();
        },
        onError: () => message.error('Failed to delete user'),
    });

    const restoreUser = useMutation({
        mutationFn: (id: string) => usersGql.restore(id),
        onSuccess: async () => {
            message.success('User restored successfully');
            requestUsers();
        },
        onError: () => message.error('Failed to restore user'),
    });

    const saveUser = useMutation({
        mutationFn: ({ id, values }: { id?: string; values: any }) => {
            if (id) return usersGql.update(id, values);
            return usersGql.create(values as any);
        },
        onSuccess: async (_res, vars) => {
            message.success(vars.id ? 'User updated successfully' : 'User created successfully');
            setModalVisible(false);
            setEditingUser(null);
            form.resetFields();
            requestUsers();
        },
        onError: (error: any) => message.error(error.response?.data?.message || 'Operation failed'),
    });

    const handleDelete = (id: string) => deleteUser.mutate(id);
    const handleRestore = (id: string) => restoreUser.mutate(id);
    const handleSubmit = (values: any) => saveUser.mutate({ id: editingUser?.id, values });

    const columns = [
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Name',
            key: 'name',
            render: (_: any, record: User) => `${record.firstName} ${record.lastName}`,
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => <Tag color={role === 'admin' ? 'red' : 'blue'}>{role}</Tag>,
        },
        {
            title: 'Active',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag>,
        },
        {
            title: 'Orders',
            dataIndex: 'ordersCount',
            key: 'ordersCount',
            render: (count: number) => count || 0,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: User) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    {(record as any).deletedAt || (record as any).deleted_at ? (
                        <Popconfirm title="Restore this user?" onConfirm={() => handleRestore(record.id)}>
                            <Button icon={<UndoOutlined />} />
                        </Popconfirm>
                    ) : (
                    <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record.id)}>
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
                        <Col xs={24} sm={12} md={8}>
                            <Input
                                placeholder="Search users"
                                prefix={<SearchOutlined />}
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onPressEnter={() => requestUsers()}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Select
                                placeholder="Role"
                                allowClear
                                value={filters.role || undefined}
                                onChange={(value) => setFilters({ ...filters, role: value || '' })}
                                style={{ width: '100%' }}
                            >
                                <Option value="customer">Customer</Option>
                                <Option value="admin">Admin</Option>
                            </Select>
                        </Col>
                  
                        <Col xs={24} sm={12} md={8}>
                            <Space>
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                                    Add User
                                </Button>
                                <Button onClick={() => setFilters({ ...filters, showDeleted: !filters.showDeleted })}>
                                    {filters.showDeleted ? 'Show Active' : 'Show Deleted'}
                                </Button>
                            </Space>
                        </Col>
                    </Row>

                    <Table
                        columns={columns}
                        dataSource={users}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            ...pagination,
                            total,
                            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
                        }}
                    />
                </Card>

                <Modal
                    title={editingUser ? 'Edit User' : 'Create User'}
                    open={modalVisible}
                    onCancel={() => {
                        setModalVisible(false);
                        form.resetFields();
                    }}
                    onOk={() => form.submit()}
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                            <Input />
                        </Form.Item>
                        {!editingUser && (
                            <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
                                <Input.Password />
                            </Form.Item>
                        )}
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="phone" label="Phone">
                            <Input />
                        </Form.Item>
                        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                            <Select>
                                <Option value="customer">Customer</Option>
                                <Option value="admin">Admin</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="isActive" label="Active" valuePropName="checked">
                            <input type="checkbox" defaultChecked />
                        </Form.Item>
                    </Form>
                </Modal>
            </Content>
        </AdminLayout>
    );
};

export default UsersPage;

