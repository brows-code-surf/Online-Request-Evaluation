import sql from 'mssql';

const pools = new Map();

export async function connectToDatabase(dbName) {
  const database = dbName || process.env.DB_NAME;

  if (pools.has(database)) {
    return pools.get(database);
  }

  const config = {
    server: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  };

  const pool = new sql.ConnectionPool(config);
  await pool.connect();

  console.log(`Connected to DB: ${database}`);

  pools.set(database, pool);
  return pool;
}


export default connectToDatabase;