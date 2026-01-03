const express = require('express');
const ExcelJS = require('exceljs');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All export routes require accounting or admin role
router.use(authenticateToken);
router.use(requireRole('accounting', 'admin'));

// Export events to CSV or XLSX
router.post('/', async (req, res) => {
  try {
    const {
      format = 'xlsx',
      customer_ids,
      status,
      date_from,
      date_to
    } = req.body;

    // Build query with filters
    let query = `
      SELECT
        e.id,
        c.customer_id as customer_code,
        c.legal_name as customer_name,
        cat.name as category,
        s.name as subtype,
        e.event_date,
        e.quantity,
        e.unit_type,
        e.sop_reference,
        e.sow_reference,
        e.status,
        e.ops_notes,
        e.external_ref_type,
        e.external_ref_id,
        u.full_name as created_by,
        e.created_at,
        e.ops_locked
      FROM billable_events e
      JOIN customers c ON e.customer_id = c.id
      JOIN categories cat ON e.category_id = cat.id
      JOIN subtypes s ON e.subtype_id = s.id
      JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (customer_ids && customer_ids.length > 0) {
      const placeholders = customer_ids.map((_, i) => `$${paramCount + i + 1}`).join(',');
      query += ` AND e.customer_id IN (${placeholders})`;
      params.push(...customer_ids);
      paramCount += customer_ids.length;
    }

    if (status && status.length > 0) {
      const placeholders = status.map((_, i) => `$${paramCount + i + 1}`).join(',');
      query += ` AND e.status IN (${placeholders})`;
      params.push(...status);
      paramCount += status.length;
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

    query += ' ORDER BY e.event_date DESC, c.legal_name, cat.name, s.name';

    const result = await db.query(query, params);
    const events = result.rows;

    if (format === 'csv') {
      // Generate CSV
      const csvRows = [];

      // Header
      csvRows.push([
        'Event ID',
        'Customer Code',
        'Customer Name',
        'Category',
        'Subtype',
        'Event Date',
        'Quantity',
        'Unit Type',
        'SOP Reference',
        'SOW Reference',
        'Status',
        'External Ref Type',
        'External Ref ID',
        'Created By',
        'Created At',
        'Locked',
        'Notes'
      ].join(','));

      // Data rows
      for (const event of events) {
        csvRows.push([
          event.id,
          `"${event.customer_code}"`,
          `"${event.customer_name}"`,
          `"${event.category}"`,
          `"${event.subtype}"`,
          event.event_date,
          event.quantity,
          `"${event.unit_type}"`,
          `"${event.sop_reference || ''}"`,
          `"${event.sow_reference || ''}"`,
          event.status,
          `"${event.external_ref_type || ''}"`,
          `"${event.external_ref_id || ''}"`,
          `"${event.created_by}"`,
          event.created_at,
          event.ops_locked,
          `"${(event.ops_notes || '').replace(/"/g, '""')}"`
        ].join(','));
      }

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="billable-events-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Generate XLSX with summary sheet
      const workbook = new ExcelJS.Workbook();

      // Events sheet
      const eventsSheet = workbook.addWorksheet('Events');

      eventsSheet.columns = [
        { header: 'Event ID', key: 'id', width: 10 },
        { header: 'Customer Code', key: 'customer_code', width: 15 },
        { header: 'Customer Name', key: 'customer_name', width: 25 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Subtype', key: 'subtype', width: 25 },
        { header: 'Event Date', key: 'event_date', width: 12 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Unit Type', key: 'unit_type', width: 15 },
        { header: 'SOP Reference', key: 'sop_reference', width: 15 },
        { header: 'SOW Reference', key: 'sow_reference', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'External Ref Type', key: 'external_ref_type', width: 18 },
        { header: 'External Ref ID', key: 'external_ref_id', width: 20 },
        { header: 'Created By', key: 'created_by', width: 20 },
        { header: 'Created At', key: 'created_at', width: 18 },
        { header: 'Locked', key: 'ops_locked', width: 10 },
        { header: 'Notes', key: 'ops_notes', width: 40 }
      ];

      // Style header row
      eventsSheet.getRow(1).font = { bold: true };
      eventsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };

      // Add data
      events.forEach(event => {
        eventsSheet.addRow(event);
      });

      // Summary sheet
      const summarySheet = workbook.addWorksheet('Summary');

      summarySheet.columns = [
        { header: 'Customer', key: 'customer', width: 25 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Subtype', key: 'subtype', width: 25 },
        { header: 'Total Quantity', key: 'total_quantity', width: 15 },
        { header: 'Unit Type', key: 'unit_type', width: 15 },
        { header: 'Event Count', key: 'event_count', width: 12 }
      ];

      // Style header
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };

      // Calculate summary
      const summary = {};

      events.forEach(event => {
        const key = `${event.customer_name}|${event.category}|${event.subtype}|${event.unit_type}`;

        if (!summary[key]) {
          summary[key] = {
            customer: event.customer_name,
            category: event.category,
            subtype: event.subtype,
            unit_type: event.unit_type,
            total_quantity: 0,
            event_count: 0
          };
        }

        summary[key].total_quantity += parseFloat(event.quantity);
        summary[key].event_count += 1;
      });

      // Add summary data
      Object.values(summary).forEach(row => {
        summarySheet.addRow(row);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="billable-events-${Date.now()}.xlsx"`);
      res.send(buffer);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export events' });
  }
});

module.exports = router;
