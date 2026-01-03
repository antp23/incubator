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

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subtypes table
CREATE TABLE IF NOT EXISTS subtypes (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  default_sop_reference TEXT,
  default_sow_reference TEXT,
  billing_method_hint VARCHAR(100),
  suggested_unit_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, name)
);

-- Billable Events table
CREATE TABLE IF NOT EXISTS billable_events (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subtype_id INTEGER NOT NULL REFERENCES subtypes(id) ON DELETE RESTRICT,
  event_date DATE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_type VARCHAR(100) NOT NULL,
  sop_reference TEXT,
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
CREATE INDEX IF NOT EXISTS idx_events_date ON billable_events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON billable_events(status);
CREATE INDEX IF NOT EXISTS idx_events_locked ON billable_events(ops_locked);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON billable_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_subtypes_category ON subtypes(category_id);
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
