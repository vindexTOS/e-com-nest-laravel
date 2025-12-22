import React, { useState } from 'react';
import { Layout, Card, Row, Col, Statistic, Select, DatePicker, Button, Table, message, Dropdown } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, DownloadOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { nestjsOrdersApi } from '../../api';
import AdminLayout from '../components/AdminLayout';
import { exportReportsToCSV, exportReportsToPDF } from '../../shared/utils/exportUtils';
import dayjs from 'dayjs';

const { Content } = Layout;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ReportsPage: React.FC = () => {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const reportsQuery = useQuery({
        queryKey: ['reports', period, dateRange?.[0]?.valueOf(), dateRange?.[1]?.valueOf()],
        queryFn: async () => {
            const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
            const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;
            const resp = await nestjsOrdersApi.getAll({ limit: 200, offset: 0, date_from: dateFrom, date_to: dateTo });
            const data = Array.isArray((resp as any)?.data?.data) ? (resp as any).data.data : [];
            const total = (resp as any)?.data?.total ?? data.length ?? 0;
            const byStatus: Record<string, { count: number; revenue: number }> = {};
            data.forEach((o: any) => {
                const key = o.status || 'unknown';
                const rev = Number(o.total ?? 0);
                byStatus[key] = byStatus[key] || { count: 0, revenue: 0 };
                byStatus[key].count += 1;
                byStatus[key].revenue += rev;
            });
            const statusRows = Object.entries(byStatus).map(([status, v]) => ({
                status,
                count: v.count,
                revenue: v.revenue,
            }));
            return {
                total_orders: total,
                total_revenue: statusRows.reduce((s, r) => s + r.revenue, 0),
                average_order_value: total ? statusRows.reduce((s, r) => s + r.revenue, 0) / total : 0,
                orders_by_status: statusRows,
            };
        },
        placeholderData: keepPreviousData,
    });
    const reports = reportsQuery.data;
    const loading = reportsQuery.isFetching;

    const handleExport = (format: 'csv' | 'pdf') => {
        if (!reports) {
            message.warning('No data to export');
            return;
        }

        try {
            const dateRangeDates = dateRange 
                ? [dateRange[0].toDate(), dateRange[1].toDate()] as [Date, Date]
                : undefined;

            if (format === 'csv') {
                exportReportsToCSV(reports, period, dateRangeDates);
                message.success('Report exported to CSV');
            } else {
                exportReportsToPDF(reports, period, dateRangeDates);
                message.success('Report exported to PDF');
            }
        } catch (error) {
            message.error('Failed to export report');
        }
    };

    const exportMenuItems = [
        {
            key: 'csv',
            label: 'Export as CSV',
            icon: <FileTextOutlined />,
            onClick: () => handleExport('csv'),
        },
        {
            key: 'pdf',
            label: 'Export as PDF',
            icon: <FilePdfOutlined />,
            onClick: () => handleExport('pdf'),
        },
    ];

    const statusColumns = [
        { title: 'Status', dataIndex: 'status', key: 'status' },
        { title: 'Count', dataIndex: 'count', key: 'count' },
        {
            title: 'Revenue',
            dataIndex: 'revenue',
            key: 'revenue',
            render: (revenue: any) => `$${Number(revenue ?? 0).toFixed(2)}`,
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
                            <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
                                <Button icon={<DownloadOutlined />} block>
                                    Export
                                </Button>
                            </Dropdown>
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

