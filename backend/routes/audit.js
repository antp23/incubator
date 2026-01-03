const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All audit routes require authentication
router.use(authenticateToken);

// Get audit log entries (accounting/admin only)
router.get('/', requireRole('accounting', 'admin'), async (req, res) => {
  try {
    const { event_id, user_id, action, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT a.*,
        u.full_name as user_name,
        u.email as user_email
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (event_id) {
      paramCount++;
      query += ` AND a.event_id = $${paramCount}`;
      params.push(event_id);
    }

    if (user_id) {
      paramCount++;
      query += ` AND a.user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (action) {
      paramCount++;
      query += ` AND a.action = $${paramCount}`;
      params.push(action);
    }

    query += ` ORDER BY a.created_at DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Get audit log for specific event
router.get('/event/:event_id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*,
        u.full_name as user_name,
        u.email as user_email
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.event_id = $1
      ORDER BY a.created_at DESC
    `, [req.params.event_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get event audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch event audit log' });
  }
});

module.exports = router;
