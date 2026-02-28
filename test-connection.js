const sql = require('mssql');

const config = {
  server: '127.0.0.1',
  database: 'RIS_System',
  user: 'sa',
  password: 'asd@123',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function test() {
  try {
    console.log('🔌 Testing connection with config:', {
      server: config.server,
      database: config.database,
      user: config.user,
      port: config.port,
    });
    
    const pool = await sql.connect(config);
    console.log('✅ Connected successfully!');
    
    const result = await pool.request().query('SELECT @@VERSION');
    console.log('✅ Query executed, version:', result.recordset[0]);
    
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

test();
