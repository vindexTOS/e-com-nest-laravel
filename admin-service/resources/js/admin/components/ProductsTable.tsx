import React, { useState } from 'react';
import { Table, Button, Space, Input, Select, Card, Modal, Form, Upload, message, Tag, Popconfirm, Row, Col, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UndoOutlined, UploadOutlined, DownloadOutlined, SearchOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { nestjsProductsApi } from '../../api';
import { productsGql, seedersGql, categoriesGql } from '../../graphql';
import type { ProductListResponse } from '../../api/nestjs/products.api';
import type { Product, Category } from '../../api';
import { getImageUrl } from '../../shared/utils/imageUtils';
import { exportToCSV } from '../../shared/utils/exportUtils';

const { Option } = Select;

const ProductsTable: React.FC = () => {
    const queryClient = useQueryClient();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form] = Form.useForm();
    const [filters, setFilters] = useState({ search: '', status: '', category_id: '', trashed: false });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 15 });
    const [seedCount, setSeedCount] = useState(10);
    const categoriesQuery = useQuery<Category[]>({
        queryKey: ['categories', 'root'],
        queryFn: async () => {
            const response = await categoriesGql.getAll({ page: 1, limit: 200, parentId: 'null' });
            return response.data || [];
        },
    });

    const productsQuery = useQuery({
        queryKey: ['products', filters, pagination.current, pagination.pageSize],
        queryFn: async (): Promise<ProductListResponse> => {
            const response = await nestjsProductsApi.getAll({
                search: filters.search || undefined,
                status: filters.status || undefined,
                categoryId: filters.category_id || undefined,
                limit: pagination.pageSize,
                page: pagination.current,
                trashed: filters.trashed ? 'true' : undefined,
            });
            return response.data;
        },
        placeholderData: keepPreviousData,
    });

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const saveProduct = useMutation({
        mutationFn: async ({ id, input }: { id?: string; input: any }) => {
            if (id) return productsGql.update(id, input);
            return productsGql.create(input);
        },
        onSuccess: async (_, variables) => {
            message.success(variables.id ? 'Product updated successfully' : 'Product created successfully');
            setModalVisible(false);
            setEditingProduct(null);
            form.resetFields();
            await delay(500);
            await queryClient.refetchQueries({ queryKey: ['products'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Operation failed');
        },
    });

    const deleteProduct = useMutation({
        mutationFn: (id: string) => productsGql.delete(id),
        onSuccess: async () => {
            message.success('Product deleted successfully');
            await delay(500);
            await queryClient.refetchQueries({ queryKey: ['products'] });
        },
        onError: () => message.error('Failed to delete product'),
    });

    const restoreProduct = useMutation({
        mutationFn: (id: string) => productsGql.restore(id),
        onSuccess: async () => {
            message.success('Product restored successfully');
            await delay(500);
            await queryClient.refetchQueries({ queryKey: ['products'] });
        },
        onError: () => message.error('Failed to restore product'),
    });

    const importProducts = useMutation({
        mutationFn: (file: File) => productsGql.importProducts(file),
        onSuccess: async () => {
            message.success('Import queued successfully');
            await queryClient.refetchQueries({ queryKey: ['products'] });
        },
        onError: () => message.error('Failed to import products'),
    });

    const seedProducts = useMutation({
        mutationFn: (count: number) => seedersGql.seedProducts(count),
        onSuccess: async (_response, count) => {
            message.success(`Seeded ${count} products`);
            await queryClient.refetchQueries({ queryKey: ['products'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to seed products');
        },
    });

    const queryData = productsQuery.data as ProductListResponse | undefined;
    const products = queryData?.data || [];
    const categories = categoriesQuery.data || [];
    const total = queryData?.total ?? 0;
    const loading = productsQuery.isFetching;
    const seeding = seedProducts.isPending;

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
        deleteProduct.mutate(id);
    };

    const handleRestore = async (id: string) => {
        restoreProduct.mutate(id);
    };

    const handleSubmit = async (values: any) => {
        const imageFile = values.image?.file?.originFileObj || values.image?.file;
        const input = {
            name: values.name,
            description: values.description,
            sku: values.sku,
            price: Number(values.price),
            compare_at_price: values.compare_at_price !== undefined && values.compare_at_price !== null ? Number(values.compare_at_price) : undefined,
            cost_price: values.cost_price !== undefined && values.cost_price !== null ? Number(values.cost_price) : undefined,
            stock: values.stock !== undefined && values.stock !== null ? Number(values.stock) : undefined,
            low_stock_threshold: values.low_stock_threshold !== undefined && values.low_stock_threshold !== null ? Number(values.low_stock_threshold) : undefined,
            weight: values.weight !== undefined && values.weight !== null ? Number(values.weight) : undefined,
            status: values.status,
            is_featured: values.is_featured ?? false,
            meta_title: values.meta_title,
            meta_description: values.meta_description,
            category_id: values.category_id || undefined,
            image: imageFile || null,
        };

        await saveProduct.mutateAsync({ id: editingProduct?.id, input });
    };

    const handleImport = async (file: File) => {
        await importProducts.mutateAsync(file);
    };

    const handleExport = async () => {
        try {
            const exportQueryData = productsQuery.data as ProductListResponse | undefined;
            if (!exportQueryData?.data || exportQueryData.data.length === 0) {
                message.warning('No products to export');
                return;
            }

            const products = exportQueryData.data;
            const exportData = products.map((product: any) => ({
                Name: product.name || '',
                SKU: product.sku || '',
                Description: product.description || '',
                Price: product.price || 0,
                Stock: product.stock || 0,
                Status: product.status || '',
                Category: product.category?.name || '',
                'Low Stock Threshold': product.lowStockThreshold || product.low_stock_threshold || 0,
                Weight: product.weight || '',
                'Compare At Price': product.compareAtPrice || product.compare_at_price || '',
                'Cost Price': product.costPrice || product.cost_price || '',
                Featured: product.isFeatured || product.is_featured ? 'Yes' : 'No',
            }));

            exportToCSV(exportData, `products_export_${new Date().toISOString().split('T')[0]}`, [
                'Name', 'SKU', 'Description', 'Price', 'Stock', 'Status', 'Category',
                'Low Stock Threshold', 'Weight', 'Compare At Price', 'Cost Price', 'Featured'
            ]);
            message.success('Products exported to CSV');
        } catch (error) {
            message.error('Failed to export products');
        }
    };

    const handleSeed = async () => {
        await seedProducts.mutateAsync(seedCount);
    };

    const columns = [
        {
            title: 'Image',
            dataIndex: 'image',
            key: 'image',
            render: (image: string) => image ? <img src={getImageUrl(image) || ''} alt="" style={{ width: 50, height: 50, objectFit: 'cover' }} /> : '-',
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
            render: (price: any) => {
                const num = Number(price ?? 0);
                return `$${isNaN(num) ? '0.00' : num.toFixed(2)}`;
            },
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
            render: (_: any, record: Product) => {
                const isDeleted = (record as any).deletedAt || record.deleted_at;
                return (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                        {isDeleted ? (
                        <Popconfirm title="Restore this product?" onConfirm={() => handleRestore(record.id)}>
                                <Button icon={<UndoOutlined />} type="primary">Restore</Button>
                        </Popconfirm>
                    ) : (
                        <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(record.id)}>
                            <Button danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
                );
            },
        },
    ];

    return (
        <>
            <Card>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}>
                        <Input
                            placeholder="Search products"
                            prefix={<SearchOutlined />}
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onPressEnter={() => productsQuery.refetch()}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                        <Select
                            placeholder="Status"
                            allowClear
                            value={filters.status || undefined}
                            onChange={(value) => {
                                setFilters({ ...filters, status: value || '' });
                                setPagination({ ...pagination, current: 1 });
                                productsQuery.refetch();
                            }}
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
                            onChange={(value) => {
                                setFilters({ ...filters, category_id: value || '' });
                                setPagination({ ...pagination, current: 1 });
                                productsQuery.refetch();
                            }}
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
                                Seed Products
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
                        total,
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
                            <Form.Item name="price" label="Price" >
                                <Input type="number" step="0.01" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="stock" label="Stock"  >
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
        </>
    );
};

export default ProductsTable;

