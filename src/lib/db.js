import sql from 'mssql';

const pools = new Map();

export async function connectToDatabase(dbName) {
  // If no dbName provided, use default DB_NAME
  const database = dbName || process.env.DB_NAME;
  
  if (!process.env.DB_HOST) throw new Error('DB_HOST environment variable is required');
  if (!process.env.DB_USER) throw new Error('DB_USER environment variable is required');
  if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD environment variable is required');
  if (!database) throw new Error('Database name is required');

  if (pools.has(database)) {
    return pools.get(database);
  }

  try {
    const config = {
      server: String(process.env.DB_HOST),
      user: String(process.env.DB_USER),
      password: String(process.env.DB_PASSWORD),
      database: String(database),
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    };

    const pool = await sql.connect(config);
    console.log(`SQL Server connected to ${database}`);
    
    pools.set(database, pool);
    return pool;
  } catch (error) {
    console.error("SQL Server connection error:", {
      message: error.message,
      code: error.code,
      database: database
    });
    throw error;
  }
}

export default connectToDatabase;