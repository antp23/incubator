const db = require('../config/database');

async function run() {
  try {
    // Lock events where event_date is before today and ops_locked is false
    // Using timezone conversion to handle ET correctly
    const result = await db.query(`
      UPDATE billable_events
      SET ops_locked = true
      WHERE event_date < CURRENT_DATE
        AND ops_locked = false
      RETURNING id
    `);

    const lockedCount = result.rowCount;

    if (lockedCount > 0) {
      // Log auto-lock actions
      const eventIds = result.rows.map(r => r.id);

      for (const eventId of eventIds) {
        await db.query(`
          INSERT INTO audit_log (event_id, user_id, action, reason)
          VALUES ($1, NULL, 'auto_lock', 'Same-day edit window expired')
        `, [eventId]);
      }

      console.log(`Auto-locked ${lockedCount} events`);
    } else {
      console.log('No events to lock');
    }

    return { success: true, lockedCount };
  } catch (error) {
    console.error('Lock events job error:', error);
    throw error;
  }
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { run };
