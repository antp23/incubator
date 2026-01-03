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

    // Create categories
    const categories = [
      'Order Processing',
      'Inbound Operations',
      'Outbound Operations',
      'Returns Processing',
      'Inventory Management',
      'Special Handling',
      'Customer Service'
    ];

    for (const category of categories) {
      await db.query(
        'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [category]
      );
    }
    console.log('✓ Categories created');

    // Get category IDs
    const catResult = await db.query('SELECT id, name FROM categories');
    const categoryMap = {};
    catResult.rows.forEach(row => {
      categoryMap[row.name] = row.id;
    });

    // Create subtypes
    const subtypes = [
      {
        category: 'Order Processing',
        name: 'Manual Order',
        sop: 'SOP-OP-001',
        sow: 'SOW Section 3.1',
        billing_method: 'per-event',
        unit_type: 'orders'
      },
      {
        category: 'Order Processing',
        name: 'Order Modification',
        sop: 'SOP-OP-002',
        sow: 'SOW Section 3.2',
        billing_method: 'per-event',
        unit_type: 'orders'
      },
      {
        category: 'Inbound Operations',
        name: 'Non-Compliant Inbound Remediation',
        sop: 'SOP-IB-001',
        sow: 'SOW Section 4.1',
        billing_method: 'hourly',
        unit_type: 'hours'
      },
      {
        category: 'Inbound Operations',
        name: 'Re-palletization',
        sop: 'SOP-IB-002',
        sow: 'SOW Section 4.2',
        billing_method: 'per-event',
        unit_type: 'pallets'
      },
      {
        category: 'Outbound Operations',
        name: 'Expedited Shipment',
        sop: 'SOP-OB-001',
        sow: 'SOW Section 5.1',
        billing_method: 'per-event',
        unit_type: 'shipments'
      },
      {
        category: 'Returns Processing',
        name: 'Customer Return Processing',
        sop: 'SOP-RT-001',
        sow: 'SOW Section 6.1',
        billing_method: 'per-event',
        unit_type: 'returns'
      },
      {
        category: 'Returns Processing',
        name: 'Damaged Goods Inspection',
        sop: 'SOP-RT-002',
        sow: 'SOW Section 6.2',
        billing_method: 'hourly',
        unit_type: 'hours'
      },
      {
        category: 'Inventory Management',
        name: 'Cycle Count',
        sop: 'SOP-IM-001',
        sow: 'SOW Section 7.1',
        billing_method: 'per-event',
        unit_type: 'SKUs'
      },
      {
        category: 'Special Handling',
        name: 'Custom Kitting',
        sop: 'SOP-SH-001',
        sow: 'SOW Section 8.1',
        billing_method: 'hourly',
        unit_type: 'hours'
      },
      {
        category: 'Special Handling',
        name: 'Custom Labeling',
        sop: 'SOP-SH-002',
        sow: 'SOW Section 8.2',
        billing_method: 'per-event',
        unit_type: 'units'
      },
      {
        category: 'Customer Service',
        name: 'Customer Master Data Change',
        sop: 'SOP-CS-001',
        sow: 'SOW Section 9.1',
        billing_method: 'per-event',
        unit_type: 'changes'
      }
    ];

    for (const subtype of subtypes) {
      const categoryId = categoryMap[subtype.category];
      if (categoryId) {
        await db.query(`
          INSERT INTO subtypes (
            category_id, name, default_sop_reference,
            default_sow_reference, billing_method_hint, suggested_unit_type
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (category_id, name) DO NOTHING
        `, [
          categoryId,
          subtype.name,
          subtype.sop,
          subtype.sow,
          subtype.billing_method,
          subtype.unit_type
        ]);
      }
    }
    console.log('✓ Subtypes created');

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
