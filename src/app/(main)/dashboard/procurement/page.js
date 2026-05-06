'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, AreaChart, Area } from "recharts";
import { getDashboardStats, checkWelcomeModalStatus, getProcurementPerformance, getProcurementEfficiencyTrends, getSpendTrends } from './_actions/index.js';
import { Activity, FileText, TrendingUp, Calendar, ShoppingCart, CheckCircle, Clock, DollarSign, Timer, Target, Zap } from 'lucide-react';
import { StatCard } from "./_components/StatCard.js";
import { ChartCard } from "./_components/ChartCard.js";
import { WelcomeModal } from "./_components/WelcomeModal.js";
import { ProcurementEfficiencyTrends } from "./_components/ProcurementEfficiencyTrends.js";
import { SpendTrends } from "./_components/SpendTrends.js";
import { SkeletonDashboard } from '@/app/_components/skeletonLoader.js';
import HeaderNavBar from '@/app/_components/headerNavBar.js';
import { useAuth } from '@/utils/authContext';

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"];

// Procurement Analytics Dashboard - Modern, data-driven design
export default function ProcurementDashboard() {
    const { darkMode, user, isAdmin } = useAuth();
    const [data, setData] = useState(null);
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [efficiencyTrends, setEfficiencyTrends] = useState([]);
    const [spendTrends, setSpendTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [performanceLoading, setPerformanceLoading] = useState(true);
    const [trendsLoading, setTrendsLoading] = useState(true);
    const [spendLoading, setSpendLoading] = useState(true);
    const [loadingStartTime, setLoadingStartTime] = useState(null);
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
    const { totalRequests, avgRequestsPerDay, statusSummary, totalPendingEvaluations } = useMemo(() => {
        if (!data) return { totalRequests: 0, avgRequestsPerDay: 0, statusSummary: [], totalPendingEvaluations: 0 };

        const total = data.requestEvaluations?.reduce((sum, item) => sum + item.count, 0) || 0;
        const avg = data.thirtyDayTrend?.length > 0
            ? data.thirtyDayTrend.reduce((sum, day) => sum + day.requests, 0) / data.thirtyDayTrend.length
            : 0;
        const summary = data.requestEvaluations || [];
        const completedStatuses = ['APPROVED', 'REJECTED', 'CANCELLED', 'SERVED'];
        const pending = summary.filter(item => !completedStatuses.includes(item.status)).reduce((sum, item) => sum + item.count, 0);

        return { totalRequests: total, avgRequestsPerDay: avg.toFixed(1), statusSummary: summary, totalPendingEvaluations: pending };
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
            setLoadingStartTime(Date.now());
            setStatsLoading(true);
            setPerformanceLoading(true);
            setTrendsLoading(true);
            setSpendLoading(true);
            try {
                const startDate = useCustomRange && customStartDate ? customStartDate : null;
                const endDate = useCustomRange && customEndDate ? customEndDate : null;
                // Fetch all dashboard data in parallel
                const [statsData, perfMetrics, effTrends, spndTrends] = await Promise.all([
                    fetchWithTimeout(getDashboardStats(user, isUserAdmin, selectedDateRange, startDate, endDate), 30000),
                    fetchWithTimeout(getProcurementPerformance(user, isUserAdmin, selectedDateRange, startDate, endDate), 30000),
                    fetchWithTimeout(getProcurementEfficiencyTrends(user, isUserAdmin, 6, startDate, endDate), 30000),
                    fetchWithTimeout(getSpendTrends(user, isUserAdmin, 6, startDate, endDate), 30000)
                ]);

                setData(statsData);
                setPerformanceMetrics(perfMetrics);
                setEfficiencyTrends(effTrends);
                setSpendTrends(spndTrends);
            } catch (error) {
                console.error('Error fetching stats:', error);
                if (isInitialLoad) {
                    setData(null);
                    setPerformanceMetrics(null);
                    setEfficiencyTrends([]);
                    setSpendTrends([]);
                }
            } finally {
                const elapsed = loadingStartTime ? Date.now() - loadingStartTime : 0;
                const remaining = Math.max(0, 1000 - elapsed);
                setTimeout(() => {
                    setStatsLoading(false);
                    setPerformanceLoading(false);
                    setTrendsLoading(false);
                    setSpendLoading(false);
                }, remaining);
            }
        }
        fetchStats();
    }, [user, isUserAdmin, selectedDateRange, useCustomRange, customStartDate, customEndDate]);

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
        performanceMetrics &&
        efficiencyTrends &&
        Array.isArray(efficiencyTrends) &&
        spendTrends &&
        Array.isArray(spendTrends);

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
                <div style={{ zoom: '0.8' }}>
                    <SkeletonDashboard />
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen mt-15 ${theme ? 'bg-gray-900 dark' : 'bg-white'}`}>
            <HeaderNavBar />

            <div style={{ zoom: '0.8' }}>
                <div className="overflow-y-auto">
                    <div className="p-4 sm:p-6 space-y-8">

                        {/* Dashboard Header */}
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                            <div className="flex-1">
                                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Procurement Analytics Dashboard
                                </h1>
                                <p className={`mt-2 ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                                    Real-time insights into procurement requests and system performance
                                </p>
                                <p className={`mt-1 text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                                    Current Analysis Period: {useCustomRange && customStartDate && customEndDate
                                        ? `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`
                                        : `Last ${selectedDateRange} days`}
                                </p>
                            </div>

                            {/* Compact Date Range Selector */}
                            <div className={`w-full lg:w-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm hover:shadow-md transition-all duration-200`}>
                                <div className="space-y-3">
                                    {/* Header with title */}
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                                            <Calendar className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                        </div>
                                        <div>
                                            <h3 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                Analysis Period
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Preset Range Buttons - Compact */}
                                    <div className="flex flex-wrap gap-2">
                                        {[7, 14, 30, 60, 90].map((days) => (
                                            <button
                                                key={days}
                                                onClick={() => {
                                                    setLoadingStartTime(Date.now());
                                                    setStatsLoading(true);
                                                    setPerformanceLoading(true);
                                                    setTrendsLoading(true);
                                                    setSpendLoading(true);
                                                    setSelectedDateRange(days);
                                                    setUseCustomRange(false);
                                                }}
                                                className={`relative px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 transform hover:scale-105 ${!useCustomRange && selectedDateRange === days
                                                        ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-500/50'
                                                        : `${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'}`
                                                    }`}
                                            >
                                                {days === 7 ? '7D' : days === 14 ? '14D' : days === 30 ? '30D' : days === 60 ? '60D' : '90D'}
                                                {!useCustomRange && selectedDateRange === days && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                                                )}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const newUseCustom = !useCustomRange;
                                                setUseCustomRange(newUseCustom);
                                                if (newUseCustom) {
                                                    setLoadingStartTime(Date.now());
                                                    setStatsLoading(true);
                                                    setPerformanceLoading(true);
                                                    setTrendsLoading(true);
                                                    setSpendLoading(true);
                                                }
                                            }}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${useCustomRange ? 'bg-blue-600 text-white shadow-sm' : `${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                                                }`}
                                        >
                                            Custom
                                        </button>
                                    </div>

                                    {/* Custom Range Toggle - Compact */}
                                    {useCustomRange && (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                                                Custom Date Range
                                            </h4>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <label className={`text-xs font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        From:
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={customStartDate}
                                                        onChange={(e) => {
                                                            setCustomStartDate(e.target.value);
                                                            setLoadingStartTime(Date.now());
                                                            setStatsLoading(true);
                                                            setPerformanceLoading(true);
                                                            setTrendsLoading(true);
                                                            setSpendLoading(true);
                                                        }}
                                                        className={`px-2 py-1 text-xs border rounded-md transition-all duration-200 ${darkMode
                                                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500/20'
                                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500/20'
                                                            } focus:outline-none focus:ring-2`}
                                                        max={customEndDate || new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className={`text-xs font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        To:
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={customEndDate}
                                                        onChange={(e) => {
                                                            setCustomEndDate(e.target.value);
                                                            setLoadingStartTime(Date.now());
                                                            setStatsLoading(true);
                                                            setPerformanceLoading(true);
                                                            setTrendsLoading(true);
                                                            setSpendLoading(true);
                                                        }}
                                                        className={`px-2 py-1 text-xs border rounded-md transition-all duration-200 ${darkMode
                                                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500/20'
                                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500/20'
                                                            } focus:outline-none focus:ring-2`}
                                                        min={customStartDate}
                                                        max={new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                                {(customStartDate && customEndDate) && (
                                                    <button
                                                        onClick={() => {
                                                            setCustomStartDate('');
                                                            setCustomEndDate('');
                                                            setLoadingStartTime(Date.now());
                                                            setStatsLoading(true);
                                                            setPerformanceLoading(true);
                                                            setTrendsLoading(true);
                                                            setSpendLoading(true);
                                                        }}
                                                        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline self-start"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                                loading={performanceLoading}
                            />
                            <StatCard
                                title="Average Processing Time"
                                value={`${performanceMetrics?.averageCompletionTime?.days || 0} days`}
                                icon={Timer}
                                colorClass="from-blue-500 to-blue-600"
                                delay={0.2}
                                subtitle="From request to completion"
                                darkMode={darkMode}
                                loading={performanceLoading}
                            />
                            <StatCard
                                title="Early Requests"
                                value={performanceMetrics?.earlyRequests?.count || 0}
                                icon={Zap}
                                colorClass="from-purple-500 to-purple-600"
                                delay={0.3}
                                subtitle="Received before due date"
                                darkMode={darkMode}
                                loading={performanceLoading}
                            />
                            <StatCard
                                title="Weekly Service Rate"
                                value={`${performanceMetrics?.timeToServe?.weekEfficiency || 0}%`}
                                icon={CheckCircle}
                                colorClass="from-orange-500 to-orange-600"
                                delay={0.4}
                                subtitle={`${performanceMetrics?.timeToServe?.servedWithinWeek || 0}/${performanceMetrics?.timeToServe?.totalRequests || 0} within 7 days`}
                                darkMode={darkMode}
                                loading={performanceLoading}
                            />
                        </div>

                        {/* Secondary KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title={isUserAdmin ? "Total Purchase Requests" : "My Active Requests"}
                                value={isUserAdmin ? data.totalRequests : data.stats.activeUsers}
                                icon={isUserAdmin ? Activity : Activity}
                                colorClass="from-green-500 to-green-600"
                                delay={0.6}
                                sparklineData={data.stats.sparklines.activeUsers}
                                percentChange={data.stats.percentChanges.activeUsers}
                                darkMode={darkMode}
                                loading={statsLoading}
                            />
                            <StatCard
                                title={isUserAdmin ? "Total Purchase Order" : "My Purchase Order"}
                                value={data.stats.totalPurchaseOrders}
                                icon={isUserAdmin ? ShoppingCart : FileText}
                                colorClass="from-blue-500 to-blue-600"
                                delay={0.5}
                                sparklineData={data.stats.sparklines.totalPurchaseOrders}
                                percentChange={data.stats.percentChanges.totalPurchaseOrders}
                                darkMode={darkMode}
                                loading={statsLoading}
                            />
                            <StatCard
                                title="Pending Evaluations"
                                value={totalPendingEvaluations}
                                icon={Clock}
                                colorClass="from-orange-500 to-orange-600"
                                delay={0.7}
                                sparklineData={data.stats.sparklines.pendingRequests}
                                percentChange={data.stats.percentChanges.pendingRequests}
                                darkMode={darkMode}
                                loading={statsLoading}
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
                                loading={statsLoading}
                            />
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                {/* Procurement Requests Trend - Area Chart */}
                                <ChartCard title={getChartTitle()} delay={0.5} darkMode={darkMode} loading={statsLoading} loadingHeight={175}>
                                    <ResponsiveContainer width="100%" height={175}>
                                        <AreaChart data={lineChartData}>
                                            <defs>
                                                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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

                                {/* Status Summary and Total Spend Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Status Summary */}
                                    <ChartCard title="Status Summary" delay={0.7} darkMode={darkMode} loading={statsLoading} loadingHeight={200}>
                                        <ResponsiveContainer width="100%" height={175}>
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

                                    {/* Total Spend Stat Card */}
                                    <StatCard
                                        title="Total Spend"
                                        value={`$${(performanceMetrics?.totalSpend?.amount || 0).toLocaleString()}`}
                                        icon={DollarSign}
                                        colorClass="from-emerald-500 to-emerald-600"
                                        delay={0.8}
                                        subtitle={`Budget utilization: ${performanceMetrics?.totalSpend?.utilization || 0}%`}
                                        darkMode={darkMode}
                                        loading={performanceLoading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-6">
                                {/* Procurement Efficiency Trends */}
                                <ProcurementEfficiencyTrends darkMode={darkMode} data={efficiencyTrends} loading={trendsLoading} loadingHeight={175} />

                                {/* Spend Trends */}
                                <SpendTrends darkMode={darkMode} data={spendTrends} loading={spendLoading} loadingHeight={175} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <WelcomeModal isOpen={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} />
        </div>
    );
}