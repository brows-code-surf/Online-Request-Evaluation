import sql from 'mssql';

export async function connectToDatabase() {
  if (!process.env.DB_HOST) throw new Error('DB_HOST environment variable is required');
  if (!process.env.DB_USER) throw new Error('DB_USER environment variable is required');
  if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD environment variable is required');
  if (!process.env.DB_NAME) throw new Error('DB_NAME environment variable is required');

  try {
    const config = {
      server: String(process.env.DB_HOST),
      user: String(process.env.DB_USER),
      password: String(process.env.DB_PASSWORD),
      database: String(process.env.DB_NAME),
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    };

    const pool = await sql.connect(config);
    console.log("SQL Server connected");
    return pool;
  } catch (error) {
    console.error("SQL Server connection error:", {
      message: error.message,
      code: error.code
    });
    throw error;
  }
}

export default connectToDatabase;