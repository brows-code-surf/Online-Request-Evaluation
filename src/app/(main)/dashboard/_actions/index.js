'use server';

import 'server-only';
import Dashboard from '@/models/Dashboard.js';

export async function getDashboardStats() {
    try {
        const dashboard = new Dashboard();

        // Fetch all data concurrently
        const [userStats, requestEvaluations, thirtyDayTrend, recentLogins] = await Promise.all([
            dashboard.getUserStats(),
            dashboard.getRequestEvaluationStats(),
            dashboard.getThirtyDayTrend(),
            dashboard.getRecentLogins()
        ]);

        // Generate sparkline data (last 10 values - using current value for all)
        const generateSparklines = (currentValue) => {
            return Array.from({ length: 10 }, () => currentValue);
        };

        // Calculate percent changes (set to 0 for now - could be calculated from historical data)
        const percentChanges = {
            totalUsers: 0,
            activeUsers: 0,
            pendingRequests: 0,
            requestsLast24h: 0
        };

        return {
            stats: {
                ...userStats,
                sparklines: {
                    totalUsers: generateSparklines(userStats.totalUsers),
                    activeUsers: generateSparklines(userStats.activeUsers),
                    pendingRequests: generateSparklines(userStats.pendingRequests),
                    requestsLast24h: generateSparklines(userStats.requestsLast24h)
                },
                percentChanges
            },
            requestEvaluations,
            thirtyDayTrend,
            recentLogins
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
            recentLogins: []
        };
    }
}
