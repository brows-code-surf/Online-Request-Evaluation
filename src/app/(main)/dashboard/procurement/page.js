'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, AreaChart, Area, ComposedChart } from "recharts";
import { getDashboardStats, getDashboardTrend, checkWelcomeModalStatus, getProcurementPerformance, getProcurementEfficiencyTrends } from './_actions/index.js';
import { Users, Activity, FileText, TrendingUp, User, Calendar, ShoppingCart, AlertCircle, CheckCircle, Clock, DollarSign, Timer, Target, Zap } from 'lucide-react';
import { StatCard } from "./_components/StatCard.js";
import { ChartCard } from "./_components/ChartCard.js";
import { RecentLogins } from "./_components/RecentLogins.js";
import { RecentActivityLogs } from "./_components/RecentActivityLogs.js";
import { WelcomeModal } from "./_components/WelcomeModal.js";
import { ProcurementEfficiencyTrends } from "./_components/ProcurementEfficiencyTrends.js";
import { SkeletonDashboard } from '@/app/_components/skeletonLoader.js';
import HeaderNavBar from '@/app/_components/headerNavBar.js';

import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import { useAuth } from '@/utils/authContext';

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"];

// Procurement Analytics Dashboard - Modern, data-driven design
export default function ProcurementDashboard() {
    const { darkMode, user, isAdmin } = useAuth();
    const [data, setData] = useState(null);
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [efficiencyTrends, setEfficiencyTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDateRange, setSelectedDateRange] = useState(30);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const isUserAdmin = user && isAdmin();
    const theme = mounted ? darkMode : false;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Memoized calculations for performance
    const { totalRequests, avgRequestsPerDay, statusSummary } = useMemo(() => {
        if (!data) return { totalRequests: 0, avgRequestsPerDay: 0, statusSummary: [] };

        const total = data.requestEvaluations?.reduce((sum, item) => sum + item.count, 0) || 0;
        const avg = data.thirtyDayTrend?.length > 0
            ? data.thirtyDayTrend.reduce((sum, day) => sum + day.requests, 0) / data.thirtyDayTrend.length
            : 0;
        const summary = data.requestEvaluations || [];

        return { totalRequests: total, avgRequestsPerDay: avg.toFixed(1), statusSummary: summary };
    }, [data]);

    // Custom tooltip for pie chart
    const CustomPieTooltip = useCallback(({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = ((data.count / totalRequests) * 100).toFixed(1);
            return (
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-3 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-lg`}>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{data.status}</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Count: <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{data.count}</span>
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Percentage: <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{percentage}%</span>
                    </p>
                </div>
            );
        }
        return null;
    }, [darkMode, totalRequests]);

    // Custom tooltip for area chart
    const CustomAreaTooltip = useCallback(({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-3 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-lg`}>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(label).toLocaleDateString()}</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Requests: <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    }, [darkMode]);

    // Custom tooltip for bar chart
    const CustomBarTooltip = useCallback(({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-3 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-lg`}>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Count: <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    }, [darkMode]);

    // Custom label for pie slices
    const renderCustomLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.05) return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill={darkMode ? "white" : "#000000"} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    }, [darkMode]);

    // Helper function to fetch with timeout
    const fetchWithTimeout = (promise, timeout = 30000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout))
        ]);
    };

    useEffect(() => {
        async function fetchStats() {
            const isInitialLoad = !data;
            if (isInitialLoad) setLoading(true);
            try {
                // Fetch all dashboard data in parallel
                const [statsData, perfMetrics, effTrends] = await Promise.all([
                    fetchWithTimeout(getDashboardStats(user, isUserAdmin, selectedDateRange), 30000),
                    fetchWithTimeout(getProcurementPerformance(user, isUserAdmin, selectedDateRange), 30000),
                    fetchWithTimeout(getProcurementEfficiencyTrends(user, isUserAdmin, 6), 30000)
                ]);

                setData(statsData);
                setPerformanceMetrics(perfMetrics);
                setEfficiencyTrends(effTrends);
            } catch (error) {
                console.error('Error fetching stats:', error);
                if (isInitialLoad) {
                    setData(null);
                    setPerformanceMetrics(null);
                    setEfficiencyTrends([]);
                }
            }
            if (isInitialLoad) setLoading(false);
        }
        fetchStats();
    }, [user, isUserAdmin, selectedDateRange]);

    const isDataComplete = data &&
        data.stats &&
        data.stats.sparklines &&
        data.stats.sparklines.totalUsers &&
        data.stats.sparklines.activeUsers &&
        data.stats.sparklines.pendingRequests &&
        data.stats.sparklines.requestsLast24h &&
        data.stats.percentChanges &&
        data.thirtyDayTrend &&
        Array.isArray(data.thirtyDayTrend) &&
        data.requestEvaluations &&
        Array.isArray(data.requestEvaluations) &&
        data.recentActivityLogs &&
        Array.isArray(data.recentActivityLogs) &&
        performanceMetrics &&
        efficiencyTrends &&
        Array.isArray(efficiencyTrends);

    useEffect(() => {
        if (isDataComplete) setLoading(false);
    }, [isDataComplete]);

    useEffect(() => {
        const checkWelcomeModal = async () => {
            if (!user?.employeeID || !isDataComplete) return;
            try {
                const today = new Date().toISOString().split('T')[0];
                const lastShown = localStorage.getItem('welcomeModalShown');
                if (lastShown === today) return;
                const result = await checkWelcomeModalStatus(user.employeeID);
                if (result.shouldShowModal) {
                    setShowWelcomeModal(true);
                    localStorage.setItem('welcomeModalShown', today);
                }
            } catch (error) {
                console.error('Error checking welcome modal status:', error);
            }
        };
        checkWelcomeModal();
    }, [user?.employeeID, isDataComplete]);

    // Socket listeners for real-time updates
    useSocketMultiple("dashboard-broadcast", {
        "activity-log-added": (updateData) => {
            setData(prevData => {
                if (!prevData) return prevData;
                const newActivityLog = {
                    id: Date.now(),
                    activity: updateData.activity,
                    createdBy: updateData.createdBy,
                    dateCreated: updateData.dateCreated
                };
                return {
                    ...prevData,
                    recentActivityLogs: [newActivityLog, ...prevData.recentActivityLogs.slice(0, 9)]
                };
            });
        },
        "stats-updated": async () => {
            try {
                const updatedStats = await getDashboardStats(user, isUserAdmin, selectedDateRange);
                setData(updatedStats);
            } catch (error) {
                console.error('Error refetching stats after update:', error);
            }
        }
    });

    // Prepare chart data
    const pieChartData = data ? (statusSummary.length > 0 ? statusSummary : [{ status: 'No Data', count: 1 }]) : [{ status: 'Loading', count: 1 }];
    const barChartData = useMemo(() => {
        return statusSummary.map(item => ({ status: item.status, count: item.count }));
    }, [statusSummary]);

    const getFilteredLineChartData = () => {
        if (!data?.thirtyDayTrend?.length) return [{ date: new Date().toISOString().split('T')[0], requests: 0 }];
        let startDate, endDate;
        if (useCustomRange && customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
        } else {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(endDate.getDate() - selectedDateRange + 1);
        }
        return data.thirtyDayTrend
            .filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const lineChartData = getFilteredLineChartData();

    const getChartTitle = () => {
        if (useCustomRange && customStartDate && customEndDate) {
            return `Procurement Requests: ${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`;
        }
        return `Procurement Requests - Last ${selectedDateRange} Days`;
    };

    if (loading || !data) {
        return (
            <div className={`min-h-screen mt-15 ${theme ? 'bg-gray-900 dark' : 'bg-white'}`}>
                <HeaderNavBar />
                <div style={{zoom: '0.8'}}>
                    <SkeletonDashboard />
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen mt-15 ${theme ? 'bg-gray-900 dark' : 'bg-white'}`}>
            <HeaderNavBar />

            <div style={{zoom: '0.8'}}>
                <div className="overflow-y-auto">
                <div className="p-4 sm:p-6 space-y-8">

                    {/* Dashboard Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Procurement Analytics Dashboard
                            </h1>
                            <p className={`mt-2 ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                                Real-time insights into procurement requests and system performance
                            </p>
                        </div>
                        <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            Last updated: {new Date().toLocaleString()}
                        </div>
                    </div>

                    {/* KPI Cards - Procurement Focused */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="On-Time Delivery Rate"
                            value={`${performanceMetrics?.onTimeDelivery?.percentage || 0}%`}
                            icon={Target}
                            colorClass="from-green-500 to-green-600"
                            delay={0.1}
                            subtitle={`${performanceMetrics?.onTimeDelivery?.onTimeCount || 0}/${performanceMetrics?.onTimeDelivery?.totalCompleted || 0} requests`}
                            darkMode={darkMode}
                        />
                        <StatCard
                            title="Average Processing Time"
                            value={`${performanceMetrics?.averageCompletionTime?.days || 0} days`}
                            icon={Timer}
                            colorClass="from-blue-500 to-blue-600"
                            delay={0.2}
                            subtitle="From request to completion"
                            darkMode={darkMode}
                        />
                        <StatCard
                            title="Early Requests"
                            value={performanceMetrics?.earlyRequests?.count || 0}
                            icon={Zap}
                            colorClass="from-purple-500 to-purple-600"
                            delay={0.3}
                            subtitle="Received before due date"
                            darkMode={darkMode}
                        />
                        <StatCard
                            title="Weekly Service Rate"
                            value={`${performanceMetrics?.timeToServe?.weekEfficiency || 0}%`}
                            icon={CheckCircle}
                            colorClass="from-orange-500 to-orange-600"
                            delay={0.4}
                            subtitle={`${performanceMetrics?.timeToServe?.servedWithinWeek || 0}/${performanceMetrics?.timeToServe?.totalRequests || 0} within 7 days`}
                            darkMode={darkMode}
                        />
                    </div>

                    {/* Secondary KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title={isUserAdmin ? "Total Procurement Requests" : "My Procurement Requests"}
                            value={data.stats.totalUsers}
                            icon={isUserAdmin ? ShoppingCart : FileText}
                            colorClass="from-blue-500 to-blue-600"
                            delay={0.5}
                            sparklineData={data.stats.sparklines.totalUsers}
                            percentChange={data.stats.percentChanges.totalUsers}
                            darkMode={darkMode}
                        />
                        <StatCard
                            title={isUserAdmin ? "Active Procurement Users" : "My Active Requests"}
                            value={data.stats.activeUsers}
                            icon={isUserAdmin ? Activity : Activity}
                            colorClass="from-green-500 to-green-600"
                            delay={0.6}
                            sparklineData={data.stats.sparklines.activeUsers}
                            percentChange={data.stats.percentChanges.activeUsers}
                            darkMode={darkMode}
                        />
                        <StatCard
                            title="Pending Evaluations"
                            value={data.stats.pendingRequests}
                            icon={Clock}
                            colorClass="from-orange-500 to-orange-600"
                            delay={0.7}
                            sparklineData={data.stats.sparklines.pendingRequests}
                            percentChange={data.stats.percentChanges.pendingRequests}
                            darkMode={darkMode}
                        />
                        <StatCard
                            title="Daily Average Requests"
                            value={avgRequestsPerDay}
                            icon={TrendingUp}
                            colorClass="from-purple-500 to-purple-600"
                            delay={0.8}
                            sparklineData={data.stats.sparklines.requestsLast24h}
                            percentChange={data.stats.percentChanges.requestsLast24h}
                            darkMode={darkMode}
                        />
                    </div>

                    {/* Date Range Selector */}
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className={`h-4 w-4 ${darkMode ? 'text-white' : 'text-gray-500'}`} />
                                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>Analysis Period:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[7, 14, 30, 60, 90].map((days) => (
                                    <button
                                        key={days}
                                        onClick={() => { setSelectedDateRange(days); setUseCustomRange(false); }}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            !useCustomRange && selectedDateRange === days
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : `${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                                        }`}
                                    >
                                        {days === 7 ? '7 Days' : days === 14 ? '14 Days' : days === 30 ? '30 Days' : days === 60 ? '60 Days' : '90 Days'}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setUseCustomRange(!useCustomRange)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                        useCustomRange ? 'bg-blue-600 text-white shadow-sm' : `${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                                    }`}
                                >
                                    Custom
                                </button>
                            </div>
                            {useCustomRange && (
                                <div className="flex items-center gap-2 ml-4">
                                    <label className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-600'}`}>From:</label>
                                    <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
                                           className={`px-2 py-1 ${darkMode ? 'text-white' : 'text-black'} text-xs border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`} />
                                    <label className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-600'}`}>To:</label>
                                    <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)}
                                           className={`px-2 py-1 ${darkMode ? 'text-white' : 'text-black'} text-xs border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            {/* Procurement Requests Trend - Area Chart */}
                            <ChartCard title={getChartTitle()} delay={0.5} darkMode={darkMode}>
                                <ResponsiveContainer width="100%" height={175}>
                                    <AreaChart data={lineChartData}>
                                        <defs>
                                            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f3f4f6'} />
                                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                                               tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                                        <YAxis tick={{ fontSize: 12, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                                         <Tooltip content={CustomAreaTooltip} />
                                        <Area type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            {/* Status Summary */}
                            <ChartCard title="Status Summary" delay={0.7} darkMode={darkMode}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f3f4f6'} />
                                        <XAxis dataKey="status" tick={{ fontSize: 11, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                                               angle={-45} textAnchor="end" height={90} />
                                        <YAxis tick={{ fontSize: 12, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                                        <Tooltip content={CustomBarTooltip} />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                            {barChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>

                        {/* Procurement Efficiency Trends */}
                        <ProcurementEfficiencyTrends darkMode={darkMode} data={efficiencyTrends} />
                    </div>
                </div>
            </div>
            </div>

            <WelcomeModal isOpen={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} />
        </div>
    );
}