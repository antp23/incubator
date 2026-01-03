import React, { useState, useEffect } from 'react';
import api from '../api/client';

const AdminView = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showEventTypeForm, setShowEventTypeForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (activeTab === 'customers') {
      loadCustomers();
    } else if (activeTab === 'taxonomy') {
      loadEventTypes();
    }
  }, [activeTab]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventTypes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/taxonomy/event-types');
      setEventTypes(response.data);
    } catch (error) {
      console.error('Failed to load event types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      await api.delete(`/customers/${customerId}`);
      loadCustomers();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete customer');
    }
  };

  const handleDeleteEventType = async (eventTypeId) => {
    if (!confirm('Are you sure you want to delete this event type?')) return;

    try {
      await api.delete(`/taxonomy/event-types/${eventTypeId}`);
      loadEventTypes();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete event type');
    }
  };

  return (
    <div>
      <h2>Admin - System Management</h2>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          Customers
        </button>
        <button
          className={`tab ${activeTab === 'taxonomy' ? 'active' : ''}`}
          onClick={() => setActiveTab('taxonomy')}
        >
          Event Types
        </button>
      </div>

      {activeTab === 'customers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3>Customers</h3>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingItem(null);
                setShowCustomerForm(true);
              }}
            >
              + Add Customer
            </button>
          </div>

          <div className="card">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Legal Name</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.customer_id}</td>
                      <td>{customer.legal_name}</td>
                      <td>
                        <span className={`badge badge-${customer.status}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td>{customer.notes || '-'}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px', marginRight: '5px' }}
                          onClick={() => {
                            setEditingItem(customer);
                            setShowCustomerForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {showCustomerForm && (
            <CustomerForm
              customer={editingItem}
              onClose={() => {
                setShowCustomerForm(false);
                setEditingItem(null);
              }}
              onSuccess={() => {
                setShowCustomerForm(false);
                setEditingItem(null);
                loadCustomers();
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'taxonomy' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3>Event Types</h3>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingItem(null);
                setShowEventTypeForm(true);
              }}
            >
              + Add Event Type
            </button>
          </div>

          <div className="card">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Event Type Name</th>
                    <th>Default SOW Reference</th>
                    <th>Billing Method</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {eventTypes.map((eventType) => (
                    <tr key={eventType.id}>
                      <td>{eventType.name}</td>
                      <td>{eventType.default_sow_reference || '-'}</td>
                      <td>{eventType.billing_method_hint || '-'}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px', marginRight: '5px' }}
                          onClick={() => {
                            setEditingItem(eventType);
                            setShowEventTypeForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleDeleteEventType(eventType.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {showEventTypeForm && (
            <EventTypeForm
              eventType={editingItem}
              onClose={() => {
                setShowEventTypeForm(false);
                setEditingItem(null);
              }}
              onSuccess={() => {
                setShowEventTypeForm(false);
                setEditingItem(null);
                loadEventTypes();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

const CustomerForm = ({ customer, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    customer_id: customer?.customer_id || '',
    legal_name: customer?.legal_name || '',
    status: customer?.status || 'active',
    notes: customer?.notes || ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (customer) {
        await api.put(`/customers/${customer.id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{customer ? 'Edit Customer' : 'Add Customer'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Customer ID *</label>
            <input
              type="text"
              value={formData.customer_id}
              onChange={(e) =>
                setFormData({ ...formData, customer_id: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Legal Name *</label>
            <input
              type="text"
              value={formData.legal_name}
              onChange={(e) =>
                setFormData({ ...formData, legal_name: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EventTypeForm = ({ eventType, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: eventType?.name || '',
    default_sow_reference: eventType?.default_sow_reference || '',
    billing_method_hint: eventType?.billing_method_hint || ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (eventType) {
        await api.put(`/taxonomy/event-types/${eventType.id}`, formData);
      } else {
        await api.post('/taxonomy/event-types', formData);
      }
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save event type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{eventType ? 'Edit Event Type' : 'Add Event Type'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Event Type Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Default SOW Reference</label>
            <input
              type="text"
              value={formData.default_sow_reference}
              onChange={(e) =>
                setFormData({ ...formData, default_sow_reference: e.target.value })
              }
              placeholder="e.g., SOW Section 3.1"
            />
          </div>
          <div className="form-group">
            <label>Billing Method Hint</label>
            <select
              value={formData.billing_method_hint}
              onChange={(e) =>
                setFormData({ ...formData, billing_method_hint: e.target.value })
              }
            >
              <option value="">Select...</option>
              <option value="per-event">Per Event</option>
              <option value="hourly">Hourly</option>
              <option value="pass-through">Pass Through</option>
            </select>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminView;
