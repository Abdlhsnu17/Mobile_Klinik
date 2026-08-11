const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- KONFIGURASI ---

// Root folder repository
const ROOT_DIR = path.resolve(__dirname, '..');
// Lokasi file SQL schema (sesuaikan jika path berbeda)
const SCHEMA_FILE_PATH = path.join(ROOT_DIR, 'database', 'schema.sql');
const SEED_FILE_PATH = path.join(ROOT_DIR, 'database', 'seeds', '01-seed.sql');

// Config untuk Admin (untuk membuat DB & User)
const adminConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_ADMIN_USER || 'root',      // User root/admin
  password: process.env.DB_ADMIN_PASSWORD || '',   // Password root
  multipleStatements: true,                        // Wajib true untuk import schema
};

// Config untuk Aplikasi (untuk test koneksi setelah setup)
const appConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'sistem_klinik',
  user: process.env.DB_USER || 'sistem_klinik',   // User aplikasi
  password: process.env.DB_PASSWORD ?? '', // Password aplikasi dikosongkan untuk dev lokal
};

// --- FUNGSI 1: SETUP DATABASE (Admin) ---
async function setupDatabase() {
  let conn;
  console.log('\n🚀 [STEP 1] Starting Database Setup...');
  
  try {
    // 1. Cek apakah file schema ada
    if (!fs.existsSync(SCHEMA_FILE_PATH)) {
      throw new Error(`File schema tidak ditemukan di: ${SCHEMA_FILE_PATH}`);
    }

    // 2. Koneksi sebagai Admin
    console.log('🔌 Connecting as Admin...', { host: adminConfig.host, user: adminConfig.user });
    conn = await mysql.createConnection(adminConfig);

    // 3. Buat Database dan User Aplikasi jika belum ada
    const dbName = appConfig.database;
    const dbUser = appConfig.user;
    const dbPassword = appConfig.password;

    console.log(`- Creating database '${dbName}' if not exists...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    
    console.log(`- Creating user '${dbUser}' if not exists...`);
    await conn.query(`CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';`);
    
    console.log(`- Granting privileges to '${dbUser}' on '${dbName}'...`);
    await conn.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';`);
    await conn.query(`FLUSH PRIVILEGES;`);

    // 4. Gunakan database yang baru dibuat untuk menjalankan skema
    await conn.changeUser({ database: dbName });
    console.log(`- Switched to database '${dbName}'.`);

    // 5. Baca dan jalankan file schema.sql
    console.log(`📂 Reading schema file: ${path.basename(SCHEMA_FILE_PATH)}`);
    const schemaSql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
    console.log(' Executing schema script (creating tables)...');
    await conn.query(schemaSql);

    // 6. Peringatan untuk file seed lama (jika ada)
    // Cukup berikan peringatan jika file seed lama masih ada dan berisi sesuatu.
    if (fs.existsSync(SEED_FILE_PATH) && fs.readFileSync(SEED_FILE_PATH, 'utf8').trim().length > 0) {
      const seedContent = fs.readFileSync(SEED_FILE_PATH, 'utf8').trim();
      if (!seedContent.startsWith('--')) {
        console.warn(
          `[PERINGATAN] File ${path.basename(SEED_FILE_PATH)} masih berisi data. ` +
          `Data seed awal kini dikelola oleh aplikasi backend, bukan dari file SQL. ` +
          `Anda bisa mengosongkan atau menghapus file seed ini.`
        );
      }
    }

    console.log('✅ [STEP 1] Setup Completed Successfully.\n');
  } catch (err) {
    console.error('❌ [STEP 1] Error during DB setup:', err.message);
    throw err; // Lempar error agar proses berhenti
  } finally {
    if (conn) await conn.end();
  }
}

// --- FUNGSI 2: TEST KONEKSI (App User) ---
async function testDatabaseConnection() {
  let connection;
  console.log('🚀 [STEP 2] Testing Application Connection...');

  try {
    console.log('📊 App Config:', {
      host: appConfig.host,
      user: appConfig.user,
      database: appConfig.database,
    });

    // 1. Coba login dengan user aplikasi yang baru dibuat
    connection = await mysql.createConnection(appConfig);
    console.log('✅ Connected successfully as App User!');

    // 2. Test query sederhana
    const [rows] = await connection.execute(
      'SELECT VERSION() as version, CURRENT_TIMESTAMP as now'
    );

    console.log('📋 Database Info:', {
      version: rows[0].version,
      timestamp: rows[0].now,
    });
    
    // 3. Cek apakah tabel benar-benar ada (Optional safety check)
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📚 Total tables found: ${tables.length}`);

    console.log('✅ [STEP 2] Test Passed. Database is ready!');
  } catch (error) {
    console.error('❌ [STEP 2] Database connection failed!');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed.');
    }
  }
}

// --- MAIN EXECUTION ---
async function run() {
  try {
    await setupDatabase();       // Jalankan setup dulu
    await testDatabaseConnection(); // Baru test koneksi
  } catch (error) {
    console.error('\n💥 Script failed due to errors in previous steps.');
    process.exit(1);
  }
}

run();
