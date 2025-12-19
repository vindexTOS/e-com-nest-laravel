import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Input, Select, Modal, Form, message, Tag, Popconfirm, Row, Col, Card, InputNumber, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DatabaseOutlined } from '@ant-design/icons';
import { usersApi, seedersApi, User } from '../../api';

const { Option } = Select;

interface UserManagementProps {
    onClose?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form] = Form.useForm();
    const [filters, setFilters] = useState({ search: '', role: '', is_active: undefined });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
    const [seeding, setSeeding] = useState(false);
    const [seedCount, setSeedCount] = useState(10);

    useEffect(() => {
        loadUsers();
    }, [filters, pagination.current]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await usersApi.getAll({
                ...filters,
                per_page: pagination.pageSize,
            });
            setUsers(response.data.data || []);
            setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
        } catch (error) {
            message.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

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

    const handleDelete = async (id: string) => {
        try {
            await usersApi.delete(id);
            message.success('User deleted successfully');
            loadUsers();
        } catch (error) {
            message.error('Failed to delete user');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            if (editingUser) {
                await usersApi.update(editingUser.id, values);
                message.success('User updated successfully');
            } else {
                await usersApi.create(values);
                message.success('User created successfully');
            }

            setModalVisible(false);
            form.resetFields();
            loadUsers();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await seedersApi.seedUsers(seedCount);
            message.success(`Successfully seeded ${seedCount} users!`);
            loadUsers();
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
                        onPressEnter={loadUsers}
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
                        value={filters.is_active !== undefined ? filters.is_active.toString() : undefined}
                        onChange={(value) => setFilters({ ...filters, is_active: value !== undefined ? value === 'true' : undefined })}
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
                    <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default UserManagement;

