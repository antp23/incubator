import React, { useState, useEffect } from 'react';
import api from '../api/client';

const AdminView = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubtypeForm, setShowSubtypeForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (activeTab === 'customers') {
      loadCustomers();
    } else if (activeTab === 'taxonomy') {
      loadCategories();
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

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/taxonomy/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
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
          Taxonomy
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
            <h3>Categories & Subtypes</h3>
            <div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingItem(null);
                  setShowCategoryForm(true);
                }}
                style={{ marginRight: '10px' }}
              >
                + Add Category
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingItem(null);
                  setShowSubtypeForm(true);
                }}
              >
                + Add Subtype
              </button>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              categories.map((category) => (
                <div key={category.id} style={{ marginBottom: '30px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#2c3e50' }}>
                    {category.name}
                  </h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Subtype</th>
                        <th>SOP Reference</th>
                        <th>SOW Reference</th>
                        <th>Billing Method</th>
                        <th>Unit Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.subtypes.map((subtype) => (
                        <tr key={subtype.id}>
                          <td>{subtype.name}</td>
                          <td>{subtype.default_sop_reference || '-'}</td>
                          <td>{subtype.default_sow_reference || '-'}</td>
                          <td>{subtype.billing_method_hint || '-'}</td>
                          <td>{subtype.suggested_unit_type || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>

          {showCategoryForm && (
            <CategoryForm
              onClose={() => setShowCategoryForm(false)}
              onSuccess={() => {
                setShowCategoryForm(false);
                loadCategories();
              }}
            />
          )}

          {showSubtypeForm && (
            <SubtypeForm
              categories={categories}
              onClose={() => setShowSubtypeForm(false)}
              onSuccess={() => {
                setShowSubtypeForm(false);
                loadCategories();
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

const CategoryForm = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/taxonomy/categories', { name });
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Category</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SubtypeForm = ({ categories, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    default_sop_reference: '',
    default_sow_reference: '',
    billing_method_hint: '',
    suggested_unit_type: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/taxonomy/subtypes', {
        ...formData,
        category_id: parseInt(formData.category_id)
      });
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create subtype');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Subtype</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category *</label>
            <select
              value={formData.category_id}
              onChange={(e) =>
                setFormData({ ...formData, category_id: e.target.value })
              }
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Subtype Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Default SOP Reference</label>
            <input
              type="text"
              value={formData.default_sop_reference}
              onChange={(e) =>
                setFormData({ ...formData, default_sop_reference: e.target.value })
              }
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
          <div className="form-group">
            <label>Suggested Unit Type</label>
            <input
              type="text"
              value={formData.suggested_unit_type}
              onChange={(e) =>
                setFormData({ ...formData, suggested_unit_type: e.target.value })
              }
              placeholder="orders, pallets, hours, etc."
            />
          </div>
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminView;
