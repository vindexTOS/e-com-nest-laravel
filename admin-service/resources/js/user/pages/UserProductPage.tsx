import React, { useEffect, useState } from 'react';
import { Layout, Typography, Button, Card, Row, Col, Empty, message, Spin, Tag, Table, Input, Select, Pagination, Modal, Form, InputNumber } from 'antd';
import { ShoppingOutlined, UserOutlined, LoginOutlined, SearchOutlined, WalletOutlined, PlusOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ordersGql, categoriesGql, balanceGql } from '../../graphql';
import { nestjsOrdersApi } from '../../api';
import { getImageUrl } from '../../shared/utils/imageUtils';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

interface Category {
    id: string;
    name: string;
}

const UserProductsPage: React.FC = () => {
    const { logout, user, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState<any[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    
    // Balance state
    const [balance, setBalance] = useState<number>(0);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [addBalanceModalVisible, setAddBalanceModalVisible] = useState(false);
    const [addingBalance, setAddingBalance] = useState(false);
    const [balanceForm] = Form.useForm();
    
    // Filters and pagination
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [total, setTotal] = useState(0);

    // Redirect admin users to admin dashboard
    useEffect(() => {
        if (!loading && isAuthenticated && user?.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [isAuthenticated, user, loading, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    const loadBalance = async () => {
        if (!isAuthenticated) return;
        setBalanceLoading(true);
        try {
            const res = await balanceGql.getBalance();
            setBalance(res.balance);
        } catch (err) {
            console.error('Failed to load balance');
        } finally {
            setBalanceLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await categoriesGql.getAll({ page: 1, limit: 100 });
            setCategories(response.data || []);
        } catch (err) {
            console.error('Failed to load categories');
        }
    };

    const loadProducts = async (page = currentPage, limit = pageSize, searchTerm = search, catId = categoryId) => {
        setProductsLoading(true);
        try {
            const params: any = { 
                limit, 
                page,
                status: 'active',
            };
            if (searchTerm) params.search = searchTerm;
            if (catId) params.category_id = catId;
            
            const res = await axios.get('/api/gateway/products', { params });
            const body = res.data;
            const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
            setProducts(list);
            setTotal(body?.total || 0);
        } catch (err) {
            message.error('Failed to load products');
        } finally {
            setProductsLoading(false);
        }
    };

    const loadOrders = async () => {
        if (!isAuthenticated) return;
        setOrdersLoading(true);
        try {
            const res = await nestjsOrdersApi.getMyOrders({ limit: 100 });
            const list = Array.isArray(res?.data?.data) ? res.data.data : [];
            setOrders(list);
        } catch {
            message.error('Failed to load orders');
        } finally {
            setOrdersLoading(false);
        }
    };

    const handleOrder = async (productId: string, productPrice: number) => {
        if (!isAuthenticated || !user) {
            message.warning('Please login to order');
            return;
        }
        
        // Estimate total (price + 10% tax + $10 shipping)
        const estimatedTotal = productPrice * 1.1 + 10;
        
        if (balance < estimatedTotal) {
            message.error(`Insufficient balance. You need ~$${estimatedTotal.toFixed(2)} but have $${balance.toFixed(2)}. Please add funds.`);
            setAddBalanceModalVisible(true);
            return;
        }
        
        try {
            await ordersGql.create({
                user_id: user.id,
                items: [{ product_id: productId, quantity: 1 }],
            });
            message.success('Order placed successfully!');
            loadOrders();
            loadBalance(); // Refresh balance after order
        } catch (err: any) {
            const errorMsg = err?.message || err?.response?.data?.message || 'Order failed';
            if (errorMsg.includes('balance') || errorMsg.includes('Balance')) {
                message.error(errorMsg);
                setAddBalanceModalVisible(true);
            } else {
                message.error(errorMsg);
            }
        }
    };

    const handleAddBalance = async (values: any) => {
        setAddingBalance(true);
        try {
            const res = await balanceGql.addBalance({
                amount: values.amount,
                card_number: values.card_number,
                card_expiry: values.card_expiry,
                card_cvv: values.card_cvv,
            });
            message.success(res.message);
            setBalance(res.balance);
            setAddBalanceModalVisible(false);
            balanceForm.resetFields();
        } catch (err: any) {
            message.error(err?.message || 'Failed to add balance');
        } finally {
            setAddingBalance(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        loadProducts(1, pageSize, search, categoryId);
    };

    const handleCategoryChange = (value: string) => {
        setCategoryId(value || '');
        setCurrentPage(1);
        loadProducts(1, pageSize, search, value || '');
    };

    const handlePageChange = (page: number, size?: number) => {
        const newSize = size || pageSize;
        setCurrentPage(page);
        setPageSize(newSize);
        loadProducts(page, newSize, search, categoryId);
    };

    const handleClearFilters = () => {
        setSearch('');
        setCategoryId('');
        setCurrentPage(1);
        loadProducts(1, pageSize, '', '');
    };

    useEffect(() => {
        loadCategories();
        loadProducts();
    }, []);

    useEffect(() => {
        loadOrders();
        loadBalance();
    }, [isAuthenticated]);

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
                            {/* Balance Display */}
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 8,
                                background: '#f6ffed',
                                border: '1px solid #b7eb8f',
                                borderRadius: 6,
                                padding: '4px 12px'
                            }}>
                                <WalletOutlined style={{ color: '#52c41a' }} />
                                <Text strong style={{ color: '#52c41a' }}>
                                    {balanceLoading ? '...' : `$${balance.toFixed(2)}`}
                                </Text>
                                <Button 
                                    type="link" 
                                    size="small" 
                                    icon={<PlusOutlined />}
                                    onClick={() => setAddBalanceModalVisible(true)}
                                    style={{ padding: 0 }}
                                >
                                    Add
                                </Button>
                            </div>
                            <Link to="/orders">
                                <Button type="default" icon={<ShoppingOutlined />}>
                                    My Orders
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
                <Title level={2} style={{ marginBottom: 24 }}>Products</Title>
                
                {/* Filters */}
                <Card style={{ marginBottom: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Input
                                placeholder="Search products..."
                                prefix={<SearchOutlined />}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onPressEnter={handleSearch}
                                allowClear
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={4}>
                            <Select
                                placeholder="All Categories"
                                allowClear
                                value={categoryId || undefined}
                                onChange={handleCategoryChange}
                                style={{ width: '100%' }}
                            >
                                {categories.map(cat => (
                                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={4}>
                            <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
                                Search
                            </Button>
                            {(search || categoryId) && (
                                <Button style={{ marginLeft: 8 }} onClick={handleClearFilters}>
                                    Clear
                                </Button>
                            )}
                        </Col>
                        <Col xs={24} sm={12} md={4} lg={10} style={{ textAlign: 'right' }}>
                            <span style={{ color: '#666' }}>
                                {total} product{total !== 1 ? 's' : ''} found
                            </span>
                        </Col>
                    </Row>
                </Card>

                {/* Products Grid */}
                <Card>
                    {productsLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Spin size="large" />
                        </div>
                    ) : products.length ? (
                        <>
                        <Row gutter={[16, 16]}>
                                {products.map((p) => {
                                    const price = Number(p.price ?? 0);
                                    const estimatedTotal = price * 1.1 + 10;
                                    const canAfford = balance >= estimatedTotal;
                                    
                                    return (
                                <Col key={p.id} xs={24} sm={12} lg={8} xl={6}>
                                    <Card
                                        hoverable
                                        cover={
                                            p.image ? (
                                                <img src={getImageUrl(p.image) || ''} alt={p.name} style={{ height: 200, objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{
                                                    height: 200,
                                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#fff',
                                                            fontSize: 48
                                                }}>
                                                            <ShoppingOutlined />
                                                </div>
                                            )
                                        }
                                    >
                                        <Card.Meta
                                            title={p.name}
                                            description={
                                                <div>
                                                            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#667eea' }}>
                                                                ${price.toFixed(2)}
                                                            </div>
                                                            <div style={{ color: '#999', marginTop: 4 }}>SKU: {p.sku}</div>
                                                            {p.categoryName && (
                                                                <Tag color="blue" style={{ marginTop: 8 }}>{p.categoryName}</Tag>
                                                            )}
                                                            {'stock' in p && Number(p.stock) <= 5 && Number(p.stock) > 0 && (
                                                                <Tag color="orange" style={{ marginTop: 8 }}>Only {p.stock} left!</Tag>
                                                            )}
                                                            {'stock' in p && Number(p.stock) === 0 && (
                                                                <Tag color="red" style={{ marginTop: 8 }}>Out of Stock</Tag>
                                                            )}
                                                </div>
                                            }
                                        />
                                                {isAuthenticated ? (
                                                    'stock' in p && Number(p.stock) === 0 ? (
                                                        <Button block style={{ marginTop: 12 }} disabled>
                                                            Out of Stock
                                                        </Button>
                                                    ) : !canAfford ? (
                                                        <Button 
                                                            block 
                                                            style={{ marginTop: 12 }} 
                                                            type="default"
                                                            onClick={() => setAddBalanceModalVisible(true)}
                                                        >
                                                            Add Funds (~${estimatedTotal.toFixed(0)} needed)
                                                        </Button>
                                                    ) : (
                                                        <Button 
                                                            block 
                                                            style={{ marginTop: 12 }} 
                                                            type="primary" 
                                                            onClick={() => handleOrder(p.id, price)}
                                                        >
                                                            Order Now
                                                        </Button>
                                                    )
                                                ) : (
                                                    <Link to="/login">
                                                        <Button block style={{ marginTop: 12 }} type="default">
                                                            Login to Order
                                            </Button>
                                                    </Link>
                                        )}
                                    </Card>
                                </Col>
                                    );
                                })}
                        </Row>
                            
                            <div style={{ marginTop: 24, textAlign: 'center' }}>
                                <Pagination
                                    current={currentPage}
                                    pageSize={pageSize}
                                    total={total}
                                    onChange={handlePageChange}
                                    showSizeChanger
                                    showQuickJumper
                                    pageSizeOptions={['12', '24', '48', '96']}
                                    showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} products`}
                                />
                            </div>
                        </>
                    ) : (
                        <Empty 
                            description={
                                search || categoryId 
                                    ? "No products match your filters" 
                                    : "No products available"
                            }
                        >
                            {(search || categoryId) && (
                                <Button type="primary" onClick={handleClearFilters}>
                                    Clear Filters
                                </Button>
                            )}
                        </Empty>
                    )}
                </Card>

                {isAuthenticated && (
                    <Card style={{ marginTop: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Title level={3} style={{ margin: 0 }}>Recent Orders</Title>
                            <Link to="/orders">
                                <Button type="primary">View All Orders</Button>
                            </Link>
                        </div>
                        {ordersLoading ? (
                            <Spin />
                        ) : orders.length ? (
                            <Table
                                dataSource={orders.slice(0, 5)}
                                rowKey="id"
                                pagination={false}
                                columns={[
                                    {
                                        title: 'Order Number',
                                        dataIndex: 'orderNumber',
                                        key: 'orderNumber',
                                        render: (text: string) => text || '-',
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
                                        title: 'Total',
                                        dataIndex: 'total',
                                        key: 'total',
                                        render: (total: any) => `$${Number(total ?? 0).toFixed(2)}`,
                                    },
                                    {
                                        title: 'Date',
                                        dataIndex: 'createdAt',
                                        key: 'createdAt',
                                        render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
                                    },
                                ]}
                            />
                        ) : (
                            <Empty description="No orders yet" />
                        )}
                    </Card>
                )}
            </Content>

            {/* Add Balance Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CreditCardOutlined style={{ color: '#667eea' }} />
                        <span>Add Funds to Wallet</span>
                    </div>
                }
                open={addBalanceModalVisible}
                onCancel={() => {
                    setAddBalanceModalVisible(false);
                    balanceForm.resetFields();
                }}
                footer={null}
            >
                <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 8 }}>
                    <Text>Current Balance: </Text>
                    <Text strong style={{ fontSize: 18, color: '#52c41a' }}>${balance.toFixed(2)}</Text>
                </div>
                
                <Form
                    form={balanceForm}
                    layout="vertical"
                    onFinish={handleAddBalance}
                    initialValues={{ amount: 100 }}
                >
                    <Form.Item
                        name="amount"
                        label="Amount to Add"
                        rules={[
                            { required: true, message: 'Please enter amount' },
                            { type: 'number', min: 1, max: 10000, message: 'Amount must be between $1 and $10,000' }
                        ]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            prefix="$"
                            min={1}
                            max={10000}
                            placeholder="100.00"
                        />
                    </Form.Item>
                    
                    <Form.Item
                        name="card_number"
                        label="Card Number"
                        rules={[
                            { required: true, message: 'Please enter card number' },
                            { pattern: /^[\d\s]{13,19}$/, message: 'Invalid card number' }
                        ]}
                    >
                        <Input 
                            placeholder="4242 4242 4242 4242" 
                            maxLength={19}
                        />
                    </Form.Item>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="card_expiry"
                                label="Expiry Date"
                                rules={[
                                    { required: true, message: 'Required' },
                                    { pattern: /^\d{2}\/\d{2}$/, message: 'Use MM/YY format' }
                                ]}
                            >
                                <Input placeholder="MM/YY" maxLength={5} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="card_cvv"
                                label="CVV"
                                rules={[
                                    { required: true, message: 'Required' },
                                    { pattern: /^\d{3,4}$/, message: '3-4 digits' }
                                ]}
                            >
                                <Input placeholder="123" maxLength={4} type="password" />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <div style={{ 
                        padding: 12, 
                        background: '#fff7e6', 
                        borderRadius: 8, 
                        marginBottom: 16,
                        border: '1px solid #ffd591'
                    }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            🔒 This is a mock payment system for testing. No real charges will be made.
                            Use any card number like 4242 4242 4242 4242.
                        </Text>
                    </div>
                    
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            block 
                            size="large"
                            loading={addingBalance}
                            icon={<WalletOutlined />}
                        >
                            Add Funds
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default UserProductsPage;
