import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../../shared/hooks/useAuth';
import { LoginResponse } from '../../shared/types/auth.types';

axios.defaults.baseURL = window.location.origin;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

const { Title, Text } = Typography;

interface LoginFormValues {
    email: string;
    password: string;
}

const UserLogin: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { login } = useAuth();
    const navigate = useNavigate();

    const onFinish = async (values: LoginFormValues) => {
        setLoading(true);
        try {
            const response = await axios.post<LoginResponse>('/api/auth/login', {
                email: values.email,
                password: values.password,
            });

            if (response.data.accessToken && response.data.user.role === 'customer') {
                message.success('Login successful!');
                login(
                    response.data.accessToken,
                    response.data.refreshToken,
                    response.data.user
                );
                navigate('/', { replace: true });
            } else {
                message.error('Invalid credentials.');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
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
                        Welcome Back
                    </Title>
                    <p style={{ color: '#8c8c8c', margin: 0 }}>
                        Sign in to your account
                    </p>
                </div>

                <Form
                    form={form}
                    name="user-login"
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
                            placeholder="your@email.com"
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
                            Sign In
                        </Button>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                        <Text>
                            Don't have an account? <Link to="/register">Sign up</Link>
                        </Text>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default UserLogin;

