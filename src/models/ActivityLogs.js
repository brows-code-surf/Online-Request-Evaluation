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
}
