'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getDashboardStats } from './_actions/index.js';
import { Users, Activity, FileText, TrendingUp, User, Calendar } from 'lucide-react';
import { StatCard } from "./_components/StatCard.js";
import { ChartCard } from "./_components/ChartCard.js";
import { RecentLogins } from "./_components/RecentLogins.js";
import { RecentActivityLogs } from "./_components/RecentActivityLogs.js";
import { SkeletonDashboard } from '@/app/_components/skeletonLoader.js';
import HeaderNavBar from '@/app/_components/headerNavBar.js';

import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import { useAuth } from '@/utils/authContext';

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// Client-side function to simulate live updates (no random numbers)
function simulateLiveUpdate(currentData) {
    const newData = { ...currentData };

    // Keep stats the same (no random changes)

    // Update sparklines (shift and add current value)
    Object.keys(newData.stats.sparklines).forEach(key => {
        newData.stats.sparklines[key] = [...newData.stats.sparklines[key]]; // Create a mutable copy
        newData.stats.sparklines[key].shift();
        newData.stats.sparklines[key].push(newData.stats[key]);
    });

    // Keep percent changes the same (no random fluctuations)

    // Keep request evaluations the same (no random changes)

    // Update 30-day trend (keep existing data for demo purposes)
    // For live updates, we maintain the same trend data without adding duplicates

    return newData;
}

export default function DashboardClient() {
    const { darkMode, user, isAdmin } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDateRange, setSelectedDateRange] = useState(30); // Default to 30 days
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [useCustomRange, setUseCustomRange] = useState(false);
    const isUserAdmin = user && isAdmin();

    useEffect(() => {
        async function fetchStats() {
            try {
                const statsData = await getDashboardStats(user, isUserAdmin);
                setData(statsData);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();

        // Live updates every 5 seconds
        const interval = setInterval(() => {
            setData(prevData => {
                if (prevData) {
                    return simulateLiveUpdate(prevData);
                }
                return prevData;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [user, isUserAdmin]);

    // Socket listeners for real-time updates
    useSocketMultiple("dashboard-broadcast", {
        "activity-log-added": (data) => {
            console.log("Activity log added:", data);
            setData(prevData => {
                if (!prevData) return prevData;

                // Add the new activity log to the beginning of the list
                const newActivityLog = {
                    id: Date.now(), // Use timestamp as temporary ID
                    activity: data.activity,
                    createdBy: data.createdBy,
                    dateCreated: data.dateCreated
                };

                const updatedActivityLogs = [newActivityLog, ...prevData.recentActivityLogs.slice(0, 9)]; // Keep only 10 items

                return {
                    ...prevData,
                    recentActivityLogs: updatedActivityLogs
                };
            });
        },

        "stats-updated": async (data) => {
            console.log("Stats updated:", data);
            // Refetch dashboard stats when requests are approved/rejected
            try {
                const updatedStats = await getDashboardStats(user, isUserAdmin);
                setData(updatedStats);
            } catch (error) {
                console.error('Error refetching stats after update:', error);
            }
        }
    });

    if (loading || !data) {
        return (
            <div className={`min-h-screen mt-15 ${darkMode ? 'bg-gray-900 dark' : 'bg-white'}`}>
                <HeaderNavBar />
                <SkeletonDashboard />
            </div>
        );
    }

    // Prepare chart data
    const pieChartData = data.requestEvaluations.length > 0 ? data.requestEvaluations : [{ status: 'No Data', count: 1 }];

    // Filter line chart data based on selected date range
    const getFilteredLineChartData = () => {
        if (!data.thirtyDayTrend || data.thirtyDayTrend.length === 0) {
            return [{ date: new Date().toISOString().split('T')[0], requests: 0 }];
        }

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

    // Get chart title based on selected range
    const getChartTitle = () => {
        if (useCustomRange && customStartDate && customEndDate) {
            return `Custom Range: ${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`;
        }
        return `${selectedDateRange}-Day Requests Trend`;
    };

    // Calculate total for percentage calculations
    const totalRequests = pieChartData.reduce((sum, item) => sum + item.count, 0);

    // Custom tooltip for pie chart
    const CustomPieTooltip = ({ active, payload }) => {
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
    };

    // Custom label for pie slices
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%

        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize="12"
                fontWeight="bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className={`min-h-screen mt-15 ${darkMode ? 'bg-gray-900 dark' : 'bg-white'}`}>
            <HeaderNavBar />
            {/* Main Content - Scrollable */}
            <div className="overflow-y-auto">
                <div className="p-4 sm:p-6">
                    {/* Stats Row - Responsive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            title={isUserAdmin ? "Total Users" : "My Total Requests"}
                            value={data.stats.totalUsers}
                            icon={isUserAdmin ? Users : FileText}
                            colorClass="from-blue-500 to-blue-600"
                            delay={0.1}
                            sparklineData={data.stats.sparklines.totalUsers}
                            percentChange={data.stats.percentChanges.totalUsers}
                            darkMode={darkMode}
                        />
                        <StatCard
                            title={isUserAdmin ? "Active Users" : "My Active Requests"}
                            value={data.stats.activeUsers}
                            icon={isUserAdmin ? Activity : Activity}
                            colorClass="from-green-500 to-green-600"
                            delay={0.2}
                            sparklineData={data.stats.sparklines.activeUsers}
                            percentChange={data.stats.percentChanges.activeUsers}
                            darkMode={darkMode}
                        />
                        <StatCard
                            title="Pending Request Evaluations"
                            value={data.stats.pendingRequests}
                            icon={FileText}
                            colorClass="from-orange-500 to-orange-600"
                            delay={0.3}
                            sparklineData={data.stats.sparklines.pendingRequests}
                            percentChange={data.stats.percentChanges.pendingRequests}
                            darkMode={darkMode}
                        />
                        <StatCard
                            title={isUserAdmin ? "Requests in the Last 24 Hours" : "My Requests (Last 24h)"}
                            value={data.stats.requestsLast24h}
                            icon={TrendingUp}
                            colorClass="from-purple-500 to-purple-600"
                            delay={0.4}
                            sparklineData={data.stats.sparklines.requestsLast24h}
                            percentChange={data.stats.percentChanges.requestsLast24h}
                            darkMode={darkMode}
                        />
                    </div>

                    {/* Charts and Recent Logins Row - Responsive layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Charts Section - Stacked on mobile, side by side on larger screens */}
                        <div className="xl:col-span-2 space-y-6 xl:space-y-0">
                            {/* Request Evaluation Status Breakdown - Donut Chart */}
                            <div className="xl:hidden">
                                <ChartCard title={`Request Evaluation Status Breakdown (Total: ${totalRequests})`} delay={0.5} darkMode={darkMode}>
                                    <ResponsiveContainer width="100%" height={300} minWidth={300} minHeight={300}>
                                        <PieChart>
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="count"
                                                nameKey="status"
                                                label={renderCustomLabel}
                                                labelLine={false}
                                            >
                                                {pieChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={data.requestEvaluations.length > 0 ? COLORS[index % COLORS.length] : '#e5e7eb'} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomPieTooltip />} />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                formatter={(value, entry) => (
                                                    <span style={{ color: entry.color, fontSize: '12px', fontWeight: '500' }}>
                                                        {value} ({entry.payload.count})
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartCard>
                            </div>

                            {/* Date Range Selector */}
                            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm mb-6`}>
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>Time Range:</span>
                                    </div>

                                    {/* Preset buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        {[7, 14, 30, 60, 90].map((days) => (
                                            <button
                                                key={days}
                                                onClick={() => {
                                                    setSelectedDateRange(days);
                                                    setUseCustomRange(false);
                                                }}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!useCustomRange && selectedDateRange === days
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : `${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                                                    }`}
                                            >
                                                {days === 7 ? '7 Days' : days === 14 ? '14 Days' : days === 30 ? '30 Days' : days === 60 ? '60 Days' : '90 Days'}
                                            </button>
                                        ))}

                                        {/* Custom Range Button */}
                                        <button
                                            onClick={() => setUseCustomRange(!useCustomRange)}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${useCustomRange
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : `${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                                                }`}
                                        >
                                            Custom
                                        </button>
                                    </div>

                                    {/* Custom Date Inputs */}
                                    {useCustomRange && (
                                        <div className="flex items-center gap-2 ml-4">
                                            <label className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-600'}`}>From:</label>
                                            <input
                                                type="date"
                                                value={customStartDate}
                                                onChange={(e) => setCustomStartDate(e.target.value)}
                                                className={`px-2 py-1 ${darkMode ? 'text-white' : 'text-black'} text-xs border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                            />
                                            <label className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-600'}`}>To:</label>
                                            <input
                                                type="date"
                                                value={customEndDate}
                                                onChange={(e) => setCustomEndDate(e.target.value)}
                                                className={`px-2 py-1 ${darkMode ? 'text-white' : 'text-black'} text-xs border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 30-Day Requests Trend - Line Chart */}
                            <ChartCard title={getChartTitle()} delay={0.6} darkMode={darkMode}>
                                <ResponsiveContainer width="100%" height={300} minWidth={300} minHeight={300}>
                                    <LineChart data={lineChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                            contentStyle={{
                                                backgroundColor: "white",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "0.5rem",
                                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1"
                                            }}
                                            formatter={(value, name) => [value, 'Requests']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="requests"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            {/* Spacer between line chart and pie chart */}
                            <div className="hidden xl:block h-6"></div>

                            {/* Pie chart for larger screens - side by side with line chart */}
                            <div className="hidden xl:block">
                                <ChartCard title={`Request Evaluation Status Breakdown (Total: ${totalRequests})`} delay={0.5} darkMode={darkMode}>
                                    <ResponsiveContainer width="100%" height={300} minWidth={300} minHeight={300}>
                                        <PieChart>
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="count"
                                                nameKey="status"
                                                label={renderCustomLabel}
                                                labelLine={false}
                                            >
                                                {pieChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={data.requestEvaluations.length > 0 ? COLORS[index % COLORS.length] : '#e5e7eb'} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomPieTooltip />} />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                formatter={(value, entry) => (
                                                    <span style={{ color: entry.color, fontSize: '12px', fontWeight: '500' }}>
                                                        {value} ({entry.payload.count})
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartCard>
                            </div>
                        </div>

                        {/* Recently Logged In Users and Activity Logs Panel */}
                        <div className="xl:col-span-1 space-y-6">
                            {isUserAdmin && <RecentLogins users={data.recentLogins} delay={0.7} darkMode={darkMode} />}
                            <RecentActivityLogs
                                logs={data.recentActivityLogs}
                                delay={isUserAdmin ? 0.8 : 0.7}
                                darkMode={darkMode}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
