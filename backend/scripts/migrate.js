const db = require('../config/database');

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('ops', 'accounting', 'admin')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(100) UNIQUE NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event Types table (formerly Subtypes)
CREATE TABLE IF NOT EXISTS event_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  default_sow_reference TEXT,
  billing_method_hint VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billable Events table
CREATE TABLE IF NOT EXISTS billable_events (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  event_type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE RESTRICT,
  event_date DATE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  sow_reference TEXT,
  status VARCHAR(50) DEFAULT 'logged' CHECK (status IN ('logged', 'reviewed', 'invoiced')),
  ops_notes TEXT,
  external_ref_type VARCHAR(50) CHECK (external_ref_type IN ('order_id', 'shipment_id', 'tracking_number', 'other', NULL)),
  external_ref_id VARCHAR(255),
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ops_locked BOOLEAN DEFAULT false,
  accounting_unlock_reason TEXT,
  unlocked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  unlocked_at TIMESTAMP
);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES billable_events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_customer ON billable_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON billable_events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON billable_events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON billable_events(status);
CREATE INDEX IF NOT EXISTS idx_events_locked ON billable_events(ops_locked);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON billable_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
`;

async function migrate() {
  try {
    console.log('Starting database migration...');
    await db.query(schema);
    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
