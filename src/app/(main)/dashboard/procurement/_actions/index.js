'use server';

import 'server-only';
import Dashboard from '@/models/Dashboard.js';
import UserProfile from '@/models/UserProfile.js';

export async function getDashboardStats(user = null, isAdmin = false, days = 30, startDate = null, endDate = null) {
    const dashboard = new Dashboard();

    try {
        // Get current stats
        const stats = isAdmin
            ? await dashboard.getUserStats(null, days, startDate, endDate)
            : await dashboard.getUserRequestStats(user?.empName, days, startDate, endDate);

        // Determine stat type based on admin/user
        const statTypeMap = isAdmin
            ? {
                totalUsers: 'totalUsers',
                activeUsers: 'activeUsers',
                totalPurchaseOrders: 'totalPurchaseOrders',
                pendingRequests: 'pendingRequests',
                requestsLast24h: 'requestsLast24h'
              }
            : {
                totalUsers: 'totalRequests',
                activeUsers: 'activeRequests',
                totalPurchaseOrders: 'totalPurchaseOrders',
                pendingRequests: 'pendingRequests',
                requestsLast24h: 'requestsLast24h'
              };

        // Get historical data for each stat type - pass user object for non-admin
        const historicalTotalUsers = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.totalUsers, 7, startDate, endDate);
        const historicalActiveUsers = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.activeUsers, 7, startDate, endDate);
        const historicalTotalPurchaseOrders = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.totalPurchaseOrders, 7, startDate, endDate);
        const historicalPendingRequests = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.pendingRequests, 7, startDate, endDate);
        const historicalRequestsLast24h = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.requestsLast24h, 7, startDate, endDate);

        // Calculate percent changes using the new method
        const percentChanges = {
            totalUsers: dashboard.calculatePercentChange(historicalTotalUsers),
            activeUsers: dashboard.calculatePercentChange(historicalActiveUsers),
            totalPurchaseOrders: dashboard.calculatePercentChange(historicalTotalPurchaseOrders),
            pendingRequests: dashboard.calculatePercentChange(historicalPendingRequests),
            requestsLast24h: dashboard.calculatePercentChange(historicalRequestsLast24h)
        };

        // Get sparkline data (extended for visualization)
        const sparklineHistoricalTotalUsers = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.totalUsers, 30, startDate, endDate);
        const sparklineHistoricalActiveUsers = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.activeUsers, 30, startDate, endDate);
        const sparklineHistoricalTotalPurchaseOrders = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.totalPurchaseOrders, 30, startDate, endDate);
        const sparklineHistoricalPendingRequests = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.pendingRequests, 30, startDate, endDate);
        const sparklineHistoricalRequestsLast24h = await dashboard.getHistoricalData(!isAdmin ? user : null, isAdmin, statTypeMap.requestsLast24h, 30, startDate, endDate);

        return {
            stats: {
                totalUsers: stats.totalUsers || 0,
                activeUsers: stats.activeUsers || 0,
                totalPurchaseOrders: await dashboard.getTotalPurchaseOrders(!isAdmin ? user : null, days, startDate, endDate),
                pendingRequests: stats.pendingRequests || 0,
                requestsLast24h: stats.requestsLast24h || 0,
                sparklines: {
                    totalUsers: sparklineHistoricalTotalUsers.map(d => d.value),
                    activeUsers: sparklineHistoricalActiveUsers.map(d => d.value),
                    totalPurchaseOrders: sparklineHistoricalTotalPurchaseOrders.map(d => d.value),
                    pendingRequests: sparklineHistoricalPendingRequests.map(d => d.value),
                    requestsLast24h: sparklineHistoricalRequestsLast24h.map(d => d.value)
                },
                percentChanges: percentChanges
            },
            totalRequests: await dashboard.getTotalRequests(!isAdmin ? user : null, days, startDate, endDate),
            requestEvaluations: isAdmin ? await dashboard.getRequestEvaluationStats(days, startDate, endDate) : await dashboard.getUserRequestEvaluationStats(user?.empName, days, startDate, endDate),
            thirtyDayTrend: isAdmin ? await dashboard.getThirtyDayTrend(days, startDate, endDate) : await dashboard.getUserThirtyDayTrend(user?.empName, days, startDate, endDate),
            recentLogins: isAdmin ? await dashboard.getRecentLogins() : [],
            recentActivityLogs: isAdmin ? await dashboard.getRecentActivityLogs() : await dashboard.getUserRecentActivityLogs(user?.empName)
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Return empty data structure on error
        return {
            stats: {
                totalUsers: 0,
                activeUsers: 0,
                totalPurchaseOrders: 0,
                pendingRequests: 0,
                requestsLast24h: 0,
                sparklines: {
                    totalUsers: [],
                    activeUsers: [],
                    totalPurchaseOrders: [],
                    pendingRequests: [],
                    requestsLast24h: []
                },
                percentChanges: {
                    totalUsers: 0,
                    activeUsers: 0,
                    totalPurchaseOrders: 0,
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

export async function getDashboardTrend(user = null, isAdmin = false, days = 30) {
    const dashboard = new Dashboard();

    try {
        return isAdmin
            ? await dashboard.getThirtyDayTrend(days)
            : await dashboard.getUserThirtyDayTrend(user?.empName, days);
    } catch (error) {
        console.error('Error fetching trend:', error);
        return Array.from({ length: days }, (_, i) => ({
            date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            requests: 0
        }));
    }
}

export async function getProcurementPerformance(user = null, isAdmin = false, days = 30, startDate = null, endDate = null) {
    const dashboard = new Dashboard();

    try {
        return await dashboard.getProcurementPerformanceMetrics(user, isAdmin, days, startDate, endDate);
    } catch (error) {
        console.error('Error fetching procurement performance:', error);
        return {
            averageCompletionTime: { days: 0, formatted: 'N/A' },
            onTimeDelivery: { percentage: 0, onTimeCount: 0, totalCompleted: 0 },
            earlyRequests: { count: 0, percentage: 0 },
            timeToServe: { averageDays: 0, totalRequests: 0, servedWithinWeek: 0, weekEfficiency: 0 },
            totalSpend: { amount: 0, utilization: 0 }
        };
    }
}

export async function getProcurementEfficiencyTrends(user = null, isAdmin = false, months = 6, startDate = null, endDate = null) {
    const dashboard = new Dashboard();

    try {
        return await dashboard.getProcurementEfficiencyTrends(user, isAdmin, months, startDate, endDate);
    } catch (error) {
        console.error('Error fetching procurement efficiency trends:', error);
        return [];
    }
}

export async function getSpendTrends(user = null, isAdmin = false, months = 6, startDate = null, endDate = null) {
    const dashboard = new Dashboard();

    try {
        return await dashboard.getSpendTrends(user, isAdmin, months, startDate, endDate);
    } catch (error) {
        console.error('Error fetching spend trends:', error);
        return [];
    }
}

export async function checkWelcomeModalStatus(employeeID) {
    try {
        // Get user login info from database
        const user = await UserProfile.getUserByEmployeeID(employeeID);

        if (!user) {
            return { shouldShowModal: false };
        }

        // Check if LOGGEDIN date exists and matches today
        if (!user.loggedIn) {
            return { shouldShowModal: false };
        }

        const loggedInDate = new Date(user.loggedIn);
        const today = new Date();

        // Compare dates (ignoring time)
        const loggedInDateStr = loggedInDate.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];

        const shouldShowModal = loggedInDateStr === todayStr;

        return { shouldShowModal };
    } catch (error) {
        console.error('Error checking welcome modal status:', error);
        return { shouldShowModal: false };
    }
}
