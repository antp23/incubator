const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All taxonomy routes require authentication
router.use(authenticateToken);

// Get all categories with their subtypes
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.id, c.name, c.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'default_sop_reference', s.default_sop_reference,
              'default_sow_reference', s.default_sow_reference,
              'billing_method_hint', s.billing_method_hint,
              'suggested_unit_type', s.suggested_unit_type
            ) ORDER BY s.name
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as subtypes
      FROM categories c
      LEFT JOIN subtypes s ON c.id = s.category_id
      GROUP BY c.id, c.name, c.created_at
      ORDER BY c.name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category with subtypes
router.get('/categories/:id', async (req, res) => {
  try {
    const catResult = await db.query(
      'SELECT * FROM categories WHERE id = $1',
      [req.params.id]
    );

    if (catResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const subResult = await db.query(
      'SELECT * FROM subtypes WHERE category_id = $1 ORDER BY name',
      [req.params.id]
    );

    res.json({
      ...catResult.rows[0],
      subtypes: subResult.rows
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create category (admin only)
router.post('/categories', requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await db.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (admin only)
router.put('/categories/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await db.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Get all subtypes
router.get('/subtypes', async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = `
      SELECT s.*, c.name as category_name
      FROM subtypes s
      JOIN categories c ON s.category_id = c.id
    `;
    const params = [];

    if (category_id) {
      query += ' WHERE s.category_id = $1';
      params.push(category_id);
    }

    query += ' ORDER BY c.name, s.name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get subtypes error:', error);
    res.status(500).json({ error: 'Failed to fetch subtypes' });
  }
});

// Get single subtype
router.get('/subtypes/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, c.name as category_name
      FROM subtypes s
      JOIN categories c ON s.category_id = c.id
      WHERE s.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subtype not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get subtype error:', error);
    res.status(500).json({ error: 'Failed to fetch subtype' });
  }
});

// Create subtype (admin only)
router.post('/subtypes', requireRole('admin'), async (req, res) => {
  try {
    const {
      category_id,
      name,
      default_sop_reference,
      default_sow_reference,
      billing_method_hint,
      suggested_unit_type
    } = req.body;

    if (!category_id || !name) {
      return res.status(400).json({ error: 'Category ID and name are required' });
    }

    const result = await db.query(`
      INSERT INTO subtypes (
        category_id, name, default_sop_reference,
        default_sow_reference, billing_method_hint, suggested_unit_type
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      category_id,
      name,
      default_sop_reference,
      default_sow_reference,
      billing_method_hint,
      suggested_unit_type
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Subtype already exists in this category' });
    }
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Category not found' });
    }
    console.error('Create subtype error:', error);
    res.status(500).json({ error: 'Failed to create subtype' });
  }
});

// Update subtype (admin only)
router.put('/subtypes/:id', requireRole('admin'), async (req, res) => {
  try {
    const {
      name,
      default_sop_reference,
      default_sow_reference,
      billing_method_hint,
      suggested_unit_type
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await db.query(`
      UPDATE subtypes
      SET name = $1,
          default_sop_reference = $2,
          default_sow_reference = $3,
          billing_method_hint = $4,
          suggested_unit_type = $5
      WHERE id = $6
      RETURNING *
    `, [
      name,
      default_sop_reference,
      default_sow_reference,
      billing_method_hint,
      suggested_unit_type,
      req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subtype not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update subtype error:', error);
    res.status(500).json({ error: 'Failed to update subtype' });
  }
});

module.exports = router;
