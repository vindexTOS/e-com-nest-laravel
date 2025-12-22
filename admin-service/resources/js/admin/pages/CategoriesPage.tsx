import React, { useState } from 'react';
import { Layout, Table, Button, Space, Input, Modal, Form, Upload, message, Tag, Popconfirm, Card, Switch, TreeSelect } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UndoOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Category } from '../../api';
import { categoriesGql } from '../../graphql';
import AdminLayout from '../components/AdminLayout';

const { Content } = Layout;

const CategoriesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [form] = Form.useForm();
    const [filters, setFilters] = useState({ search: '', trashed: false });

    const categoriesQuery = useQuery({
        queryKey: ['categories', filters],
        queryFn: async (): Promise<Category[]> => {
            const response = await categoriesGql.getAll({
                search: filters.search || undefined,
                page: 1,
                limit: 500,
                parentId: undefined,
            });
            return response.data || [];
        },
        placeholderData: keepPreviousData,
    });
    const categories = (categoriesQuery.data as Category[]) || [];

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

    const deleteCategory = useMutation({
        mutationFn: (id: string) => categoriesGql.delete(id),
        onSuccess: async () => {
            message.success('Category deleted successfully');
            await queryClient.refetchQueries({ queryKey: ['categories'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to delete category');
        },
    });

    const restoreCategory = useMutation({
        mutationFn: (id: string) => categoriesGql.restore(id),
        onSuccess: async () => {
            message.success('Category restored successfully');
            await queryClient.refetchQueries({ queryKey: ['categories'] });
        },
        onError: () => {
            message.error('Failed to restore category');
        },
    });

    const saveCategory = useMutation({
        mutationFn: async ({ id, values }: { id?: string; values: any }) => {
            const imageFile = values.image?.file?.originFileObj || values.image?.file;
            const input = {
                name: values.name,
                description: values.description,
                parent_id: values.parent_id || null,
                is_active: values.is_active ?? true,
                sort_order:
                    values.sort_order === undefined || values.sort_order === null || values.sort_order === ''
                        ? null
                        : Number(values.sort_order),
                meta_title: values.meta_title,
                meta_description: values.meta_description,
                image: imageFile || null,
            };
            if (id) return categoriesGql.update(id, input);
            return categoriesGql.create(input);
        },
        onSuccess: async (_res, vars) => {
            message.success(vars.id ? 'Category updated successfully' : 'Category created successfully');
            setModalVisible(false);
            setEditingCategory(null);
            form.resetFields();
            await queryClient.refetchQueries({ queryKey: ['categories'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Operation failed');
        },
    });

    const handleDelete = (id: string) => deleteCategory.mutate(id);
    const handleRestore = (id: string) => restoreCategory.mutate(id);
    const handleSubmit = (values: any) => saveCategory.mutate({ id: editingCategory?.id, values });

    const buildTreeData = (cats: Category[] = []): any[] =>
        Array.isArray(cats)
            ? cats
                  .filter(cat => !cat.parent_id)
                  .map(cat => ({
                      title: cat.name,
                      value: cat.id,
                      children: cats
                          .filter(child => child.parent_id === cat.id)
                          .map(child => ({ title: child.name, value: child.id })),
                  }))
            : [];

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
        <AdminLayout>
            <Content style={{ padding: '24px', background: '#f0f2f5' }}>
                <Card>
                    <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                        <Input
                            placeholder="Search categories"
                            prefix={<SearchOutlined />}
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onPressEnter={() => categoriesQuery.refetch()}
                            style={{ width: 300 }}
                        />
                        <Space>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                                Add Category
                            </Button>
                            <Button onClick={() => setFilters({ ...filters, trashed: !filters.trashed })}>
                                {filters.trashed ? 'Show Active' : 'Show Deleted'}
                            </Button>
                        </Space>
                    </Space>

                    <Table
                        columns={columns}
                        dataSource={categories}
                        loading={categoriesQuery.isFetching}
                        rowKey="id"
                    />
                </Card>

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
                            <Input.TextArea rows={4} />
                        </Form.Item>
                        <Form.Item name="parent_id" label="Parent Category">
                            <TreeSelect
                                treeData={buildTreeData(categories.filter(c => !c.deleted_at && c.id !== editingCategory?.id))}
                                placeholder="Select parent category"
                                allowClear
                            />
                        </Form.Item>
                        <Form.Item name="image" label="Image" valuePropName="file">
                            <Upload listType="picture" beforeUpload={() => false}>
                                <Button icon={<UploadOutlined />}>Upload</Button>
                            </Upload>
                        </Form.Item>
                        <Form.Item name="is_active" label="Active" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                        <Form.Item name="sort_order" label="Sort Order">
                            <Input type="number" />
                        </Form.Item>
                    </Form>
                </Modal>
            </Content>
        </AdminLayout>
    );
};

export default CategoriesPage;

