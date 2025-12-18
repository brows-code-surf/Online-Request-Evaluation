'use server';

import 'server-only';
import Dashboard from '@/models/Dashboard.js';

export async function getDashboardStats(user = null, isAdmin = false, days = 30) {
    try {
        const dashboard = new Dashboard();

        let stats, requestEvaluations, requestTrend, recentLogins, recentActivityLogs;

        if (isAdmin) {
            // Admin: fetch system-wide data
            [stats, requestEvaluations, requestTrend, recentLogins, recentActivityLogs] = await Promise.all([
                dashboard.getUserStats(null), // Pass null for admin to get all users' requests
                dashboard.getRequestEvaluationStats(),
                dashboard.getThirtyDayTrend(days),
                dashboard.getRecentLogins(),
                dashboard.getRecentActivityLogs()
            ]);
        } else if (user) {
            // Non-admin: fetch user-specific data
            [stats, requestEvaluations, requestTrend, recentActivityLogs] = await Promise.all([
                dashboard.getUserRequestStats(user.empName),
                dashboard.getUserRequestEvaluationStats(user.empName),
                dashboard.getUserThirtyDayTrend(user.empName, days),
                dashboard.getUserRecentActivityLogs(user.empName)
            ]);
            recentLogins = []; // Non-admins don't see recent logins
        } else {
            throw new Error('User information is required');
        }

        // Generate sparkline data (last 10 values - using current value for all)
        const generateSparklines = (currentValue) => {
            return Array.from({ length: 10 }, () => currentValue);
        };

        // Calculate percent changes (set to 0 for now - could be calculated from historical data)
        const percentChanges = {
            totalUsers: 0,
            activeUsers: 0,
            pendingRequests: 0,
            requestsLast24h: 0,
            // For non-admin, these become totalRequests, activeRequests, etc.
            totalRequests: 0,
            activeRequests: 0
        };

        // Transform stats for non-admin users
        let transformedStats = stats;
        if (!isAdmin) {
            transformedStats = {
                totalUsers: stats.totalRequests || 0,
                activeUsers: stats.activeRequests || 0,
                pendingRequests: stats.pendingRequests || 0,
                requestsLast24h: stats.requestsLast24h || 0,
                sparklines: {
                    totalUsers: generateSparklines(stats.totalRequests || 0),
                    activeUsers: generateSparklines(stats.activeRequests || 0),
                    pendingRequests: generateSparklines(stats.pendingRequests || 0),
                    requestsLast24h: generateSparklines(stats.requestsLast24h || 0)
                },
                percentChanges: {
                    totalUsers: 0,
                    activeUsers: 0,
                    pendingRequests: 0,
                    requestsLast24h: 0
                }
            };
        } else {
            // Admin stats
            transformedStats = {
                ...stats,
                sparklines: {
                    totalUsers: generateSparklines(stats.totalUsers),
                    activeUsers: generateSparklines(stats.activeUsers),
                    pendingRequests: generateSparklines(stats.pendingRequests),
                    requestsLast24h: generateSparklines(stats.requestsLast24h)
                },
                percentChanges
            };
        }

        return {
            stats: transformedStats,
            requestEvaluations,
            thirtyDayTrend: requestTrend,
            recentLogins,
            recentActivityLogs
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Return empty data structure on error
        return {
            stats: {
                totalUsers: 0,
                activeUsers: 0,
                pendingRequests: 0,
                requestsLast24h: 0,
                sparklines: {
                    totalUsers: [],
                    activeUsers: [],
                    pendingRequests: [],
                    requestsLast24h: []
                },
                percentChanges: {
                    totalUsers: 0,
                    activeUsers: 0,
                    pendingRequests: 0,
                    requestsLast24h: 0
                }
            },
            requestEvaluations: [],
            thirtyDayTrend: [],
            recentLogins: [],
            recentActivityLogs: []
        };
    }
}
