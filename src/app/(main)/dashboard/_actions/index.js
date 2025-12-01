'use server';

import connectToDatabase from '@/lib/db.js';

export async function getDashboardStats() {
  try {
    // Get request evaluation stats
    const sfcConnection = await connectToDatabase(process.env.DB_SFC);

    const requestStatsQuery = `
      SELECT REQUESTSTATUS, COUNT(*) as count
      FROM [PURCHASE.REQUESTHEADER.1]
      GROUP BY REQUESTSTATUS
    `;

    const requestStats = await sfcConnection.request().query(requestStatsQuery);
    const requestStatsData = requestStats.recordset;

    // Get total users
    const gdbConnection = await connectToDatabase(process.env.DB_NAME);
    const userQuery = `SELECT COUNT(*) as totalUsers FROM [SYSTEM.USERACCOUNT.1] WHERE IS_APPROVED = 'APPROVED'`;
    const userResult = await gdbConnection.request().query(userQuery);
    const totalUsers = userResult.recordset[0].totalUsers;

    // For recently logged in, since no login tracking, we'll count users active in last 30 days (based on MODIFIEDDATE)
    const recentUsersQuery = `SELECT COUNT(*) as recentUsers FROM [SYSTEM.USERACCOUNT.1] WHERE IS_APPROVED = 'APPROVED' AND LOGGEDIN >= DATEADD(DAY, -30, GETDATE())`;
    const recentResult = await gdbConnection.request().query(recentUsersQuery);
    const recentUsers = recentResult.recordset[0].recentUsers;

    return {
      requestStats: requestStatsData,
      totalUsers,
      recentUsers
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      requestStats: [],
      totalUsers: 0,
      recentUsers: 0
    };
  }
}
