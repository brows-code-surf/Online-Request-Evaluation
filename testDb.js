import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

import connectToDatabase from "./src/lib/db.js";

export async function listTables() {
  try {
    console.log("Connecting to GDB...");
    const gdbConn = await connectToDatabase('GDB');
    const gdbTables = await gdbConn.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    console.log("GDB Tables:", gdbTables.recordset);

    console.log("\nConnecting to SFC...");
    const sfcConn = await connectToDatabase('SFC');
    const sfcTables = await sfcConn.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    console.log("SFC Tables:", sfcTables.recordset);
    
    process.exit(0);
  } catch (error) {
    console.error("Error listing tables:", error.message);
    process.exit(1);
  }
}

// Run this in your server startup to see available tables
listTables();
