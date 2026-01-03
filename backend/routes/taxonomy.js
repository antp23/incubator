const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All taxonomy routes require authentication
router.use(authenticateToken);

// Get all event types
router.get('/event-types', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM event_types
      ORDER BY name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get event types error:', error);
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

// Get single event type
router.get('/event-types/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM event_types WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get event type error:', error);
    res.status(500).json({ error: 'Failed to fetch event type' });
  }
});

// Create event type (admin only)
router.post('/event-types', requireRole('admin'), async (req, res) => {
  try {
    const {
      name,
      default_sow_reference,
      billing_method_hint
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Event type name is required' });
    }

    const result = await db.query(`
      INSERT INTO event_types (name, default_sow_reference, billing_method_hint)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, default_sow_reference, billing_method_hint]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Event type already exists' });
    }
    console.error('Create event type error:', error);
    res.status(500).json({ error: 'Failed to create event type' });
  }
});

// Update event type (admin only)
router.put('/event-types/:id', requireRole('admin'), async (req, res) => {
  try {
    const {
      name,
      default_sow_reference,
      billing_method_hint
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await db.query(`
      UPDATE event_types
      SET name = $1,
          default_sow_reference = $2,
          billing_method_hint = $3
      WHERE id = $4
      RETURNING *
    `, [name, default_sow_reference, billing_method_hint, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update event type error:', error);
    res.status(500).json({ error: 'Failed to update event type' });
  }
});

// Delete event type (admin only)
router.delete('/event-types/:id', requireRole('admin'), async (req, res) => {
  try {
    // Check if event type has any events
    const eventCheck = await db.query(
      'SELECT COUNT(*) FROM billable_events WHERE event_type_id = $1',
      [req.params.id]
    );

    if (parseInt(eventCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Cannot delete event type with existing billable events'
      });
    }

    const result = await db.query(
      'DELETE FROM event_types WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    res.json({ message: 'Event type deleted successfully' });
  } catch (error) {
    console.error('Delete event type error:', error);
    res.status(500).json({ error: 'Failed to delete event type' });
  }
});

module.exports = router;
