import React, { useEffect, useState } from 'react';
import { Layout, Card, Form, Input, Button, Radio, Space, Typography, message, Spin, Divider, Row, Col, Tag } from 'antd';
import { CreditCardOutlined, WalletOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { paymentApi } from '../../api/nestjs/payment.api';
import { nestjsOrdersApi } from '../../api';

const { Content } = Layout;
const { Title, Text } = Typography;

interface Product {
  id: string;
  name: string;
  price: number | string;
  image?: string;
  sku?: string;
}

const CheckoutPage: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet_balance' | 'credit_card'>('wallet_balance');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const productData = location.state?.product;
    const qty = location.state?.quantity || 1;
    
    if (productData) {
      // Ensure price is a number
      const normalizedProduct = {
        ...productData,
        price: Number(productData.price) || 0,
      };
      setProduct(normalizedProduct);
      setQuantity(Number(qty) || 1);
      loadBalance();
    } else {
      message.error('No product selected. Please select a product first.');
      navigate('/');
    }
  }, [isAuthenticated, loading, location, navigate]);

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

  const validateCardBeforeOrder = (cardExpiry: string): boolean => {
    if (!cardExpiry) return false;
    
    // Validate format MM/YY
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
      message.error('Invalid expiry format. Use MM/YY');
      return false;
    }

    // Check if card is expired
    const [month, year] = cardExpiry.split('/');
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    
    // Set to end of month for expiry date
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    expiryDate.setDate(0);

    if (expiryDate < now) {
      message.error('Card has expired. Please use a valid card.');
      return false;
    }

    return true;
  };

  const handlePayment = async (values: any) => {
    if (!product) return;

    // Validate card BEFORE creating order if using credit card
    if (paymentMethod === 'credit_card') {
      if (!values.cardNumber || !values.cardExpiry || !values.cardCvv || !values.cardholderName) {
        message.error('Please fill in all credit card details');
        return;
      }

      // Validate card expiry before creating order
      if (!validateCardBeforeOrder(values.cardExpiry)) {
        return; // Stop here if validation fails
      }

      // Validate card number format
      const cleanCardNumber = values.cardNumber.replace(/\s+/g, '');
      if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        message.error('Invalid card number. Must be 13-19 digits.');
        return;
      }

      if (!/^\d+$/.test(cleanCardNumber)) {
        message.error('Card number must contain only digits');
        return;
      }

      // Validate CVV
      if (!/^\d{3,4}$/.test(values.cardCvv)) {
        message.error('CVV must be 3-4 digits');
        return;
      }
    }

    setProcessing(true);
    try {
      // Step 1: Create the order first (only after validation passes)
      const newOrder = await nestjsOrdersApi.create({
        items: [{ productId: product.id, quantity: quantity }],
      });

      // Step 2: Process payment for the newly created order
      const paymentData: any = {
        orderId: newOrder.id,
        paymentMethod,
      };

      if (paymentMethod === 'credit_card') {
        paymentData.cardNumber = values.cardNumber?.replace(/\s+/g, '');
        paymentData.cardExpiry = values.cardExpiry;
        paymentData.cardCvv = values.cardCvv;
        paymentData.cardholderName = values.cardholderName;
      }

      const result = await paymentApi.processPayment(paymentData);
      
      message.success('Order placed and payment processed successfully!');
      navigate('/orders', { 
        state: { 
          message: 'Order placed and paid successfully!',
          orderId: newOrder.id 
        } 
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Order or payment failed';
      
      // If payment fails but order was created, inform user
      if (errorMsg.includes('expired') || errorMsg.includes('Invalid card') || errorMsg.includes('CVV')) {
        message.error(`${errorMsg}. Please check your card details and try again.`);
      } else if (errorMsg.includes('balance') || errorMsg.includes('Balance')) {
        message.error(errorMsg);
        setPaymentMethod('wallet_balance');
        loadBalance();
      } else {
        message.error(errorMsg);
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !product) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Calculate order totals - ensure all values are numbers
  const productPrice = Number(product.price) || 0;
  const subtotal = productPrice * quantity;
  const tax = subtotal * 0.1; // 10% tax
  const shipping = 5.00; // Fixed shipping
  const discount = 0;
  const orderTotal = subtotal + tax + shipping - discount;
  const canPayWithBalance = Number(balance) >= orderTotal;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Link to="/">
          <Button type="link" icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>
            Back to Products
          </Button>
        </Link>

        <Title level={2}>Checkout</Title>

        <Row gutter={24}>
          <Col xs={24} lg={14}>
            <Card title="Order Summary" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>Product: </Text>
                <Text>{product.name}</Text>
                {product.sku && (
                  <>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>SKU: {product.sku}</Text>
                  </>
                )}
              </div>

              <Divider />

              <div style={{ marginBottom: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text>Subtotal ({quantity} x ${productPrice.toFixed(2)}):</Text>
                  <Text strong>${subtotal.toFixed(2)}</Text>
                </Space>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text>Tax (10%):</Text>
                  <Text>${tax.toFixed(2)}</Text>
                </Space>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text>Shipping:</Text>
                  <Text>${shipping.toFixed(2)}</Text>
                </Space>
              </div>
              {discount > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text>Discount:</Text>
                    <Text>-${discount.toFixed(2)}</Text>
                  </Space>
                </div>
              )}
              <Divider />
              <div>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Title level={4} style={{ margin: 0 }}>Total:</Title>
                  <Title level={3} style={{ margin: 0, color: '#667eea' }}>
                    ${orderTotal.toFixed(2)}
                  </Title>
                </Space>
              </div>

              <Divider />

              <div>
                <Text strong>Order Items:</Text>
                <div style={{ marginTop: 8, padding: 8, background: '#fafafa', borderRadius: 4 }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text>{product.name} x{quantity}</Text>
                    <Text strong>${subtotal.toFixed(2)}</Text>
                  </Space>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="Payment Method">
              <Form
                form={paymentForm}
                layout="vertical"
                onFinish={handlePayment}
                initialValues={{ paymentMethod: 'wallet_balance' }}
              >
                <Form.Item name="paymentMethod" style={{ marginBottom: 24 }}>
                  <Radio.Group
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Radio value="wallet_balance" style={{ width: '100%', padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                        <Space>
                          <WalletOutlined />
                          <div>
                            <div>Wallet Balance</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {balanceLoading ? 'Loading...' : `Available: $${balance.toFixed(2)}`}
                            </Text>
                            {!canPayWithBalance && balance > 0 && (
                              <div>
                                <Text type="danger" style={{ fontSize: 12 }}>
                                  Insufficient balance. Need ${(orderTotal - balance).toFixed(2)} more.
                                </Text>
                              </div>
                            )}
                          </div>
                        </Space>
                      </Radio>
                      <Radio value="credit_card" style={{ width: '100%', padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                        <Space>
                          <CreditCardOutlined />
                          <div>
                            <div>Credit Card</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Pay with credit or debit card
                            </Text>
                          </div>
                        </Space>
                      </Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>

                {paymentMethod === 'credit_card' && (
                  <>
                    <Form.Item
                      name="cardholderName"
                      label="Cardholder Name"
                      rules={[{ required: true, message: 'Please enter cardholder name' }]}
                    >
                      <Input placeholder="John Doe" />
                    </Form.Item>

                    <Form.Item
                      name="cardNumber"
                      label="Card Number"
                      rules={[
                        { required: true, message: 'Please enter card number' },
                        { pattern: /^[\d\s]{13,19}$/, message: 'Invalid card number' }
                      ]}
                    >
                      <Input 
                        placeholder="4242 4242 4242 4242" 
                        maxLength={19}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s+/g, '').replace(/\D/g, '');
                          const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                          paymentForm.setFieldsValue({ cardNumber: formatted });
                        }}
                      />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="cardExpiry"
                          label="Expiry Date"
                          rules={[
                            { required: true, message: 'Required' },
                            { pattern: /^\d{2}\/\d{2}$/, message: 'Use MM/YY format' }
                          ]}
                        >
                          <Input 
                            placeholder="MM/YY" 
                            maxLength={5}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              if (value.length >= 2) {
                                const formatted = value.slice(0, 2) + '/' + value.slice(2, 4);
                                paymentForm.setFieldsValue({ cardExpiry: formatted });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="cardCvv"
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
                  </>
                )}

                {paymentMethod === 'wallet_balance' && !canPayWithBalance && (
                  <div style={{ 
                    padding: 12, 
                    background: '#fff2e8', 
                    borderRadius: 8, 
                    marginBottom: 16,
                    border: '1px solid #ffbb96'
                  }}>
                    <Text type="warning" style={{ fontSize: 12 }}>
                      ⚠️ Insufficient balance. You need ${orderTotal.toFixed(2)} but have ${balance.toFixed(2)}.
                      Please add funds or use credit card.
                    </Text>
                  </div>
                )}

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    block 
                    size="large"
                    loading={processing}
                    disabled={paymentMethod === 'wallet_balance' && !canPayWithBalance}
                    icon={paymentMethod === 'wallet_balance' ? <WalletOutlined /> : <CreditCardOutlined />}
                  >
                    {processing ? 'Processing...' : `Pay $${orderTotal.toFixed(2)}`}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default CheckoutPage;

