import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authGql } from '../../graphql';
import { useAuth } from '../../shared/hooks/useAuth';

const { Title } = Typography;

interface LoginFormValues {
    email: string;
    password: string;
}

const AdminLogin: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { login } = useAuth();
    const navigate = useNavigate();

    const onFinish = async (values: LoginFormValues) => {
        setLoading(true);
        try {
            const response = await authGql.adminLogin({
                email: values.email,
                password: values.password,
            });

            if (response.accessToken && response.user.role === 'admin') {
                message.success('Login successful!');
                login(
                    response.accessToken,
                    response.refreshToken,
                    response.user
                );
                navigate('/admin/dashboard', { replace: true });
            } else {
                message.error('Access denied. Admin credentials required.');
            }
        } catch (error: any) {
            // GraphQL errors come in different formats
            let errorMessage = 'Login failed. Please try again.';
            
            if (error.message) {
                // GraphQL client throws Error with message
                errorMessage = error.message;
            } else if (error.response?.data?.errors?.[0]?.message) {
                // Direct GraphQL error format
                errorMessage = error.response.data.errors[0].message;
            } else if (error.response?.data?.message) {
                // REST API error format
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                // Alternative error format
                errorMessage = error.response.data.error;
            }
            
            console.error('Login error:', error);
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <Card
                style={{
                    width: '100%',
                    maxWidth: 400,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2} style={{ marginBottom: 8 }}>
                        Admin Login
                    </Title>
                    <p style={{ color: '#8c8c8c', margin: 0 }}>
                        E-Commerce Admin Panel
                    </p>
                </div>

                <Form
                    form={form}
                    name="admin-login"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                    autoComplete="off"
                >
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please input your email!' },
                            { type: 'email', message: 'Please enter a valid email!' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="admin@gmail.com"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                            { required: true, message: 'Please input your password!' },
                            { min: 6, message: 'Password must be at least 6 characters!' }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Enter your password"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{ height: 40 }}
                        >
                            Login
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default AdminLogin;

