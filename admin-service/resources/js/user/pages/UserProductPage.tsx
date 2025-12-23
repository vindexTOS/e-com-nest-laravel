import React, { useEffect, useState } from 'react';
import { Layout, Typography, Button, Card, Row, Col, Empty, message, Spin, Tag, Table, Input, Select, Pagination } from 'antd';
import { ShoppingOutlined, UserOutlined, LoginOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { categoriesGql } from '../../graphql';
import { nestjsOrdersApi } from '../../api';
import { paymentApi } from '../../api/nestjs/payment.api';
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
            const res = await paymentApi.getBalance();
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
                // Only filter by active status if we want to show only active products
                // Remove status filter to show all products (like admin side)
                // status: 'active',
            };
            if (searchTerm) params.search = searchTerm;
            if (catId) params.categoryId = catId;
            
            const res = await axios.get('/api/gateway/products', { params });
            const body = res.data;
            
            // Handle response structure: { data: [...], total: X, page: 1, limit: 12 }
            const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
            const totalCount = body?.total ?? (Array.isArray(body) ? body.length : 0);
            
            setProducts(list);
            setTotal(totalCount);
        } catch (err: any) {
            console.error('Failed to load products:', err);
            message.error(err?.response?.data?.message || 'Failed to load products');
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

    const handleOrder = async (productId: string) => {
        if (!isAuthenticated || !user) {
            message.warning('Please login to order');
            return;
        }
        
        // Find the product to pass to checkout
        const product = products.find(p => p.id === productId);
        if (!product) {
            message.error('Product not found');
            return;
        }
        
        // Redirect to checkout page with product info (order will be created after payment)
        // Ensure price is a number
        navigate('/checkout', { 
            state: { 
                product: {
                    id: product.id,
                    name: product.name,
                    price: Number(product.price) || 0,
                    image: product.image,
                    sku: product.sku,
                },
                quantity: 1
            } 
        });
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
                                                    ) : (
                                                        <Button 
                                                            block 
                                                            style={{ marginTop: 12 }} 
                                                            type="primary" 
                                                            onClick={() => handleOrder(p.id)}
                                                        >
                                                            Buy
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
        </Layout>
    );
};

export default UserProductsPage;
