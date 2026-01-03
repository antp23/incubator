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
      {
        name: 'Manual Order',
        sow: 'SOW Section 3.1',
        billing_method: 'per-event'
      },
      {
        name: 'Order Modification',
        sow: 'SOW Section 3.2',
        billing_method: 'per-event'
      },
      {
        name: 'Non-Compliant Inbound Remediation',
        sow: 'SOW Section 4.1',
        billing_method: 'hourly'
      },
      {
        name: 'Re-palletization',
        sow: 'SOW Section 4.2',
        billing_method: 'per-event'
      },
      {
        name: 'Expedited Shipment',
        sow: 'SOW Section 5.1',
        billing_method: 'per-event'
      },
      {
        name: 'Customer Return Processing',
        sow: 'SOW Section 6.1',
        billing_method: 'per-event'
      },
      {
        name: 'Damaged Goods Inspection',
        sow: 'SOW Section 6.2',
        billing_method: 'hourly'
      },
      {
        name: 'Cycle Count',
        sow: 'SOW Section 7.1',
        billing_method: 'per-event'
      },
      {
        name: 'Custom Kitting',
        sow: 'SOW Section 8.1',
        billing_method: 'hourly'
      },
      {
        name: 'Custom Labeling',
        sow: 'SOW Section 8.2',
        billing_method: 'per-event'
      },
      {
        name: 'Customer Master Data Change',
        sow: 'SOW Section 9.1',
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
