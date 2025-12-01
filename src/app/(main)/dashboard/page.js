'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion } from 'framer-motion';
import AdminOnly from '@/utils/adminOnly';
import { getDashboardStats } from './_actions/index.js';
import { Users, Activity, FileText, TrendingUp } from 'lucide-react';
import { StatCard } from "./_components/StatCard.js";
import { ChartCard } from "./_components/ChartCard";
import HeaderNavBar from '../../_components/headerNavBar';
import Loader from '@/app/_components/loader.js';

const COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(350, 89%, 60%)", "hsl(270, 70%, 60%)"];

export default function Dashboard() {
    const [stats, setStats] = useState({
        requestStats: [],
        totalUsers: 0,
        recentUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await getDashboardStats();
                setStats(data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <AdminOnly>
                <Loader />
            </AdminOnly>
        );
    }

    const totalRequests = stats.requestStats.reduce((acc, stat) => acc + stat.count, 0);
    const pendingRequests = stats.requestStats.find(stat => stat.REQUESTSTATUS === "FOR CONFIRMATION")?.count || 0;
    const activeRequests = stats.requestStats
        .filter(stat => ["FOR CONFIRMATION", "FOR REQUEST APPROVAL", "FOR PURCHASING LEAD TIME"].includes(stat.REQUESTSTATUS))
        .reduce((acc, stat) => acc + stat.count, 0);
    const completedRequests = stats.requestStats
        .filter(stat => ["FOR CANVASSING", "APPROVED"].includes(stat.REQUESTSTATUS))
        .reduce((acc, stat) => acc + stat.count, 0);
    const rejectedRequests = stats.requestStats
        .filter(stat => stat.REQUESTSTATUS === "REJECTED")
        .reduce((acc, stat) => acc + stat.count, 0);

    return (
        <AdminOnly>
            <div className="min-h-screen bg-white relative overflow-hidden">
                {/* Ambient background effects */}
                <HeaderNavBar />
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
                    <div className="absolute top-1/2 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
                    <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-stat-amber/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />
                </div>

                <div className="relative z-10 p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="mb-8"
                        >
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-dashboard-gradient-start to-dashboard-gradient-end bg-clip-text text-transparent mb-2">
                                Admin Dashboard
                            </h1>
                            <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
                        </motion.div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard
                                title="Total Requests"
                                value={totalRequests}
                                icon={FileText}
                                colorClass="from-stat-blue to-primary"
                                delay={0.1}
                            />
                            <StatCard
                                title="Total Users"
                                value={stats.totalUsers}
                                icon={Users}
                                colorClass="from-stat-emerald to-accent"
                                delay={0.2}
                            />
                            <StatCard
                                title="Active Users (30d)"
                                value={stats.recentUsers}
                                icon={Activity}
                                colorClass="from-stat-amber to-stat-amber"
                                delay={0.3}
                            />
                            <StatCard
                                title="Pending Requests"
                                value={pendingRequests}
                                icon={TrendingUp}
                                colorClass="from-stat-rose to-destructive"
                                delay={0.4}
                            />
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <ChartCard title="Request Status Distribution" delay={0.5}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stats.requestStats}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.8} />
                                                <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                        <XAxis
                                            dataKey="REQUESTSTATUS"
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                            interval={0}
                                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                        />
                                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--glass-bg))",
                                                border: "1px solid hsl(var(--glass-border))",
                                                borderRadius: "0.5rem",
                                                backdropFilter: "blur(16px)",
                                            }}
                                        />
                                        <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Request Status Overview" delay={0.6}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <defs>
                                            {COLORS.map((color, index) => (
                                                <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                                                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <Pie
                                            data={stats.requestStats}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ REQUESTSTATUS, count, percent }) =>
                                                `${REQUESTSTATUS.split(" ")[0]}: ${count} (${(percent * 100).toFixed(0)}%)`
                                            }
                                            outerRadius={90}
                                            dataKey="count"
                                        >
                                            {stats.requestStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={`url(#pieGradient${index % COLORS.length})`} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--glass-bg))",
                                                border: "1px solid hsl(var(--glass-border))",
                                                borderRadius: "0.5rem",
                                                backdropFilter: "blur(16px)",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>

                        {/* System Overview */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.7 }}
                            className="relative overflow-hidden rounded-xl bg-glass-bg/70 backdrop-blur-glass border border-glass-border p-8 shadow-glass"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-stat-amber/5" />

                            <div className="relative">
                                <h2 className="text-2xl font-semibold text-foreground mb-6">System Overview</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-center p-6 rounded-lg bg-stat-blue/5 border border-stat-blue/20"
                                    >
                                        <p className="text-4xl font-bold text-stat-blue mb-2">{activeRequests}</p>
                                        <p className="text-sm text-muted-foreground">Active Requests</p>
                                    </motion.div>

                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-center p-6 rounded-lg bg-stat-emerald/5 border border-stat-emerald/20"
                                    >
                                        <p className="text-4xl font-bold text-stat-emerald mb-2">{completedRequests}</p>
                                        <p className="text-sm text-muted-foreground">Completed Requests</p>
                                    </motion.div>

                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-center p-6 rounded-lg bg-stat-rose/5 border border-stat-rose/20"
                                    >
                                        <p className="text-4xl font-bold text-stat-rose mb-2">{rejectedRequests}</p>
                                        <p className="text-sm text-muted-foreground">Rejected Requests</p>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </AdminOnly>
    );
}
