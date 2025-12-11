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

    // Server action to get 30-day request trend
    async getThirtyDayTrend() {
        try {
            return await RequestEvaluation.getThirtyDayRequestsTrend();
        } catch (error) {
            console.error('Error fetching 30-day trend:', error);
            return Array.from({ length: 30 }, (_, i) => ({
                date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                requests: 0
            }));
        }
    }

    // Server action to get user stats
    async getUserStats() {
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
            const pendingRequestsQuery = `
      SELECT COUNT(DISTINCT PRH.REFERENCENO) as count
      FROM [PURCHASE.REQUESTHEADER.1] PRH
      INNER JOIN [PURCHASE.REQUESTDETAILS.1] PRD ON PRH.REFERENCENO = PRD.REFERENCENO
      WHERE PRD.ITEMSTATUS IN ('FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME')
    `;
            const pendingRequestsResult = await sfcConnection.request().query(pendingRequestsQuery);
            const pendingRequests = pendingRequestsResult.recordset[0].count;

            // Requests in last 24 hours from SFC
            const requestsLast24hQuery = `SELECT COUNT(*) as count FROM [PURCHASE.REQUESTHEADER.1] WHERE DATEREQUESTED >= DATEADD(HOUR, -24, GETDATE())`;
            const requestsLast24hResult = await sfcConnection.request().query(requestsLast24hQuery);
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
}

export default Dashboard;
