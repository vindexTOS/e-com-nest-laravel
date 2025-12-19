import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Statistic, Select, DatePicker, Button, Table, message } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, DownloadOutlined } from '@ant-design/icons';
import { ordersApi } from '../../api';
import AdminLayout from '../components/AdminLayout';
import dayjs from 'dayjs';

const { Content } = Layout;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ReportsPage: React.FC = () => {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [reports, setReports] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadReports();
    }, [period, dateRange]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
            const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;
            const response = await ordersApi.getReports(period, dateFrom, dateTo);
            setReports(response.data);
        } catch (error) {
            message.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
            const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;
            const blob = await ordersApi.export('csv');
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sales_report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            message.success('Export started');
        } catch (error) {
            message.error('Failed to export report');
        }
    };

    const statusColumns = [
        { title: 'Status', dataIndex: 'status', key: 'status' },
        { title: 'Count', dataIndex: 'count', key: 'count' },
        {
            title: 'Revenue',
            dataIndex: 'revenue',
            key: 'revenue',
            render: (revenue: number) => `$${revenue.toFixed(2)}`,
        },
    ];

    return (
        <AdminLayout>
            <Content style={{ padding: '24px', background: '#f0f2f5' }}>
                <Card style={{ marginBottom: 24 }}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={8}>
                            <Select
                                value={period}
                                onChange={setPeriod}
                                style={{ width: '100%' }}
                            >
                                <Option value="daily">Daily</Option>
                                <Option value="weekly">Weekly</Option>
                                <Option value="monthly">Monthly</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={12}>
                            <RangePicker
                                style={{ width: '100%' }}
                                value={dateRange}
                                onChange={(dates) => setDateRange(dates as any)}
                            />
                        </Col>
                        <Col xs={24} sm={4}>
                            <Button icon={<DownloadOutlined />} onClick={handleExport} block>
                                Export
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {reports && (
                    <>
                        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                            <Col xs={24} sm={12} lg={6}>
                                <Card>
                                    <Statistic
                                        title="Total Orders"
                                        value={reports.total_orders}
                                        prefix={<ShoppingCartOutlined />}
                                        valueStyle={{ color: '#1890ff' }}
                                        loading={loading}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Card>
                                    <Statistic
                                        title="Total Revenue"
                                        value={reports.total_revenue}
                                        prefix={<DollarOutlined />}
                                        precision={2}
                                        valueStyle={{ color: '#3f8600' }}
                                        loading={loading}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Card>
                                    <Statistic
                                        title="Average Order Value"
                                        value={reports.average_order_value}
                                        prefix={<DollarOutlined />}
                                        precision={2}
                                        valueStyle={{ color: '#722ed1' }}
                                        loading={loading}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        <Card title="Orders by Status">
                            <Table
                                columns={statusColumns}
                                dataSource={reports.orders_by_status || []}
                                loading={loading}
                                rowKey="status"
                                pagination={false}
                            />
                        </Card>
                    </>
                )}
            </Content>
        </AdminLayout>
    );
};

export default ReportsPage;

