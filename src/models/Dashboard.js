'use server';

import 'server-only';
import connectToDatabase from '@/lib/db.js';
import RequestEvaluation from '@/models/RequestEvaluation.js';
class Dashboard {
    // Server action to get request evaluation status counts
    async getRequestEvaluationStats() {
        try {
            return await RequestEvaluation.getRequestEvaluationStatusBreakdown();
        } catch (error) {
            console.error('Error fetching request evaluation stats:', error);
            return [];
        }
    }

    // Server action to get request trend for specified number of days
    async getThirtyDayTrend(days = 30) {
        try {
            return await RequestEvaluation.getThirtyDayRequestsTrend(days);
        } catch (error) {
            console.error(`Error fetching ${days}-day trend:`, error);
            return Array.from({ length: days }, (_, i) => ({
                date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                requests: 0
            }));
        }
    }

    // Server action to get total requests count
    async getTotalRequests(user = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            if (user && user.empName) {
                // For non-admin users: count requests where REQUESTEDBY = empName
                const query = `SELECT COUNT(*) as count FROM [PURCHASE.REQUESTHEADER.1] WHERE REQUESTEDBY = @empName`;
                const result = await connection.request()
                    .input('empName', user.empName)
                    .query(query);
                return result.recordset[0].count;
            } else {
                // For admin: count all requests in PURCHASE.REQUESTHEADER.1
                const query = `SELECT COUNT(*) as count FROM [PURCHASE.REQUESTHEADER.1]`;
                const result = await connection.request().query(query);
                return result.recordset[0].count;
            }
        } catch (error) {
            console.error('Error fetching total requests:', error);
            return 0;
        }
    }

    // Server action to get user stats
    async getUserStats(user = null) {
        let gdbConnection;
        let sfcConnection;
        try {
            // Connect to both databases
            gdbConnection = await connectToDatabase(process.env.DB_NAME); // GDB for users
            sfcConnection = await connectToDatabase(process.env.DB_SFC); // SFC for requests

            // Total users from GDB
            const totalUsersQuery = `SELECT COUNT(*) as count FROM [SYSTEM.USERACCOUNT.1] WHERE IS_APPROVED = 'APPROVED'`;
            const totalUsersResult = await gdbConnection.request().query(totalUsersQuery);
            const totalUsers = totalUsersResult.recordset[0].count;

            // Active users (logged in within last 30 days) from GDB
            const activeUsersQuery = `SELECT COUNT(*) as count FROM [SYSTEM.USERACCOUNT.1] WHERE IS_APPROVED = 'APPROVED' AND LOGGEDIN >= DATEADD(DAY, -30, GETDATE())`;
            const activeUsersResult = await gdbConnection.request().query(activeUsersQuery);
            const activeUsers = activeUsersResult.recordset[0].count;

            // Pending requests (FOR CONFIRMATION, FOR REQUEST APPROVAL, FOR PURCHASING LEAD TIME) from SFC
            // Admin sees all requests, regardless of posted status
            const pendingRequestsQuery = `
      SELECT COUNT(DISTINCT PRH.REFERENCENO) as count
      FROM [PURCHASE.REQUESTHEADER.1] PRH
      WHERE PRH.REQUESTSTATUS IN ('FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME')
    `;
            const pendingRequestsResult = await sfcConnection.request().query(pendingRequestsQuery);
            const pendingRequests = pendingRequestsResult.recordset[0].count;

            // Requests in last 24 hours from SFC - user-specific if user provided, otherwise all users
            let requestsLast24hQuery;
            let requestsLast24hResult;

            if (user && user.empName) {
                // User-specific: count requests created by this user in last 24 hours
                requestsLast24hQuery = `SELECT COUNT(*) as count FROM [PURCHASE.REQUESTHEADER.1] WHERE CREATEDBY = @userName AND DATEREQUESTED >= DATEADD(HOUR, -24, GETDATE())`;
                requestsLast24hResult = await sfcConnection.request()
                    .input('userName', user.empName)
                    .query(requestsLast24hQuery);
            } else {
                // Admin: count all requests in last 24 hours
                requestsLast24hQuery = `SELECT COUNT(*) as count FROM [PURCHASE.REQUESTHEADER.1] WHERE DATEREQUESTED >= DATEADD(HOUR, -24, GETDATE())`;
                requestsLast24hResult = await sfcConnection.request().query(requestsLast24hQuery);
            }

            const requestsLast24h = requestsLast24hResult.recordset[0].count;

            return {
                totalUsers,
                activeUsers,
                pendingRequests,
                requestsLast24h
            };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return {
                totalUsers: 0,
                activeUsers: 0,
                pendingRequests: 0,
                requestsLast24h: 0
            };
        }
    }

    // Server action to get recent logins
    async getRecentLogins() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_NAME); // GDB for user data

            const query = `
      SELECT
        EMPLOYEENAME as name,
        EMAIL as email,
        LOGGEDIN as lastLogin
      FROM [SYSTEM.USERACCOUNT.1]
      WHERE IS_APPROVED = 'APPROVED' AND LOGGEDIN IS NOT NULL
      ORDER BY LOGGEDIN DESC
    `;

            const result = await connection.request().query(query);

            return result.recordset.map((user, index) => ({
                id: index + 1,
                name: user.name,
                email: user.email,
                lastLogin: user.lastLogin
            }));
        } catch (error) {
            console.error('Error fetching recent logins:', error);
            return [];
        }
    }

    // Server action to get recent activity logs
    async getRecentActivityLogs() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC); // SFC for activity logs

            const query = `
      SELECT
        ACTIVITY as activity,
        CREATEDBY as createdBy,
        DATECREATED as dateCreated
      FROM [ACTIVITY.LOGS.1]
      ORDER BY DATECREATED DESC
    `;

            const result = await connection.request().query(query);

            return result.recordset.map((log, index) => ({
                id: index + 1,
                activity: log.activity,
                createdBy: log.createdBy,
                dateCreated: log.dateCreated
            }));
        } catch (error) {
            console.error('Error fetching recent activity logs:', error);
            return [];
        }
    }

    // User-specific methods for non-admin dashboard

    // Get user's request statistics (both created and assigned for evaluation)
    async getUserRequestStats(createdBy) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Total requests by user (only requests they created) - only posted requests
            const totalRequestsQuery = `
                SELECT COUNT(DISTINCT REFERENCENO) as count FROM [PURCHASE.REQUESTHEADER.1]
                WHERE IS_POSTED = 1 AND REQUESTEDBY = @createdBy
            `;
            const totalRequestsResult = await connection.request()
                .input('createdBy', createdBy)
                .query(totalRequestsQuery);
            const totalRequests = totalRequestsResult.recordset[0].count;

            // Active requests (not completed/cancelled) - for requests user created - only posted requests
            const activeRequestsQuery = `
                SELECT COUNT(DISTINCT REFERENCENO) as count
                FROM [PURCHASE.REQUESTHEADER.1]
                WHERE IS_POSTED = 1 AND REQUESTEDBY = @createdBy
                AND REQUESTSTATUS NOT IN ('COMPLETED', 'CANCELLED', 'APPROVED', 'REJECTED')
            `;
            const activeRequestsResult = await connection.request()
                .input('createdBy', createdBy)
                .query(activeRequestsQuery);
            const activeRequests = activeRequestsResult.recordset[0].count;

            // Pending requests for evaluation (only for requests user created)
            const pendingRequestsQuery = `
                SELECT COUNT(DISTINCT REFERENCENO) as count
                FROM [PURCHASE.REQUESTHEADER.1]
                WHERE REQUESTEDBY = @createdBy
                AND REQUESTSTATUS IN ('FOR POSTING', 'FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME')
            `;
            const pendingRequestsResult = await connection.request()
                .input('createdBy', createdBy)
                .query(pendingRequestsQuery);
            const pendingRequests = pendingRequestsResult.recordset[0].count;

            // Requests in last 24 hours (only for requests user created)
            const requestsLast24hQuery = `
                SELECT COUNT(DISTINCT REFERENCENO) as count FROM [PURCHASE.REQUESTHEADER.1]
                WHERE REQUESTEDBY = @createdBy
                AND DATEREQUESTED >= DATEADD(HOUR, -24, GETDATE())
            `;
            const requestsLast24hResult = await connection.request()
                .input('createdBy', createdBy)
                .query(requestsLast24hQuery);
            const requestsLast24h = requestsLast24hResult.recordset[0].count;

            return {
                totalRequests,
                activeRequests,
                pendingRequests,
                requestsLast24h
            };
        } catch (error) {
            console.error('Error fetching user request stats:', error);
            return {
                totalRequests: 0,
                activeRequests: 0,
                pendingRequests: 0,
                requestsLast24h: 0
            };
        }
    }

    // Get user's request evaluation statistics
    async getUserRequestEvaluationStats(createdBy) {
        try {
            return await RequestEvaluation.getUserRequestEvaluationStatusBreakdown(createdBy);
        } catch (error) {
            console.error('Error fetching user request evaluation stats:', error);
            return [];
        }
    }

    // Get user's request trend for specified number of days
    async getUserThirtyDayTrend(createdBy, days = 30) {
        try {
            return await RequestEvaluation.getUserThirtyDayRequestsTrend(createdBy, days);
        } catch (error) {
            console.error(`Error fetching user ${days}-day trend:`, error);
            return Array.from({ length: days }, (_, i) => ({
                date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                requests: 0
            }));
        }
    }

    // Get recent activity logs related to user's requests
    async getUserRecentActivityLogs(createdBy) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
                SELECT
                    ACTIVITY as activity,
                    CREATEDBY as createdBy,
                    DATECREATED as dateCreated
                FROM [ACTIVITY.LOGS.1]
                WHERE CREATEDBY = @createdBy OR ACTIVITY LIKE '%' + @createdBy + '%'
                ORDER BY DATECREATED DESC
            `;

            const result = await connection.request()
                .input('createdBy', createdBy)
                .query(query);

            return result.recordset.map((log, index) => ({
                id: index + 1,
                activity: log.activity,
                createdBy: log.createdBy,
                dateCreated: log.dateCreated
            }));
        } catch (error) {
            console.error('Error fetching user recent activity logs:', error);
            return [];
        }
    }

    // Get historical data for sparklines and percent change calculations
    async getHistoricalData(user = null, isAdmin = false, statType, days = 10) {
        let connection;
        try {
            if (isAdmin) {
                connection = await connectToDatabase(statType.includes('Users') ? process.env.DB_NAME : process.env.DB_SFC);

                switch (statType) {
                    case 'totalUsers':
                        // Total approved users over time (simplified - we don't have historical user creation dates)
                        // Return current value for all days as approximation
                        const currentTotalUsers = await this.getUserStats(null);
                        return Array.from({ length: days }, (_, i) => ({
                            date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            value: currentTotalUsers.totalUsers
                        }));

                    case 'activeUsers':
                        // Active users (logged in within 30 days) over time
                        const query = `
                            SELECT CAST(DATEADD(DAY, -30, GETDATE()) AS DATE) as date, COUNT(*) as count 
                            FROM [SYSTEM.USERACCOUNT.1]
                            WHERE IS_APPROVED = 'APPROVED' AND LOGGEDIN >= DATEADD(DAY, -30, GETDATE())
                        `;
                        const result = await connection.request().query(query);
                        const activeUserCount = result.recordset[0]?.count || 0;
                        
                        return Array.from({ length: days }, (_, i) => ({
                            date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            value: activeUserCount
                        }));

                    case 'pendingRequests':
                        // Pending requests over time - count requests that were in pending status on each date
                        const pendingQuery = `
                            SELECT CAST(DATEREQUESTED AS DATE) as date, COUNT(DISTINCT PRH.REFERENCENO) as count
                            FROM [PURCHASE.REQUESTHEADER.1] PRH
                            WHERE PRH.REQUESTSTATUS IN ('FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME')
                            AND DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())
                            GROUP BY CAST(DATEREQUESTED AS DATE)
                        `;
                        const pendingResult = await connection.request().query(pendingQuery);
                        return this._fillMissingDates(pendingResult.recordset, days, 'count');

                    case 'requestsLast24h':
                        // Daily request counts over time (each day shows total requests created that day)
                        const requestsQuery = `
                            SELECT CAST(DATEREQUESTED AS DATE) as date, COUNT(*) as count
                            FROM [PURCHASE.REQUESTHEADER.1]
                            WHERE DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())
                            GROUP BY CAST(DATEREQUESTED AS DATE)
                        `;
                        const requestsResult = await connection.request().query(requestsQuery);
                        return this._fillMissingDates(requestsResult.recordset, days, 'count');

                    default:
                        return Array.from({ length: days }, (_, i) => ({
                            date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            value: 0
                        }));
                }
            } else {
                // User-specific historical data
                if (!user || !user.empName) {
                    // Return fallback data if user is not provided
                    return Array.from({ length: days }, (_, i) => ({
                        date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        value: 0
                    }));
                }

                connection = await connectToDatabase(process.env.DB_SFC);

                switch (statType) {
                    case 'totalRequests':
                        // User's total requests created on each day
                        const totalQuery = `
                            SELECT CAST(DATEREQUESTED AS DATE) as date, COUNT(DISTINCT REFERENCENO) as count
                            FROM [PURCHASE.REQUESTHEADER.1]
                            WHERE IS_POSTED = 1 AND REQUESTEDBY = @userName
                            AND DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())
                            GROUP BY CAST(DATEREQUESTED AS DATE)
                        `;
                        const totalResult = await connection.request()
                            .input('userName', user.empName)
                            .query(totalQuery);
                        return this._fillMissingDates(totalResult.recordset, days, 'count');

                    case 'activeRequests':
                        // User's active requests created on each day
                        const activeReqQuery = `
                            SELECT CAST(DATEREQUESTED AS DATE) as date, COUNT(DISTINCT REFERENCENO) as count
                            FROM [PURCHASE.REQUESTHEADER.1]
                            WHERE IS_POSTED = 1 AND REQUESTEDBY = @userName
                            AND REQUESTSTATUS NOT IN ('COMPLETED', 'CANCELLED', 'APPROVED', 'REJECTED')
                            AND DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())
                            GROUP BY CAST(DATEREQUESTED AS DATE)
                        `;
                        const activeReqResult = await connection.request()
                            .input('userName', user.empName)
                            .query(activeReqQuery);
                        return this._fillMissingDates(activeReqResult.recordset, days, 'count');

                    case 'pendingRequests':
                        // User's pending requests created on each day
                        const userPendingQuery = `
                            SELECT CAST(DATEREQUESTED AS DATE) as date, COUNT(DISTINCT REFERENCENO) as count
                            FROM [PURCHASE.REQUESTHEADER.1]
                            WHERE REQUESTEDBY = @userName
                            AND REQUESTSTATUS IN ('FOR POSTING', 'FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME')
                            AND DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())
                            GROUP BY CAST(DATEREQUESTED AS DATE)
                        `;
                        const userPendingResult = await connection.request()
                            .input('userName', user.empName)
                            .query(userPendingQuery);
                        return this._fillMissingDates(userPendingResult.recordset, days, 'count');

                    case 'requestsLast24h':
                        // User's daily request activity over time
                        const userReqQuery = `
                            SELECT CAST(DATEREQUESTED AS DATE) as date, COUNT(DISTINCT REFERENCENO) as count
                            FROM [PURCHASE.REQUESTHEADER.1]
                            WHERE REQUESTEDBY = @userName
                            AND DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())
                            GROUP BY CAST(DATEREQUESTED AS DATE)
                        `;
                        const userReqResult = await connection.request()
                            .input('userName', user.empName)
                            .query(userReqQuery);
                        return this._fillMissingDates(userReqResult.recordset, days, 'count');

                    default:
                        return Array.from({ length: days }, (_, i) => ({
                            date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            value: 0
                        }));
                }
            }
        } catch (error) {
            console.error(`Error fetching historical data for ${statType}:`, error);
            // Return fallback data
            return Array.from({ length: days }, (_, i) => ({
                date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                value: 0
            }));
        }
    }

    // Helper method to fill missing dates with zeros
    _fillMissingDates(recordset, days, countField) {
        const trendDays = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const existing = recordset.find(r => {
                const recordDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
                return recordDate === dateStr;
            });
            trendDays.push({
                date: dateStr,
                value: existing ? existing[countField] : 0
            });
        }
        return trendDays;
    }

    // Calculate percent change: (today - past7DaysAverage) / past7DaysAverage * 100
    calculatePercentChange(historicalData) {
        if (!historicalData || historicalData.length === 0) return 0;
        
        const today = historicalData[historicalData.length - 1]?.value || 0;
        const past7Days = historicalData.slice(-7);
        
        // Filter out zero values for a more meaningful average
        const nonZeroDays = past7Days.filter(item => item.value > 0);
        
        // If no non-zero days in past 7, just compare today to yesterday
        if (nonZeroDays.length === 0) {
            if (past7Days.length < 2) return 0;
            const yesterday = past7Days[past7Days.length - 2]?.value || 0;
            if (yesterday === 0 && today === 0) return 0;
            if (yesterday === 0) return 100; // New activity today
            return ((today - yesterday) / yesterday) * 100;
        }
        
        // Calculate average of non-zero days
        const average = nonZeroDays.reduce((sum, item) => sum + item.value, 0) / nonZeroDays.length;
        
        if (average === 0) return 0;
        return ((today - average) / average) * 100;
    }
}

export default Dashboard;
