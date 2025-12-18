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

            // Pending requests (FOR CONFIRMATION, FOR REQUEST APPROVAL, FOR PURCHASING LEAD TIME) from SFC - only posted requests
            const pendingRequestsQuery = `
      SELECT COUNT(DISTINCT PRH.REFERENCENO) as count
      FROM [PURCHASE.REQUESTHEADER.1] PRH
      WHERE PRH.IS_POSTED = 1 AND PRH.REQUESTSTATUS IN ('FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME')
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

            // Total requests by user (both created and assigned for evaluation) - only posted requests
            const totalRequestsQuery = `
                SELECT COUNT(DISTINCT REFERENCENO) as count FROM [PURCHASE.REQUESTHEADER.1]
                WHERE IS_POSTED = 1 AND (CREATEDBY = @createdBy
                OR REVIEWER = @createdBy
                OR APPROVER = @createdBy
                OR ADDRESSEDTO = @createdBy)
            `;
            const totalRequestsResult = await connection.request()
                .input('createdBy', createdBy)
                .query(totalRequestsQuery);
            const totalRequests = totalRequestsResult.recordset[0].count;

            // Active requests (not completed/cancelled) - for requests user created or is assigned to - only posted requests
            const activeRequestsQuery = `
                SELECT COUNT(DISTINCT PRH.REFERENCENO) as count
                FROM [PURCHASE.REQUESTHEADER.1] PRH
                INNER JOIN [PURCHASE.REQUESTDETAILS.1] PRD ON PRH.REFERENCENO = PRD.REFERENCENO
                WHERE PRH.IS_POSTED = 1 AND (PRH.CREATEDBY = @createdBy OR PRH.REVIEWER = @createdBy OR PRH.APPROVER = @createdBy OR PRH.ADDRESSEDTO = @createdBy)
                AND PRD.ITEMSTATUS NOT IN ('COMPLETED', 'CANCELLED', 'APPROVED', 'REJECTED')
            `;
            const activeRequestsResult = await connection.request()
                .input('createdBy', createdBy)
                .query(activeRequestsQuery);
            const activeRequests = activeRequestsResult.recordset[0].count;

            // Pending requests for evaluation (assigned to user) - requests they need to act on
            const pendingRequestsQuery = `
                SELECT COUNT(DISTINCT PRH.REFERENCENO) as count
                FROM [PURCHASE.REQUESTHEADER.1] PRH
                INNER JOIN [PURCHASE.REQUESTDETAILS.1] PRD ON PRH.REFERENCENO = PRD.REFERENCENO
                WHERE ((PRH.REVIEWER = @createdBy AND PRH.REQUESTSTATUS = 'FOR POSTING')
                    OR (PRH.REVIEWER = @createdBy AND PRH.REQUESTSTATUS = 'FOR CONFIRMATION')
                    OR (PRH.APPROVER = @createdBy AND PRH.REQUESTSTATUS = 'FOR REQUEST APPROVAL')
                    OR (PRH.ADDRESSEDTO = @createdBy AND PRH.REQUESTSTATUS = 'FOR PURCHASING LEAD TIME'))
                AND PRD.ITEMSTATUS IN ('FOR POSTING', 'FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME')
            `;
            const pendingRequestsResult = await connection.request()
                .input('createdBy', createdBy)
                .query(pendingRequestsQuery);
            const pendingRequests = pendingRequestsResult.recordset[0].count;

            // Requests in last 24 hours (both created and assigned)
            const requestsLast24hQuery = `
                SELECT COUNT(DISTINCT REFERENCENO) as count FROM [PURCHASE.REQUESTHEADER.1]
                WHERE (CREATEDBY = @createdBy OR REVIEWER = @createdBy OR APPROVER = @createdBy OR ADDRESSEDTO = @createdBy)
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
}

export default Dashboard;
