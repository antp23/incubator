const db = require('../config/database');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    console.log('Starting database seeding...');

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    await db.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES
        ('ops@iremedy.com', $1, 'Operations User', 'ops'),
        ('accounting@iremedy.com', $1, 'Accounting User', 'accounting'),
        ('admin@iremedy.com', $1, 'Admin User', 'admin')
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);
    console.log('✓ Test users created');

    // Create sample customers
    await db.query(`
      INSERT INTO customers (customer_id, legal_name, status, notes)
      VALUES
        ('CUST-001', 'Acme Corporation', 'active', 'Primary customer'),
        ('CUST-002', 'Global Industries Inc', 'active', NULL),
        ('CUST-003', 'Tech Solutions LLC', 'active', NULL),
        ('CUST-004', 'Retail Partners Group', 'inactive', 'Contract ended Q4 2025')
      ON CONFLICT (customer_id) DO NOTHING
    `);
    console.log('✓ Sample customers created');

    // Create event types
    const eventTypes = [
      // A. Order & Master Data Events
      {
        name: 'Manual Order',
        sow: 'SOW Section 3.1 - Manual Order Processing',
        billing_method: 'per-event'
      },
      {
        name: 'Material Add',
        sow: 'SOW Section 3.2 - Master Data Management',
        billing_method: 'per-event'
      },
      {
        name: 'Material Change',
        sow: 'SOW Section 3.3 - Master Data Management',
        billing_method: 'per-event'
      },
      {
        name: 'Customer Add',
        sow: 'SOW Section 3.4 - Customer Data Management',
        billing_method: 'per-event'
      },
      {
        name: 'Customer Change',
        sow: 'SOW Section 3.5 - Customer Data Management',
        billing_method: 'per-event'
      },
      // B. Inbound & Warehouse Events
      {
        name: 'Inbound Non-Compliance',
        sow: 'SOW Section 4.1 - Inbound Processing',
        billing_method: 'hourly'
      },
      {
        name: 'Warehouse Rework',
        sow: 'SOW Section 4.2 - Warehouse Operations',
        billing_method: 'hourly'
      },
      // C. Fulfillment & Exception Events
      {
        name: 'Ad-Hoc Labor',
        sow: 'SOW Section 5.1 - Non-Standard Operations',
        billing_method: 'hourly'
      },
      {
        name: 'Returns Processing',
        sow: 'SOW Section 5.2 - Returns Handling',
        billing_method: 'hourly'
      },
      // D. Transportation & Logistics Events
      {
        name: 'Transportation Exception',
        sow: 'SOW Section 6.1 - Carrier Exceptions',
        billing_method: 'pass-through'
      },
      {
        name: 'Special Project',
        sow: 'SOW Section 6.2 - Project Work',
        billing_method: 'per-event'
      }
    ];

    for (const eventType of eventTypes) {
      await db.query(`
        INSERT INTO event_types (name, default_sow_reference, billing_method_hint)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [
        eventType.name,
        eventType.sow,
        eventType.billing_method
      ]);
    }
    console.log('✓ Event types created');

    console.log('\nDatabase seeding completed successfully!');
    console.log('\nTest credentials:');
    console.log('  Operations: ops@iremedy.com / password123');
    console.log('  Accounting: accounting@iremedy.com / password123');
    console.log('  Admin: admin@iremedy.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
