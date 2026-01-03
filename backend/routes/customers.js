const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All customer routes require authentication
router.use(authenticateToken);

// Get all customers
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM customers';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY legal_name ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM customers WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer (admin only)
router.post('/', requireRole('admin', 'accounting'), async (req, res) => {
  try {
    const { customer_id, legal_name, status, notes } = req.body;

    if (!customer_id || !legal_name) {
      return res.status(400).json({ error: 'Customer ID and legal name are required' });
    }

    const result = await db.query(`
      INSERT INTO customers (customer_id, legal_name, status, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [customer_id, legal_name, status || 'active', notes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Customer ID already exists' });
    }
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer (admin only)
router.put('/:id', requireRole('admin', 'accounting'), async (req, res) => {
  try {
    const { customer_id, legal_name, status, notes } = req.body;

    if (!customer_id || !legal_name) {
      return res.status(400).json({ error: 'Customer ID and legal name are required' });
    }

    const result = await db.query(`
      UPDATE customers
      SET customer_id = $1, legal_name = $2, status = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [customer_id, legal_name, status, notes, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Customer ID already exists' });
    }
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer (admin only) - only if no events exist
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    // Check if customer has any events
    const eventCheck = await db.query(
      'SELECT COUNT(*) FROM billable_events WHERE customer_id = $1',
      [req.params.id]
    );

    if (parseInt(eventCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Cannot delete customer with existing billable events'
      });
    }

    const result = await db.query(
      'DELETE FROM customers WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
