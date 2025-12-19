import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Input, Modal, Form, Upload, message, Tag, Popconfirm, Row, Col, Card, TreeSelect, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UndoOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import { categoriesApi, Category } from '../../api';

const { TextArea } = Input;

interface CategoryManagementProps {
    onClose?: () => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ onClose }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [form] = Form.useForm();
    const [filters, setFilters] = useState({ search: '', trashed: false });

    useEffect(() => {
        loadCategories();
    }, [filters]);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const response = await categoriesApi.getAll(filters);
            setCategories(response.data.data || []);
        } catch (error) {
            message.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingCategory(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        form.setFieldsValue(category);
        setModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await categoriesApi.delete(id);
            message.success('Category deleted successfully');
            loadCategories();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to delete category');
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await categoriesApi.restore(id);
            message.success('Category restored successfully');
            loadCategories();
        } catch (error) {
            message.error('Failed to restore category');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            const formData = new FormData();
            Object.keys(values).forEach(key => {
                if (key !== 'image' && values[key] !== undefined && values[key] !== null) {
                    if (key === 'is_active') {
                        formData.append(key, values[key] ? '1' : '0');
                    } else {
                        formData.append(key, values[key]);
                    }
                }
            });

            if (values.image && values.image.file) {
                formData.append('image', values.image.file.originFileObj || values.image.file);
            }

            if (editingCategory) {
                await categoriesApi.update(editingCategory.id, formData);
                message.success('Category updated successfully');
            } else {
                await categoriesApi.create(formData);
                message.success('Category created successfully');
            }

            setModalVisible(false);
            form.resetFields();
            loadCategories();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const buildTreeData = (cats: Category[]): any[] => {
        return cats
            .filter(cat => !cat.parent_id && !cat.deleted_at)
            .map(cat => ({
                title: cat.name,
                value: cat.id,
                children: cats
                    .filter(child => child.parent_id === cat.id && !child.deleted_at)
                    .map(child => ({ title: child.name, value: child.id })),
            }));
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Slug',
            dataIndex: 'slug',
            key: 'slug',
        },
        {
            title: 'Parent',
            dataIndex: 'parent',
            key: 'parent',
            render: (parent: Category) => parent?.name || '-',
        },
        {
            title: 'Active',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag>,
        },
        {
            title: 'Sort Order',
            dataIndex: 'sort_order',
            key: 'sort_order',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Category) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    {record.deleted_at ? (
                        <Popconfirm title="Restore this category?" onConfirm={() => handleRestore(record.id)}>
                            <Button icon={<UndoOutlined />} />
                        </Popconfirm>
                    ) : (
                        <Popconfirm title="Delete this category?" onConfirm={() => handleDelete(record.id)}>
                            <Button danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <Card>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={12}>
                    <Input
                        placeholder="Search categories"
                        prefix={<SearchOutlined />}
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        onPressEnter={loadCategories}
                    />
                </Col>
                <Col xs={24} sm={12} md={12}>
                    <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                            Add Category
                        </Button>
                        <Button onClick={() => setFilters({ ...filters, trashed: !filters.trashed })}>
                            {filters.trashed ? 'Show Active' : 'Show Deleted'}
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={categories}
                loading={loading}
                rowKey="id"
                pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} categories`,
                }}
            />

            <Modal
                title={editingCategory ? 'Edit Category' : 'Create Category'}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                }}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={4} />
                    </Form.Item>
                    <Form.Item name="parent_id" label="Parent Category">
                        <TreeSelect
                            treeData={buildTreeData(categories.filter(c => c.id !== editingCategory?.id))}
                            placeholder="Select parent category"
                            allowClear
                        />
                    </Form.Item>
                    <Form.Item name="image" label="Image" valuePropName="file">
                        <Upload listType="picture" beforeUpload={() => false}>
                            <Button icon={<UploadOutlined />}>Upload</Button>
                        </Upload>
                    </Form.Item>
                    <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
                        <Switch />
                    </Form.Item>
                    <Form.Item name="sort_order" label="Sort Order">
                        <Input type="number" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default CategoryManagement;

