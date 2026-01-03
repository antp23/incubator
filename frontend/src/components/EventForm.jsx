import React, { useState, useEffect } from 'react';
import api from '../api/client';

const EventForm = ({ onClose, onSuccess, eventData = null }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    category_id: '',
    subtype_id: '',
    event_date: new Date().toISOString().split('T')[0],
    quantity: '',
    unit_type: '',
    sop_reference: '',
    sow_reference: '',
    external_ref_type: '',
    external_ref_id: '',
    ops_notes: ''
  });

  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subtypes, setSubtypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    loadCustomers();
    loadCategories();

    if (eventData) {
      setFormData(eventData);
    }
  }, [eventData]);

  useEffect(() => {
    if (formData.category_id) {
      loadSubtypes(formData.category_id);
    } else {
      setSubtypes([]);
    }
  }, [formData.category_id]);

  useEffect(() => {
    if (formData.subtype_id) {
      const subtype = subtypes.find((s) => s.id === parseInt(formData.subtype_id));
      if (subtype) {
        setFormData((prev) => ({
          ...prev,
          unit_type: prev.unit_type || subtype.suggested_unit_type || '',
          sop_reference: prev.sop_reference || subtype.default_sop_reference || '',
          sow_reference: prev.sow_reference || subtype.default_sow_reference || ''
        }));
      }
    }
  }, [formData.subtype_id, subtypes]);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers?status=active');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/taxonomy/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadSubtypes = async (categoryId) => {
    const category = categories.find((c) => c.id === parseInt(categoryId));
    if (category) {
      setSubtypes(category.subtypes || []);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newWarnings = [];

    if (!formData.sop_reference) {
      newWarnings.push('SOP Reference is missing');
    }

    if (!formData.sow_reference) {
      newWarnings.push('SOW Reference is missing');
    }

    setWarnings(newWarnings);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        category_id: parseInt(formData.category_id),
        subtype_id: parseInt(formData.subtype_id),
        quantity: parseFloat(formData.quantity)
      };

      if (eventData) {
        await api.put(`/events/${eventData.id}`, payload);
      } else {
        await api.post('/events', payload);
      }

      onSuccess();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{eventData ? 'Edit Event' : 'Log New Event'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Customer *</label>
            <select
              name="customer_id"
              value={formData.customer_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.legal_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Subtype *</label>
            <select
              name="subtype_id"
              value={formData.subtype_id}
              onChange={handleChange}
              required
              disabled={!formData.category_id}
            >
              <option value="">Select Subtype</option>
              {subtypes.map((subtype) => (
                <option key={subtype.id} value={subtype.id}>
                  {subtype.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Event Date *</label>
            <input
              type="date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Unit Type *</label>
              <input
                type="text"
                name="unit_type"
                value={formData.unit_type}
                onChange={handleChange}
                placeholder="orders, pallets, hours, etc."
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>SOP Reference</label>
            <input
              type="text"
              name="sop_reference"
              value={formData.sop_reference}
              onChange={handleChange}
              placeholder="e.g., SOP-OP-001"
            />
          </div>

          <div className="form-group">
            <label>SOW Reference</label>
            <input
              type="text"
              name="sow_reference"
              value={formData.sow_reference}
              onChange={handleChange}
              placeholder="e.g., SOW Section 3.1"
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>External Ref Type</label>
              <select
                name="external_ref_type"
                value={formData.external_ref_type}
                onChange={handleChange}
              >
                <option value="">None</option>
                <option value="order_id">Order ID</option>
                <option value="shipment_id">Shipment ID</option>
                <option value="tracking_number">Tracking Number</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>External Ref ID</label>
              <input
                type="text"
                name="external_ref_id"
                value={formData.external_ref_id}
                onChange={handleChange}
                placeholder="e.g., ORD-12345"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Operational Notes</label>
            <textarea
              name="ops_notes"
              value={formData.ops_notes}
              onChange={handleChange}
              rows="3"
              placeholder="Any additional notes about this event..."
            />
          </div>

          {warnings.length > 0 && (
            <div className="warning" style={{ marginBottom: '15px' }}>
              <strong>Warnings:</strong>
              <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
              <p style={{ marginTop: '5px', fontSize: '12px' }}>
                You can still save, but these fields are recommended for billing.
              </p>
            </div>
          )}

          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : eventData ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
