import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Space, Input, Select, Modal, Form, message, Tag, Popconfirm, Row, Col, Card, InputNumber, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nestjsUserApi } from '../../api';
import { usersGql, seedersGql } from '../../graphql';
import { User } from '../../types';
import { io, Socket } from 'socket.io-client';
const { Option } = Select;

interface UserManagementProps {
    onClose?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = () => {
    const queryClient = useQueryClient();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form] = Form.useForm();
    const [filters, setFilters] = useState<{ search: string; role: string; is_active?: boolean }>({
        search: '',
        role: '',
        is_active: undefined,
    });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
    const [seeding, setSeeding] = useState(false);
    const [seedCount, setSeedCount] = useState(10);
    const socketRef = useRef<Socket | null>(null);

    const usersQuery = useQuery({
        queryKey: ['users', 'management', filters, pagination.current, pagination.pageSize],
        queryFn: async () => {
            const response = await nestjsUserApi.getUsers({ page: pagination.current, limit: pagination.pageSize });
            const body: any = response;
            const list = Array.isArray(body?.data) ? body.data : Array.isArray(body?.data?.data) ? body.data.data : [];
            const total = body?.total ?? body?.data?.total ?? list.length ?? 0;
            return { list, total };
        },
        keepPreviousData: true,
    });
    const users = usersQuery.data?.list || [];
    const loading = usersQuery.isFetching;
    const total = usersQuery.data?.total ?? pagination.total;

    useEffect(() => {
        const envUrl = (import.meta as any).env?.VITE_SOCKET_URL;
        const defaultUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const socketUrl = (envUrl || defaultUrl).replace(/\/+$/, '');
        const socket = io(`${socketUrl}/ws`, {
            path: '/socket.io',
            transports: ['websocket'],
        });
        socketRef.current = socket;

        const handleUsersUpdated = () => {
            queryClient.refetchQueries({ queryKey: ['users'] });
        };

        socket.on('connect', () => {
            // Connection established
        });
        socket.on('users:updated', handleUsersUpdated);
        socket.on('connect_error', (err) => {
            console.error('Socket connection error', err);
        });

        return () => {
            socket.off('users:updated', handleUsersUpdated);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [queryClient]);

    const handleCreate = () => {
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true });
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
            await queryClient.refetchQueries({ queryKey: ['users'] });
        },
        onError: (error) => {
            console.error('[UserManagement] delete failed', error);
            message.error('Failed to delete user');
        },
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
            await queryClient.refetchQueries({ queryKey: ['users'] });
        },
        onError: (error: any) => message.error(error.response?.data?.message || 'Operation failed'),
    });

    const handleDelete = (id: string) => deleteUser.mutate(id);
    const handleSubmit = (values: any) => saveUser.mutate({ id: editingUser?.id, values });

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await seedersGql.seedUsers(seedCount);
            message.success(`Successfully seeded ${seedCount} users!`);
            await queryClient.refetchQueries({ queryKey: ['users'] });
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to seed users');
        } finally {
            setSeeding(false);
        }
    };

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
                    <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record.id)}>
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={8}>
                    <Input
                        placeholder="Search users"
                        prefix={<SearchOutlined />}
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        onPressEnter={() => usersQuery.refetch()}
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
                <Col xs={24} sm={12} md={4}>
                    <Select
                        placeholder="Status"
                        allowClear
                        value={filters.is_active !== undefined ? String(filters.is_active) : undefined}
                        onChange={(value) =>
                            setFilters({
                                ...filters,
                                is_active: value === undefined ? undefined : value === 'true',
                            })
                        }
                        style={{ width: '100%' }}
                    >
                        <Option value="true">Active</Option>
                        <Option value="false">Inactive</Option>
                    </Select>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                            Add User
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={8}>
                    <Space>
                        <InputNumber
                            min={1}
                            max={1000}
                            value={seedCount}
                            onChange={(value) => setSeedCount(value || 10)}
                            style={{ width: 150 }}
                        />
                        <Button 
                            icon={<DatabaseOutlined />}
                            loading={seeding}
                            onClick={handleSeed}
                        >
                            Seed Users
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
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} users`,
                    onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
                }}
            />

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
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default UserManagement;

