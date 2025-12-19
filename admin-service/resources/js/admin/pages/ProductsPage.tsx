import React, { useEffect, useState } from 'react';
import { Layout, Table, Button, Space, Input, Select, Card, Modal, Form, Upload, message, Tag, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UndoOutlined, UploadOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { productsApi, categoriesApi, Product, Category } from '../../api';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const { Content } = Layout;
const { Option } = Select;

const ProductsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form] = Form.useForm();
    const [filters, setFilters] = useState({ search: '', status: '', category_id: '', trashed: false });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });

    useEffect(() => {
        loadCategories();
        loadProducts();
    }, [filters, pagination.current]);

    const loadCategories = async () => {
        try {
            const response = await categoriesApi.getAll({ root_only: true });
            setCategories(response.data.data || []);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const response = await productsApi.getAll({
                ...filters,
                per_page: pagination.pageSize,
            });
            setProducts(response.data.data || []);
            setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
        } catch (error) {
            message.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingProduct(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        form.setFieldsValue(product);
        setModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await productsApi.delete(id);
            message.success('Product deleted successfully');
            loadProducts();
        } catch (error) {
            message.error('Failed to delete product');
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await productsApi.restore(id);
            message.success('Product restored successfully');
            loadProducts();
        } catch (error) {
            message.error('Failed to restore product');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            const formData = new FormData();
            Object.keys(values).forEach(key => {
                if (key !== 'image' && values[key] !== undefined) {
                    formData.append(key, values[key]);
                }
            });

            if (values.image && values.image.file) {
                formData.append('image', values.image.file.originFileObj || values.image.file);
            }

            if (editingProduct) {
                await productsApi.update(editingProduct.id, formData);
                message.success('Product updated successfully');
            } else {
                await productsApi.create(formData);
                message.success('Product created successfully');
            }

            setModalVisible(false);
            form.resetFields();
            loadProducts();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleImport = async (file: File) => {
        try {
            await productsApi.import(file);
            message.success('Import queued successfully');
            loadProducts();
        } catch (error) {
            message.error('Failed to import products');
        }
    };

    const handleExport = async () => {
        try {
            const blob = await productsApi.export();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            message.success('Export started');
        } catch (error) {
            message.error('Failed to export products');
        }
    };

    const columns = [
        {
            title: 'Image',
            dataIndex: 'image',
            key: 'image',
            render: (image: string) => image ? <img src={image} alt="" style={{ width: 50, height: 50, objectFit: 'cover' }} /> : '-',
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'SKU',
            dataIndex: 'sku',
            key: 'sku',
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: (price: number) => `$${price.toFixed(2)}`,
        },
        {
            title: 'Stock',
            dataIndex: 'stock',
            key: 'stock',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, string> = { active: 'green', draft: 'orange', archived: 'red' };
                return <Tag color={colors[status]}>{status}</Tag>;
            },
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (category: any) => category?.name || '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Product) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    {record.deleted_at ? (
                        <Popconfirm title="Restore this product?" onConfirm={() => handleRestore(record.id)}>
                            <Button icon={<UndoOutlined />} />
                        </Popconfirm>
                    ) : (
                        <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(record.id)}>
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
                                placeholder="Search products"
                                prefix={<SearchOutlined />}
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onPressEnter={loadProducts}
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
                                <Option value="active">Active</Option>
                                <Option value="draft">Draft</Option>
                                <Option value="archived">Archived</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Select
                                placeholder="Category"
                                allowClear
                                value={filters.category_id || undefined}
                                onChange={(value) => setFilters({ ...filters, category_id: value || '' })}
                                style={{ width: '100%' }}
                            >
                                {categories.map(cat => (
                                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={10}>
                            <Space>
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                                    Add Product
                                </Button>
                                <Upload
                                    accept=".csv"
                                    beforeUpload={(file) => {
                                        handleImport(file);
                                        return false;
                                    }}
                                    showUploadList={false}
                                >
                                    <Button icon={<UploadOutlined />}>Import</Button>
                                </Upload>
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
                        dataSource={products}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            ...pagination,
                            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
                        }}
                    />
                </Card>

                <Modal
                    title={editingProduct ? 'Edit Product' : 'Create Product'}
                    open={modalVisible}
                    onCancel={() => {
                        setModalVisible(false);
                        form.resetFields();
                    }}
                    onOk={() => form.submit()}
                    width={800}
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="description" label="Description">
                            <Input.TextArea rows={4} />
                        </Form.Item>
                        <Form.Item name="image" label="Image" valuePropName="file">
                            <Upload listType="picture" beforeUpload={() => false}>
                                <Button icon={<UploadOutlined />}>Upload</Button>
                            </Upload>
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="price" label="Price" rules={[{ required: true, type: 'number' }]}>
                                    <Input type="number" step="0.01" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="stock" label="Stock" rules={[{ type: 'number' }]}>
                                    <Input type="number" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="status" label="Status">
                                    <Select>
                                        <Option value="draft">Draft</Option>
                                        <Option value="active">Active</Option>
                                        <Option value="archived">Archived</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="category_id" label="Category">
                            <Select allowClear>
                                {categories.map(cat => (
                                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>
            </Content>
        </AdminLayout>
    );
};

export default ProductsPage;

