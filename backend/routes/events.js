const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All event routes require authentication
router.use(authenticateToken);

// Helper function to log audit entry
async function logAudit(eventId, userId, action, fieldName = null, oldValue = null, newValue = null, reason = null) {
  await db.query(`
    INSERT INTO audit_log (event_id, user_id, action, field_name, old_value, new_value, reason)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [eventId, userId, action, fieldName, oldValue, newValue, reason]);
}

// Get all events with filters
router.get('/', async (req, res) => {
  try {
    const {
      customer_id,
      status,
      date_from,
      date_to,
      locked,
      missing_references
    } = req.query;

    let query = `
      SELECT e.*,
        c.legal_name as customer_name,
        c.customer_id as customer_code,
        cat.name as category_name,
        s.name as subtype_name,
        u.full_name as created_by_name
      FROM billable_events e
      JOIN customers c ON e.customer_id = c.id
      JOIN categories cat ON e.category_id = cat.id
      JOIN subtypes s ON e.subtype_id = s.id
      JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (customer_id) {
      paramCount++;
      query += ` AND e.customer_id = $${paramCount}`;
      params.push(customer_id);
    }

    if (status) {
      paramCount++;
      query += ` AND e.status = $${paramCount}`;
      params.push(status);
    }

    if (date_from) {
      paramCount++;
      query += ` AND e.event_date >= $${paramCount}`;
      params.push(date_from);
    }

    if (date_to) {
      paramCount++;
      query += ` AND e.event_date <= $${paramCount}`;
      params.push(date_to);
    }

    if (locked !== undefined) {
      paramCount++;
      query += ` AND e.ops_locked = $${paramCount}`;
      params.push(locked === 'true');
    }

    if (missing_references === 'true') {
      query += ` AND (e.sop_reference IS NULL OR e.sop_reference = '' OR e.sow_reference IS NULL OR e.sow_reference = '')`;
    }

    query += ' ORDER BY e.event_date DESC, e.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*,
        c.legal_name as customer_name,
        c.customer_id as customer_code,
        cat.name as category_name,
        s.name as subtype_name,
        s.default_sop_reference,
        s.default_sow_reference,
        u.full_name as created_by_name
      FROM billable_events e
      JOIN customers c ON e.customer_id = c.id
      JOIN categories cat ON e.category_id = cat.id
      JOIN subtypes s ON e.subtype_id = s.id
      JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event
router.post('/', async (req, res) => {
  try {
    const {
      customer_id,
      category_id,
      subtype_id,
      event_date,
      quantity,
      unit_type,
      sop_reference,
      sow_reference,
      ops_notes,
      external_ref_type,
      external_ref_id
    } = req.body;

    // Validation
    if (!customer_id || !category_id || !subtype_id || !event_date || !quantity || !unit_type) {
      return res.status(400).json({
        error: 'Customer, category, subtype, event date, quantity, and unit type are required'
      });
    }

    // Get subtype defaults if not provided
    let finalSopRef = sop_reference;
    let finalSowRef = sow_reference;
    let finalUnitType = unit_type;

    if (!finalSopRef || !finalSowRef || !finalUnitType) {
      const subtypeResult = await db.query(
        'SELECT default_sop_reference, default_sow_reference, suggested_unit_type FROM subtypes WHERE id = $1',
        [subtype_id]
      );

      if (subtypeResult.rows.length > 0) {
        const subtype = subtypeResult.rows[0];
        finalSopRef = finalSopRef || subtype.default_sop_reference;
        finalSowRef = finalSowRef || subtype.default_sow_reference;
        finalUnitType = finalUnitType || subtype.suggested_unit_type;
      }
    }

    const result = await db.query(`
      INSERT INTO billable_events (
        customer_id, category_id, subtype_id, event_date, quantity, unit_type,
        sop_reference, sow_reference, ops_notes, external_ref_type,
        external_ref_id, created_by, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'logged')
      RETURNING *
    `, [
      customer_id, category_id, subtype_id, event_date, quantity, finalUnitType,
      finalSopRef, finalSowRef, ops_notes, external_ref_type,
      external_ref_id, req.user.id
    ]);

    const event = result.rows[0];

    // Log creation in audit
    await logAudit(event.id, req.user.id, 'create', null, null, null, 'Event created');

    res.status(201).json(event);
  } catch (error) {
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Customer, category, or subtype not found' });
    }
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    // First check if event exists and is locked
    const eventCheck = await db.query(
      'SELECT * FROM billable_events WHERE id = $1',
      [req.params.id]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const existingEvent = eventCheck.rows[0];

    // Check permissions for editing locked events
    if (existingEvent.ops_locked) {
      if (req.user.role === 'ops') {
        return res.status(403).json({
          error: 'Event is locked. Only accounting or admin can unlock it.'
        });
      }
    }

    // For ops role, only allow editing same-day events
    if (req.user.role === 'ops' && !existingEvent.ops_locked) {
      const eventDate = new Date(existingEvent.event_date);
      const today = new Date();
      eventDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        return res.status(403).json({
          error: 'Cannot edit events from previous days'
        });
      }
    }

    const {
      customer_id,
      category_id,
      subtype_id,
      event_date,
      quantity,
      unit_type,
      sop_reference,
      sow_reference,
      ops_notes,
      external_ref_type,
      external_ref_id
    } = req.body;

    // Log changes
    const changes = [];
    if (customer_id !== existingEvent.customer_id) changes.push(['customer_id', existingEvent.customer_id, customer_id]);
    if (category_id !== existingEvent.category_id) changes.push(['category_id', existingEvent.category_id, category_id]);
    if (subtype_id !== existingEvent.subtype_id) changes.push(['subtype_id', existingEvent.subtype_id, subtype_id]);
    if (event_date !== existingEvent.event_date) changes.push(['event_date', existingEvent.event_date, event_date]);
    if (quantity !== existingEvent.quantity) changes.push(['quantity', existingEvent.quantity, quantity]);
    if (unit_type !== existingEvent.unit_type) changes.push(['unit_type', existingEvent.unit_type, unit_type]);
    if (sop_reference !== existingEvent.sop_reference) changes.push(['sop_reference', existingEvent.sop_reference, sop_reference]);
    if (sow_reference !== existingEvent.sow_reference) changes.push(['sow_reference', existingEvent.sow_reference, sow_reference]);
    if (external_ref_type !== existingEvent.external_ref_type) changes.push(['external_ref_type', existingEvent.external_ref_type, external_ref_type]);
    if (external_ref_id !== existingEvent.external_ref_id) changes.push(['external_ref_id', existingEvent.external_ref_id, external_ref_id]);

    const result = await db.query(`
      UPDATE billable_events
      SET customer_id = $1, category_id = $2, subtype_id = $3, event_date = $4,
          quantity = $5, unit_type = $6, sop_reference = $7, sow_reference = $8,
          ops_notes = $9, external_ref_type = $10, external_ref_id = $11,
          last_edited_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      customer_id, category_id, subtype_id, event_date, quantity, unit_type,
      sop_reference, sow_reference, ops_notes, external_ref_type,
      external_ref_id, req.params.id
    ]);

    // Log each change
    for (const [field, oldVal, newVal] of changes) {
      await logAudit(
        req.params.id,
        req.user.id,
        'update',
        field,
        String(oldVal),
        String(newVal)
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Add note to event (append-only, works even when locked)
router.post('/:id/notes', async (req, res) => {
  try {
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ error: 'Note is required' });
    }

    const result = await db.query(`
      UPDATE billable_events
      SET ops_notes = COALESCE(ops_notes || E'\n---\n', '') || $1,
          last_edited_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [note, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await logAudit(req.params.id, req.user.id, 'add_note', 'ops_notes', null, note);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Update event status (accounting/admin only)
router.patch('/:id/status', requireRole('accounting', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['logged', 'reviewed', 'invoiced'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existingEvent = await db.query(
      'SELECT status FROM billable_events WHERE id = $1',
      [req.params.id]
    );

    if (existingEvent.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const result = await db.query(
      'UPDATE billable_events SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    await logAudit(
      req.params.id,
      req.user.id,
      'status_change',
      'status',
      existingEvent.rows[0].status,
      status
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Bulk update status (accounting/admin only)
router.post('/bulk/status', requireRole('accounting', 'admin'), async (req, res) => {
  try {
    const { event_ids, status } = req.body;

    if (!event_ids || !Array.isArray(event_ids) || event_ids.length === 0) {
      return res.status(400).json({ error: 'Event IDs array is required' });
    }

    if (!['logged', 'reviewed', 'invoiced'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const placeholders = event_ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await db.query(
      `UPDATE billable_events SET status = $${event_ids.length + 1}
       WHERE id IN (${placeholders}) RETURNING id`,
      [...event_ids, status]
    );

    // Log bulk status change
    for (const row of result.rows) {
      await logAudit(row.id, req.user.id, 'bulk_status_change', 'status', null, status);
    }

    res.json({ updated: result.rowCount, event_ids: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ error: 'Failed to update event statuses' });
  }
});

// Unlock event (accounting/admin only)
router.post('/:id/unlock', requireRole('accounting', 'admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Unlock reason is required' });
    }

    const result = await db.query(`
      UPDATE billable_events
      SET ops_locked = false,
          accounting_unlock_reason = $1,
          unlocked_by = $2,
          unlocked_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [reason, req.user.id, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await logAudit(req.params.id, req.user.id, 'unlock', null, null, null, reason);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Unlock event error:', error);
    res.status(500).json({ error: 'Failed to unlock event' });
  }
});

module.exports = router;
