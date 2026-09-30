import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let dbClient: {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
};

const dataDir = path.join(process.cwd(), 'data', 'pgdata');

export async function initDb() {
  if (process.env.DATABASE_URL) {
    console.log('⚡ Connecting to PostgreSQL via DATABASE_URL...');
    
    // Auto-ensure target database exists
    try {
      const dbUrl = new URL(process.env.DATABASE_URL);
      const targetDbName = dbUrl.pathname.replace('/', '') || 'hospital_db';
      dbUrl.pathname = '/postgres';

      const sysPool = new Pool({
        connectionString: dbUrl.toString(),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      const checkDb = await sysPool.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [targetDbName]
      );

      if (checkDb.rows.length === 0) {
        console.log(`ℹ️ Database "${targetDbName}" does not exist yet. Creating...`);
        await sysPool.query(`CREATE DATABASE "${targetDbName}"`);
        console.log(`✅ Database "${targetDbName}" created successfully.`);
      }
      await sysPool.end();
    } catch (sysErr: any) {
      console.log('ℹ️ Local DB check skipped:', sysErr.message || sysErr);
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    dbClient = {
      query: async (sql: string, params?: any[]) => {
        const res = await pool.query(sql, params);
        return { rows: res.rows };
      },
    };
  } else {
    console.log(`⚡ Initializing PostgreSQL (PGlite) engine at ${dataDir}...`);
    if (!fs.existsSync(path.dirname(dataDir))) {
      fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    }
    const pglite = new PGlite(dataDir);
    dbClient = {
      query: async (sql: string, params?: any[]) => {
        const res = await pglite.query(sql, params);
        return { rows: res.rows };
      },
    };
  }

  // Create tables if they do not exist
  await createTables();
  return dbClient;
}

async function createTables() {
  const tableDepartments = `
    CREATE TABLE IF NOT EXISTS departments (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      icon_name VARCHAR(64)
    );
  `;

  const tableDoctors = `
    CREATE TABLE IF NOT EXISTS doctors (
      id VARCHAR(64) PRIMARY KEY,
      department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      specialty VARCHAR(255) NOT NULL,
      qualification VARCHAR(255) NOT NULL,
      experience_years INT NOT NULL DEFAULT 5,
      consultation_fee NUMERIC(10, 2) NOT NULL,
      available_days VARCHAR(255) DEFAULT 'Mon-Sat'
    );
  `;

  const tablePatients = `
    CREATE TABLE IF NOT EXISTS patients (
      id VARCHAR(64) PRIMARY KEY,
      uhid VARCHAR(32) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      dob VARCHAR(10),
      gender VARCHAR(16),
      mobile_number VARCHAR(32) NOT NULL,
      email VARCHAR(255) NOT NULL,
      address TEXT,
      emergency_contact VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const tableServices = `
    CREATE TABLE IF NOT EXISTS services (
      id VARCHAR(64) PRIMARY KEY,
      category VARCHAR(64) NOT NULL DEFAULT 'Doctor Consultation',
      department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
      doctor_id VARCHAR(64) REFERENCES doctors(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      prep_instructions TEXT,
      duration_minutes INT NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const tableHours = `
    CREATE TABLE IF NOT EXISTS business_hours (
      day_of_week INT PRIMARY KEY,
      start_time VARCHAR(8) NOT NULL,
      end_time VARCHAR(8) NOT NULL,
      is_open BOOLEAN DEFAULT TRUE
    );
  `;

  const tableBookings = `
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(64) PRIMARY KEY,
      reference_code VARCHAR(32) UNIQUE NOT NULL,
      service_id VARCHAR(64) REFERENCES services(id) ON DELETE CASCADE,
      patient_id VARCHAR(64) REFERENCES patients(id) ON DELETE SET NULL,
      uhid VARCHAR(32),
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(64),
      dob VARCHAR(10),
      gender VARCHAR(16),
      emergency_contact VARCHAR(255),
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await dbClient.query(tableDepartments);
  await dbClient.query(tableDoctors);
  await dbClient.query(tablePatients);
  await dbClient.query(tableServices);
  await dbClient.query(tableHours);
  await dbClient.query(tableBookings);

  // Migration helper for new columns if table existed prior
  const migrations = [
    `ALTER TABLE services ADD COLUMN IF NOT EXISTS category VARCHAR(64) DEFAULT 'Doctor Consultation';`,
    `ALTER TABLE services ADD COLUMN IF NOT EXISTS department_id VARCHAR(64);`,
    `ALTER TABLE services ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(64);`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS uhid VARCHAR(32);`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dob VARCHAR(10);`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gender VARCHAR(16);`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);`,
  ];

  for (const m of migrations) {
    try {
      await dbClient.query(m);
    } catch (err) {
      // Ignore migration errors
    }
  }

  console.log('✅ Extended Hospital Database Schema verified.');
}

export function getDb() {
  if (!dbClient) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbClient;
}
