import connectToDatabase from "../lib/db.js";
import { broadcastDashboardUpdate } from "../lib/socketBroadcast.js";

export class ActivityLogs{
    constructor(activity, createdby){
        this.activity = activity;
        this.createdby = createdby;
        this.datecreated = new Date();
    }

    static async saveActivity(activity, createdby){
        let connection;

        connection = await connectToDatabase(process.env.DB_SFC);

        const query = `INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED) VALUES (@activity, @createdby, @datecreated)`;

        const request = connection.request()
        .input('ACTIVITY', activity)
        .input('CREATEDBY', createdby)
        .input('DATECREATED', new Date().toISOString())

        const result = await request.query(query);

        if(result.rowsAffected && result.rowsAffected[0] > 0){
            // Broadcast activity log update to dashboard
            broadcastDashboardUpdate("activity-log-added", {
                activity,
                createdBy: createdby,
                dateCreated: new Date().toISOString(),
                timestamp: new Date().toISOString(),
            });
        }

    }

    static async getActivityLogsByUser(createdby, limit = 50, offset = 0){
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
                SELECT
                    ACTIVITY as activity,
                    CREATEDBY as createdBy,
                    DATECREATED as dateCreated
                FROM [ACTIVITY.LOGS.1]
                WHERE CREATEDBY = @createdby
                ORDER BY DATECREATED DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `;

            const result = await connection.request()
                .input('createdby', createdby)
                .input('limit', limit)
                .input('offset', offset)
                .query(query);

            return result.recordset.map((log, index) => ({
                id: index + offset + 1,
                activity: log.activity,
                createdBy: log.createdBy,
                dateCreated: log.dateCreated
            }));
        } catch (error) {
            console.error('Error fetching activity logs by user:', error);
            throw error;
        }
    }
}
